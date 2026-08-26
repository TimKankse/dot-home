import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import {
  buildIntegrationUrl,
  resolveIntegrationBaseUrl,
  resolveRequestIntegration,
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
}

const authCache = new Map<string, AuthCacheEntry>();
const AUTH_CACHE_TTL = 30 * 60 * 1000;

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

  const cached = authCache.get(integrationId);
  if (cached && Date.now() - cached.timestamp < AUTH_CACHE_TTL) return cached.cookie;

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

  authCache.set(integrationId, { cookie: sid, timestamp: Date.now() });
  return sid;
}

async function resolveConnection(request: Request, permission: 'view' | 'edit') {
  const integration = await resolveRequestIntegration(request, 'qbittorrent', permission);
  const baseUrl = await resolveIntegrationBaseUrl(integration);
  const username = readOptionalCredential(integration.config.username);
  const password = readOptionalCredential(integration.config.password);
  const cookie = await getAuthCookie(integration.id, baseUrl, username, password);
  return { integration, baseUrl, cookie };
}

export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get('mode') !== 'queue') {
      throw new ApiSecurityError('Invalid mode', 400, 'invalid_mode');
    }
    const { integration, baseUrl, cookie } = await resolveConnection(request, 'view');
    const headers = cookie ? { Cookie: cookie } : undefined;
    const [syncResponse, transferResponse] = await Promise.all([
      fetchOutbound(
        buildIntegrationUrl(baseUrl, '/api/v2/sync/maindata'),
        { headers, cache: 'no-store' },
        { policy: 'trusted-integration' },
      ),
      fetchOutbound(
        buildIntegrationUrl(baseUrl, '/api/v2/transfer/info'),
        { headers, cache: 'no-store' },
        { policy: 'trusted-integration' },
      ),
    ]);

    if (!syncResponse.ok) {
      if ([401, 403].includes(syncResponse.status)) authCache.delete(integration.id);
      throw new ApiSecurityError('qBittorrent request failed', 502, 'upstream_request_failed');
    }

    const syncData = await syncResponse.json() as {
      torrents?: Record<string, Torrent>;
      server_state?: { connection_status?: string };
    };
    const transferData = transferResponse.ok
      ? await transferResponse.json() as { dl_info_speed?: number }
      : {};
    const torrents = syncData.torrents || {};
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
      ['downloading', 'stalledDL', 'metaDL', 'queuedDL', 'forcedDL', 'pausedDL'].includes(slot.status),
    );

    const speed = transferData.dl_info_speed || 0;
    let timeleft = '00:00:00';
    if (speed > 0 && totalLeft > 0) {
      const seconds = totalLeft / speed;
      timeleft = seconds < 86400
        ? new Date(seconds * 1000).toISOString().substring(11, 19)
        : '> 24h';
    }

    return NextResponse.json({
      queue: {
        status: syncData.server_state?.connection_status || 'unknown',
        speed: formatSpeed(speed),
        timeleft,
        slots,
        paused: !anyDownloading && slots.some((slot) => slot.status === 'pausedDL'),
      },
    });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch qBittorrent queue');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: unknown };
    if (body.action !== 'pause' && body.action !== 'resume') {
      throw new ApiSecurityError('Invalid queue action', 400, 'invalid_queue_action');
    }
    const { integration, baseUrl, cookie } = await resolveConnection(request, 'edit');
    const form = new URLSearchParams({ hashes: 'all' });
    const response = await fetchOutbound(
      buildIntegrationUrl(baseUrl, `/api/v2/torrents/${body.action}`),
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
      if ([401, 403].includes(response.status)) authCache.delete(integration.id);
      throw new ApiSecurityError('qBittorrent action failed', 502, 'upstream_request_failed');
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to update qBittorrent queue');
  }
}
