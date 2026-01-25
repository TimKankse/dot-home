import type { JellyfinWidgetConfig } from '@/types';
import type { JellyfinSession, LibraryStats } from '@/components/widgets/jellyfin/types';

export interface JellyfinFetchParams {
  config?: JellyfinWidgetConfig;
  integrationId?: string;
}

export interface JellyfinData {
  sessions: JellyfinSession[];
  libraries: LibraryStats[];
}

export async function fetchJellyfinData(params: JellyfinFetchParams): Promise<JellyfinData> {
  const { config, integrationId } = params;
  
  if ((!config?.url || !config?.apiKey) && !integrationId) {
    return { sessions: [], libraries: [] };
  }

  const headers: Record<string, string> = {};
  if (integrationId) headers['x-integration-id'] = integrationId;
  if (config?.url) headers['x-jellyfin-url'] = config.url;
  if (config?.apiKey) headers['x-jellyfin-apikey'] = config.apiKey;
  
  const sessionsRes = await fetch('/api/jellyfin/sessions', { headers });
  const sessionsData = await sessionsRes.json();
  const sessions = Array.isArray(sessionsData) 
    ? sessionsData.filter((s: JellyfinSession) => s.NowPlayingItem) 
    : [];

  let libraries: LibraryStats[] = [];
  if (config?.userId && config?.url && config?.apiKey) {
    const libRes = await fetch('/api/jellyfin/libraries', {
      headers: {
        'x-jellyfin-url': config.url,
        'x-jellyfin-apikey': config.apiKey,
        'x-jellyfin-userid': config.userId
      }
    });
    if (libRes.ok) {
      libraries = await libRes.json();
    }
  }

  return { sessions, libraries };
}

export async function fetchJellyfinLibraryCounts(params: JellyfinFetchParams): Promise<LibraryStats[]> {
  const { config, integrationId } = params;

  if (config?.userId && config?.url && config?.apiKey) {
    const libRes = await fetch('/api/jellyfin/libraries?mode=counts', {
      headers: {
        'x-jellyfin-url': config.url,
        'x-jellyfin-apikey': config.apiKey,
        'x-jellyfin-userid': config.userId
      }
    });
    if (libRes.ok) {
      return await libRes.json();
    }
  }
  return [];
}

export function createJellyfinWebSocket(
  config: JellyfinWidgetConfig, 
  onMessage: (sessions: JellyfinSession[]) => void
): WebSocket | null {
  if (!config.url || !config.apiKey) return null;
  
  const wsUrl = new URL(config.url);
  wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  wsUrl.pathname = wsUrl.pathname.replace(/\/$/, '') + '/socket';
  wsUrl.searchParams.set('api_key', config.apiKey);
  wsUrl.searchParams.set('deviceId', 'dot-home-dashboard');

  const ws = new WebSocket(wsUrl.toString());

  ws.onopen = () => {
    ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '1000,1000' }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.MessageType === 'Sessions') {
        const data = msg.Data;
        const activeSessions = Array.isArray(data) 
          ? data.filter((s: JellyfinSession) => s.NowPlayingItem) 
          : [];
        onMessage(activeSessions);
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  };

  return ws;
}
