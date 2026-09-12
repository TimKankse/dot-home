import type { TwitchWidgetConfig } from '@/types';
import { apiFetch } from '@/lib/api-client';

export interface TwitchChannelData {
  user_login: string;
  user_name: string;
  profile_image_url: string;
  is_live: boolean;
  stream?: {
    game_name: string;
    viewer_count: number;
    title: string;
  };
}

export interface TwitchFetchParams {
  channels: string[];
  config?: TwitchWidgetConfig;
  integrationId?: string;
}

interface TwitchApiResponse {
  data: TwitchChannelData[];
}

export async function fetchTwitchStreams(params: TwitchFetchParams): Promise<TwitchChannelData[]> {
  const { channels, integrationId } = params;
  
  if (channels.length === 0) {
    return [];
  }

  if (!integrationId) {
    return [];
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  headers['x-integration-id'] = integrationId;

  const response = await apiFetch('/api/twitch', {
    method: 'POST',
    headers,
    body: JSON.stringify({ channels }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Twitch data');
  }

  const data: TwitchApiResponse = await response.json();
  
  return (data.data || []).sort((a, b) => {
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    return a.user_name.localeCompare(b.user_name);
  });
}

export function parseChannelList(channels: string[] | string | undefined): string[] {
  if (!channels) return [];
  
  if (Array.isArray(channels)) {
    return channels;
  }
  
  if (typeof channels === 'string' && channels.length > 0) {
    return channels
      .split(',')
      .map(c => c.trim().toLowerCase())
      .filter(c => c.length > 0);
  }
  
  return [];
}

export function formatViewerCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
