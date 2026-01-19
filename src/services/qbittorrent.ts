import type { QBittorrentWidgetConfig } from '@/types';

export interface QueueSlot {
  filename: string;
  percentage: string;
  mbleft: string;
  mb: string;
  status: string;
  timeleft: string;
  index: number;
}

export interface QueueData {
  status: string;
  speed: string;
  timeleft: string;
  slots: QueueSlot[];
  paused: boolean;
}

interface QBittorrentResponse {
  queue: QueueData;
}

export interface QBittorrentFetchParams {
  config?: QBittorrentWidgetConfig;
  integrationId?: string;
}

function buildHeaders(params: QBittorrentFetchParams): Record<string, string> {
  const { config, integrationId } = params;
  const headers: Record<string, string> = {
    'x-qbittorrent-url': config?.url || '',
  };
  
  if (integrationId) {
    headers['x-integration-id'] = integrationId;
  } else {
    headers['x-qbittorrent-username'] = config?.username || '';
    headers['x-qbittorrent-password'] = config?.password || '';
  }
  
  return headers;
}

export async function fetchQBittorrentQueue(params: QBittorrentFetchParams): Promise<QueueData | null> {
  const { config, integrationId } = params;
  
  if (!config?.url && !integrationId) {
    return null;
  }

  const res = await fetch('/api/qbittorrent?mode=queue', { headers: buildHeaders(params) });
  
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  
  const json: QBittorrentResponse = await res.json();
  return json.queue;
}

export async function toggleQBittorrentPause(paused: boolean, params: QBittorrentFetchParams): Promise<void> {
  const mode = paused ? 'resume' : 'pause';
  await fetch(`/api/qbittorrent?mode=${mode}`, {
    method: 'POST',
    headers: buildHeaders(params),
  });
}

export function formatSize(mbString: string): string {
  const mb = parseFloat(mbString);
  if (isNaN(mb)) return mbString;
  
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}
