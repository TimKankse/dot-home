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
  const { integrationId } = params;
  if (!integrationId) {
    return { sessions: [], libraries: [] };
  }

  const headers = { 'x-integration-id': integrationId };
  
  const sessionsRes = await fetch('/api/jellyfin/sessions', { headers });
  const sessionsData = await sessionsRes.json();
  const sessions = Array.isArray(sessionsData) 
    ? sessionsData.filter((s: JellyfinSession) => s.NowPlayingItem) 
    : [];

  let libraries: LibraryStats[] = [];
  if (integrationId) {
    const libRes = await fetch('/api/jellyfin/libraries', {
      headers,
    });
    if (libRes.ok) {
      libraries = await libRes.json();
    }
  }

  return { sessions, libraries };
}

export async function fetchJellyfinLibraryCounts(params: JellyfinFetchParams): Promise<LibraryStats[]> {
  const { integrationId } = params;

  if (integrationId) {
    const headers = { 'x-integration-id': integrationId };
    const libRes = await fetch('/api/jellyfin/libraries?mode=counts', {
      headers,
    });
    if (libRes.ok) {
      return await libRes.json();
    }
  }
  return [];
}
