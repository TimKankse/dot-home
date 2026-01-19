import type { JellyseerrWidgetConfig } from '@/types';

export interface JellyseerrRequest {
  id: number;
  status: number;
  media: {
    tmdbId: number;
    tvdbId?: number;
    status: number;
  };
  type: 'movie' | 'tv';
  requestedBy: {
    displayName: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface MediaDetails {
  title?: string;
  name?: string;
  posterPath?: string;
}

export interface EnrichedRequest extends JellyseerrRequest {
  details?: MediaDetails;
}

export interface JellyseerrFetchParams {
  config?: JellyseerrWidgetConfig;
  integrationId?: string;
}

interface RequestResponse {
  results: JellyseerrRequest[];
}

export async function fetchJellyseerrRequests(params: JellyseerrFetchParams): Promise<EnrichedRequest[]> {
  const { config, integrationId } = params;
  
  if ((!config?.url || !config?.apiKey) && !integrationId) {
    return [];
  }

  const headers: Record<string, string> = {};
  if (integrationId) headers['x-integration-id'] = integrationId;
  if (config?.url) headers['x-jellyseerr-url'] = config.url;
  if (config?.apiKey) headers['x-jellyseerr-apikey'] = config.apiKey;

  const res = await fetch(`/api/jellyseerr?path=/request&take=25&filter=all&sort=added`, { headers });
  
  if (!res.ok) throw new Error('Failed to fetch requests');
  
  const data: RequestResponse = await res.json();
  const rawRequests = data.results || [];

  if (!config?.url || !config?.apiKey) {
    return rawRequests;
  }

  const detailsMap = new Map<string, MediaDetails>();
  const fetchPromises: Promise<void>[] = [];
  
  const movieIds = [...new Set(rawRequests.filter(r => r.type === 'movie').map(r => r.media.tmdbId))];
  const tvIds = [...new Set(rawRequests.filter(r => r.type === 'tv').map(r => r.media.tmdbId))];

  movieIds.forEach(id => {
    fetchPromises.push(
      fetch(`/api/jellyseerr?path=/movie/${id}`, {
        headers: { 'x-jellyseerr-url': config.url!, 'x-jellyseerr-apikey': config.apiKey! }
      })
        .then(r => r.ok ? r.json() : null)
        .then(details => { if (details) detailsMap.set(`movie-${id}`, details); })
        .catch(() => {})
    );
  });

  tvIds.forEach(id => {
    fetchPromises.push(
      fetch(`/api/jellyseerr?path=/tv/${id}`, {
        headers: { 'x-jellyseerr-url': config.url!, 'x-jellyseerr-apikey': config.apiKey! }
      })
        .then(r => r.ok ? r.json() : null)
        .then(details => { if (details) detailsMap.set(`tv-${id}`, details); })
        .catch(() => {})
    );
  });

  await Promise.all(fetchPromises);

  return rawRequests.map(req => {
    const key = `${req.type}-${req.media.tmdbId}`;
    const details = detailsMap.get(key);
    return details ? { ...req, details } : req;
  });
}

export async function manageJellyseerrRequest(
  requestId: number, 
  action: 'approve' | 'decline',
  config: JellyseerrWidgetConfig
): Promise<boolean> {
  if (!config.url || !config.apiKey) return false;
  
  const res = await fetch(`/api/jellyseerr?path=/request/${requestId}/${action}`, {
    method: 'POST',
    headers: {
      'x-jellyseerr-url': config.url,
      'x-jellyseerr-apikey': config.apiKey,
    }
  });
  
  return res.ok;
}

export function getRequestStatusClass(requestStatus: number, mediaStatus: number): string {
  if (mediaStatus === 5 || mediaStatus === 4) return 'available';
  switch (requestStatus) {
    case 1: return 'pending';
    case 2: return 'approved';
    case 3: return 'declined';
    default: return 'pending';
  }
}

export function getRequestStatusLabel(requestStatus: number, mediaStatus: number): string {
  if (mediaStatus === 5) return 'Available';
  if (mediaStatus === 4) return 'Partially Available';
  switch (requestStatus) {
    case 1: return 'Requested';
    case 2: return 'Processing';
    case 3: return 'Declined';
    default: return 'Unknown';
  }
}

export function formatRequestDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
