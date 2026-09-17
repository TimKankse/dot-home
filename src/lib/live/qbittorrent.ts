import { createHash } from 'node:crypto';
import type { AuthorizedIntegration } from '@/lib/integration-access';

import { ApiSecurityError } from '@/lib/api-security';
import {
  buildIntegrationUrl,
  resolveIntegrationBaseUrl,
} from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';

interface Torrent {
  name: string;
  state: string;
  size: number;
  completed: number;
  progress: number;
  eta: number;
  dlspeed: number;
}

interface Slot {
  filename: string;
  percentage: string;
  mbleft: string;
  mb: string;
  status: string;
  timeleft: string;
  index: number;
  speed: number;
}

interface AuthCacheEntry {
  cookie: string;
  timestamp: number;
  origin: string;
}

const authCache = new Map<string, AuthCacheEntry>();
const AUTH_CACHE_TTL = 30 * 60 * 1000;
const AUTH_CACHE_MAX_ENTRIES = 128;

const readOptionalCredential = (value: unknown): string | undefined =>
  typeof value === 'string' && value && !value.startsWith('enc:') ? value : undefined;

const formatSpeed = (bytesPerSecond: number): string => {
  if (!bytesPerSecond) return 'Idle';
  if (bytesPerSecond >= 1024 ** 3) return `${(bytesPerSecond / 1024 ** 3).toFixed(2)} GB/s`;
  if (bytesPerSecond >= 1024 ** 2) return `${(bytesPerSecond / 1024 ** 2).toFixed(2)} MB/s`;
  if (bytesPerSecond >= 1024) return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
  return `${bytesPerSecond.toFixed(0)} B/s`;
};

async function getAuthCookie(
  integrationId: string,
  baseUrl: URL,
  username?: string,
  password?: string,
): Promise<string> {
  if (!username && !password) return '';
  if (!username || !password) {
    throw new ApiSecurityError(
      'qBittorrent integration credentials are incomplete',
      500,
      'invalid_integration_config',
    );
  }

  const now = Date.now();
  for (const [key, entry] of authCache) {
    if (now - entry.timestamp >= AUTH_CACHE_TTL) authCache.delete(key);
  }

  const cached = authCache.get(integrationId);
  if (cached && cached.origin === baseUrl.origin) return cached.cookie;
  if (cached) authCache.delete(integrationId);

  const body = new URLSearchParams({ username, password });
  const response = await fetchOutbound(
    buildIntegrationUrl(baseUrl, '/api/v2/auth/login'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    },
    { policy: 'trusted-integration' },
  );
  const responseText = await response.text();
  const sid = response.headers.get('set-cookie')?.match(/(?:^|;\s*)(SID=[^;]+)/)?.[1];
  if (!response.ok || responseText.trim() !== 'Ok.' || !sid) {
    throw new ApiSecurityError('qBittorrent authentication failed', 502, 'upstream_auth_failed');
  }

  if (authCache.size >= AUTH_CACHE_MAX_ENTRIES) {
    const oldestKey = authCache.keys().next().value;
    if (oldestKey) authCache.delete(oldestKey);
  }
  authCache.set(integrationId, {
    cookie: sid,
    timestamp: now,
    origin: baseUrl.origin,
  });
  return sid;
}

async function resolveConnection(integration: AuthorizedIntegration) {
  const baseUrl = await resolveIntegrationBaseUrl(integration);
  const username = readOptionalCredential(integration.config.username);
  const password = readOptionalCredential(integration.config.password);
  const cookie = await getAuthCookie(createHash('sha256').update(JSON.stringify([integration.id, integration.config])).digest('hex'), baseUrl, username, password);
  return { integration, baseUrl, cookie };
}

export function createQbittorrentReader(integration: AuthorizedIntegration) {
  let rid = 0;
  let torrents: Record<string, Torrent> = Object.create(null);
  let serverState: { connection_status?: string; dl_info_speed?: number } = {};
  return async (signal?: AbortSignal) => {
    const { baseUrl, cookie } = await resolveConnection(integration);
    const target = buildIntegrationUrl(baseUrl, '/api/v2/sync/maindata');
    target.searchParams.set('rid', String(rid));
    const syncResponse = await fetchOutbound(target, {
      headers: cookie ? { Cookie: cookie } : undefined, signal,
    }, { policy: 'trusted-integration', maxResponseBytes: 8 * 1024 * 1024 });
    if (!syncResponse.ok) {
      if ([401, 403].includes(syncResponse.status)) authCache.delete(createHash('sha256').update(JSON.stringify([integration.id, integration.config])).digest('hex'));
      throw new ApiSecurityError('qBittorrent request failed', 502, 'upstream_request_failed');
    }

    const syncData = await syncResponse.json() as {
      rid: number;
      full_update?: boolean;
      torrents?: Record<string, Torrent>;
      torrents_removed?: string[];
      server_state?: typeof serverState;
    };
    if (!Number.isSafeInteger(syncData.rid)) throw new Error('Invalid sync response');
    if (syncData.full_update || rid === 0) {
      torrents = Object.create(null);
      serverState = {};
    }
    for (const [hash, change] of Object.entries(syncData.torrents || {})) {
      torrents[hash] = { ...torrents[hash], ...change };
    }
    for (const hash of syncData.torrents_removed || []) delete torrents[hash];
    if (Object.keys(torrents).length > 20_000) {
      torrents = Object.create(null);
      rid = 0;
      throw new Error('Torrent list exceeds live update capacity');
    }
    serverState = { ...serverState, ...syncData.server_state };
    rid = syncData.rid;
    let totalLeft = 0;
    let anyDownloading = false;
    const slots = Object.values(torrents).map((torrent, index) => {
      const downloading = ['downloading', 'stalledDL', 'metaDL', 'forcedDL'].includes(torrent.state);
      if (downloading) {
        totalLeft += torrent.size - torrent.completed;
        if (torrent.state === 'downloading' || torrent.state === 'forcedDL') anyDownloading = true;
      }
      return {
        filename: torrent.name,
        percentage: (torrent.progress * 100).toFixed(1),
        mbleft: ((torrent.size - torrent.completed) / 1024 / 1024).toFixed(2),
        mb: (torrent.size / 1024 / 1024).toFixed(2),
        status: torrent.state,
        timeleft: torrent.eta === 8640000
          ? '∞'
          : new Date(torrent.eta * 1000).toISOString().substring(11, 19),
        index,
        speed: torrent.dlspeed,
      };
    }).filter((slot: Slot) =>
      ['downloading', 'stalledDL', 'metaDL', 'queuedDL', 'forcedDL', 'pausedDL', 'stoppedDL'].includes(slot.status),
    );

    const speed = serverState.dl_info_speed || 0;
    let timeleft = '00:00:00';
    if (speed > 0 && totalLeft > 0) {
      const seconds = totalLeft / speed;
      timeleft = seconds < 86400
        ? new Date(seconds * 1000).toISOString().substring(11, 19)
        : '> 24h';
    }

    return {
      queue: {
        status: serverState.connection_status || 'unknown',
        speed: formatSpeed(speed),
        timeleft,
        slots,
        paused: !anyDownloading && slots.some((slot) => ['pausedDL', 'stoppedDL'].includes(slot.status)),
      },
     };
  };
}

export async function updateQbittorrent(integration: AuthorizedIntegration, action: 'pause' | 'resume') {
    const { baseUrl, cookie } = await resolveConnection(integration);
    const form = new URLSearchParams({ hashes: 'all' });
    const response = await fetchOutbound(
      buildIntegrationUrl(baseUrl, `/api/v2/torrents/${action}`),
      {
        method: 'POST',
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        cache: 'no-store',
      },
      { policy: 'trusted-integration' },
    );
    if (!response.ok) {
      if ([401, 403].includes(response.status)) authCache.delete(createHash('sha256').update(JSON.stringify([integration.id, integration.config])).digest('hex'));
      throw new ApiSecurityError('qBittorrent action failed', 502, 'upstream_request_failed');
    }
}
