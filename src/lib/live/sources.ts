import type { AuthorizedIntegration } from '@/lib/integration-access';
import { buildIntegrationUrl, requireIntegrationConfigString, resolveIntegrationBaseUrl } from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';
import { createQbittorrentReader } from './qbittorrent';
import { readJellyfinLibraries } from './jellyfin-libraries';
import { watchJellyfinSessions } from './jellyfin-socket';
import type { LiveChannel, LiveSource } from './types';
import type { JellyfinSession } from '@/components/widgets/jellyfin/types';
import { mergeSessionsPreservingOrder } from '@/components/widgets/jellyfin/utils';
import type { QueueData } from '@/services/sabnzbd';
import { sanitizeSabnzbdQueue } from './sabnzbd';

const sessionsForWidget = (data: unknown): JellyfinSession[] => {
  if (!Array.isArray(data)) throw new Error('Invalid sessions response');
  return data.filter((session) => session && typeof session.Id === 'string' && session.NowPlayingItem)
    .map(({ Id, UserName, DeviceName, Client, NowPlayingItem, PlayState, TranscodingInfo }) => ({
      Id, UserName, DeviceName, Client, NowPlayingItem, PlayState, TranscodingInfo,
    }));
};

export function createLiveSource(integration: AuthorizedIntegration, channel: LiveChannel): LiveSource {
  if (integration.type === 'qbittorrent' && channel === 'queue') {
    const read = createQbittorrentReader(integration);
    return { poll: async (signal) => {
      const { queue } = await read(signal);
      return { data: queue, intervalMs: queue.slots.length && !queue.paused ? 2000 : 15_000 };
    } };
  }
  if (integration.type === 'sabnzbd' && channel === 'queue') {
    return { poll: async (signal) => {
      const target = buildIntegrationUrl(await resolveIntegrationBaseUrl(integration), '/api');
      target.searchParams.set('output', 'json');
      target.searchParams.set('mode', 'queue');
      target.searchParams.set('apikey', requireIntegrationConfigString(integration, 'apiKey'));
      const response = await fetchOutbound(target, { signal }, { policy: 'trusted-integration', maxResponseBytes: 2 * 1024 * 1024 });
      if (!response.ok) throw new Error('Queue unavailable');
      const { queue } = await response.json() as { queue: QueueData };
      const data = sanitizeSabnzbdQueue(queue);
      return { data, intervalMs: data.slots.length && !data.paused ? 2000 : 15_000 };
    } };
  }
  if (integration.type !== 'jellyfin' || !['sessions', 'libraries'].includes(channel)) {
    throw new Error('Unsupported live integration');
  }
  const connection = async () => ({
    url: await resolveIntegrationBaseUrl(integration),
    apiKey: requireIntegrationConfigString(integration, 'apiKey'),
    userId: typeof integration.config.userId === 'string' ? integration.config.userId : undefined,
    source: 'integration' as const,
  });
  if (channel === 'libraries') {
    return { poll: async (signal) => ({
      data: await readJellyfinLibraries(await connection(), signal), intervalMs: 5 * 60_000,
    }) };
  }
  let watcher: ReturnType<typeof watchJellyfinSessions> | undefined;
  let latest: JellyfinSession[] | undefined;
  let previous: JellyfinSession[] = [];
  const prepareSessions = (data: unknown) => {
    previous = mergeSessionsPreservingOrder(previous, sessionsForWidget(data));
    return previous;
  };
  return {
    connect: (publish, signal) => {
      void connection().then((resolved) => {
        if (signal.aborted) return;
        watcher = watchJellyfinSessions(resolved, (data) => {
          latest = prepareSessions(data);
          publish(latest);
        }, signal);
      }).catch(() => { /* HTTP polling remains available. */ });
    },
    poll: async (signal) => {
      if (watcher?.isReceiving() && latest) return { data: latest, intervalMs: 10_000 };
      const resolved = await connection();
      const response = await fetchOutbound(buildIntegrationUrl(resolved.url, '/Sessions'), {
        signal, headers: { 'X-Emby-Token': resolved.apiKey },
      }, { policy: 'trusted-integration', maxResponseBytes: 2 * 1024 * 1024 });
      if (!response.ok) throw new Error('Sessions unavailable');
      return { data: prepareSessions(await response.json()), intervalMs: 10_000 };
    },
  };
}
