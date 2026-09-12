import type { SabnzbdWidgetConfig } from '@/types';
import { apiFetch } from '@/lib/api-client';

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

interface SabnzbdResponse {
  queue: QueueData;
}

export interface SabnzbdFetchParams {
  config?: SabnzbdWidgetConfig;
  integrationId?: string;
}

function buildHeaders(params: SabnzbdFetchParams): Record<string, string> {
  return params.integrationId
    ? { 'x-integration-id': params.integrationId }
    : {};
}

export async function fetchSabnzbdQueue(params: SabnzbdFetchParams): Promise<QueueData | null> {
  const { integrationId } = params;
  if (!integrationId) {
    return null;
  }

  const res = await fetch('/api/sabnzbd?mode=queue', { headers: buildHeaders(params) });
  
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  
  const json: SabnzbdResponse = await res.json();
  return json.queue;
}

export async function toggleSabnzbdPause(paused: boolean, params: SabnzbdFetchParams): Promise<void> {
  if (!params.integrationId) return;
  const action = paused ? 'resume' : 'pause';
  const response = await apiFetch('/api/sabnzbd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildHeaders(params) },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw new Error('Failed to update SABnzbd queue');
}

export function formatSize(mbString: string): string {
  const mb = parseFloat(mbString);
  if (isNaN(mb)) return mbString;
  
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatSpeed(speedString: string): string {
  if (!speedString) return 'Idle';
  
  const match = speedString.match(/([\d.]+)\s*([BKMGT])?/i);
  if (!match) return speedString;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  
  if (isNaN(value) || value === 0) return 'Idle';
  
  let bytes = value;
  switch (unit) {
    case 'K': bytes = value * 1024; break;
    case 'M': bytes = value * 1024 * 1024; break;
    case 'G': bytes = value * 1024 * 1024 * 1024; break;
    case 'T': bytes = value * 1024 * 1024 * 1024 * 1024; break;
  }
  
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB/s`;
  }
  return `${bytes.toFixed(0)} B/s`;
}
