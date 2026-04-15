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

  if (rawRequests.length === 0) {
    return [];
  }

  // Extract unique movie and TV IDs
  const movieIds = [...new Set(rawRequests.filter(r => r.type === 'movie').map(r => r.media.tmdbId))];
  const tvIds = [...new Set(rawRequests.filter(r => r.type === 'tv').map(r => r.media.tmdbId))];

  // Use batch endpoint to fetch all details at once
  const detailsMap = new Map<string, MediaDetails>();
  
  if (movieIds.length > 0 || tvIds.length > 0) {
    try {
      const batchRes = await fetch('/api/jellyseerr/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({ movies: movieIds, tvShows: tvIds })
      });

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        
        // Populate details map from batch response
        for (const [id, details] of Object.entries(batchData.movies || {})) {
          detailsMap.set(`movie-${id}`, details as MediaDetails);
        }
        for (const [id, details] of Object.entries(batchData.tvShows || {})) {
          detailsMap.set(`tv-${id}`, details as MediaDetails);
        }
      }
    } catch (error) {
      console.error('Batch fetch failed, falling back to no details:', error);
    }
  }

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
