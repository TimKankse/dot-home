import type { JellyfinSession } from './types';

export const formatTime = (ticks: number) => {
    const seconds = ticks / 10000000;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};


export const formatBitrate = (bps: number): string => {
  if (!bps || bps === 0) return 'N/A';
  const kbps = bps / 1000;
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${kbps.toFixed(0)} Kbps`;
};

export const getResolutionLabel = (width?: number, height?: number): string => {
  if (!width || !height) return 'N/A';
  
  // Common resolution labels
  if (height >= 2160 || width >= 3840) return '4K';
  if (height >= 1440 || width >= 2560) return '1440p';
  if (height >= 1080 || width >= 1920) return '1080p';
  if (height >= 720 || width >= 1280) return '720p';
  if (height >= 576 || width >= 720) return '576p';
  if (height >= 480 || width >= 640) return '480p';
  
  return `${width}x${height}`;
};

const formatEpisodeNumberPart = (prefix: 'S' | 'E', value?: number): string | null => {
  if (!Number.isInteger(value) || value === undefined || value < 0) {
    return null;
  }

  return `${prefix}${value.toString().padStart(2, '0')}`;
};

export const formatEpisodeTitle = (item?: JellyfinSession['NowPlayingItem']): string => {
  const title = item?.EpisodeTitle || item?.Name || '';

  if (item?.Type !== 'Episode' || !title) {
    return title;
  }

  const seasonLabel = formatEpisodeNumberPart('S', item.ParentIndexNumber);
  const episodeLabel = formatEpisodeNumberPart('E', item.IndexNumber);
  const numberingLabel = [seasonLabel, episodeLabel].filter(Boolean).join(':');

  if (!numberingLabel) {
    return title;
  }

  return `${numberingLabel} | ${title}`;
};

export const mergeSessionsPreservingOrder = (
  previousSessions: JellyfinSession[],
  incomingSessions: JellyfinSession[],
): JellyfinSession[] => {
  if (incomingSessions.length === 0) {
    return [];
  }

  if (previousSessions.length === 0) {
    return incomingSessions;
  }

  const incomingById = new Map(incomingSessions.map((session) => [session.Id, session]));
  const previousIds = new Set(previousSessions.map((session) => session.Id));

  const mergedSessions = previousSessions
    .map((session) => incomingById.get(session.Id))
    .filter((session): session is JellyfinSession => Boolean(session));

  for (const session of incomingSessions) {
    if (!previousIds.has(session.Id)) {
      mergedSessions.push(session);
    }
  }

  return mergedSessions;
};
