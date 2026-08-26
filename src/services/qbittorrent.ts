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
  return params.integrationId
    ? { 'x-integration-id': params.integrationId }
    : {};
}

export async function fetchQBittorrentQueue(params: QBittorrentFetchParams): Promise<QueueData | null> {
  const { integrationId } = params;
  if (!integrationId) {
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
  if (!params.integrationId) return;
  const action = paused ? 'resume' : 'pause';
  const response = await fetch('/api/qbittorrent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildHeaders(params) },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw new Error('Failed to update qBittorrent queue');
}

export function formatSize(mbString: string): string {
  const mb = parseFloat(mbString);
  if (isNaN(mb)) return mbString;
  
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}
