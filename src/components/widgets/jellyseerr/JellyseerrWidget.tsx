'use client';

import { useEffect, useState } from 'react';
import styles from './JellyseerrWidget.module.css';
import { Film, Tv, Check, X } from 'lucide-react'; // Added Tv icon for better context

interface Request {
  id: number;
  status: number; // 1: Pending, 2: Approved, 3: Declined
  media: {
    tmdbId: number;
    tvdbId?: number;
    status: number; // 3: Processing, 4: Partially Available, 5: Available
    // Note: mediaType is usually NOT inside the media object in the /request endpoint
  };
  type: 'movie' | 'tv'; // This is where the type actually lives
  requestedBy: {
    displayName: string;
    avatar?: string;
  };
  createdAt: string;
}

interface MediaDetails {
  title?: string; // Movies
  name?: string;  // TV Shows
  posterPath?: string;
}

interface EnrichedRequest extends Request {
  details?: MediaDetails;
}

interface RequestResponse {
  results: Request[];
}

interface JellyseerrWidgetProps {
  config?: {
    url?: string;
    apiKey?: string;
  };
}

export default function JellyseerrWidget({ config }: JellyseerrWidgetProps) {
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      if (!config?.url || !config?.apiKey) {
        setLoading(false);
        // Don't show error if just not configured yet, or maybe show "Configure Widget"
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // 1. Fetch the raw request list
        // We explicitly pass filter/sort here. 
        // Ensure your backend Proxy does NOT force these params again.
        const res = await fetch(`/api/jellyseerr?path=/request&take=25&filter=all&sort=added`, {
          headers: {
            'x-jellyseerr-url': config.url,
            'x-jellyseerr-apikey': config.apiKey,
          }
        });
        
        if (!res.ok) throw new Error('Failed to fetch requests');
        
        const data: RequestResponse = await res.json();
        const rawRequests = data.results || [];
        console.log(rawRequests);

        // 2. Fetch details for each item to get the real Title and Poster
        const enrichedRequests = await Promise.all(
          rawRequests.map(async (req) => {
            try {
              // FIX: Access 'type' from the root object, not req.media
              const mediaType = req.type; 
              const tmdbId = req.media.tmdbId;
              
              if (!mediaType || !tmdbId) return req;

              // Fetch details (e.g., /movie/12345)
              const detailsRes = await fetch(`/api/jellyseerr?path=/${mediaType}/${tmdbId}`, {
                headers: {
                  'x-jellyseerr-url': config.url!,
                  'x-jellyseerr-apikey': config.apiKey!,
                }
              });
              
              if (detailsRes.ok) {
                const details = await detailsRes.json();
                return { ...req, details };
              }
              return req;
            } catch (e) {
              console.error('Failed to fetch details for request', req.id, e);
              return req;
            }
          })
        );

        setRequests(enrichedRequests);
      } catch (err) {
        console.error(err);
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
    fetchRequests();
  }, []);

  const handleManageRequest = async (requestId: number, action: 'approve' | 'decline') => {
    if (!config?.url || !config?.apiKey) return;
    
    // Optimistic update
    setRequests(current => current.map(req => {
        if (req.id === requestId) {
            return {
                ...req,
                status: action === 'approve' ? 2 : 3
            };
        }
        return req;
    }));

    try {
        const res = await fetch(`/api/jellyseerr?path=/request/${requestId}/${action}`, {
            method: 'POST',
            headers: {
                'x-jellyseerr-url': config.url,
                'x-jellyseerr-apikey': config.apiKey,
            }
        });
        
        if (!res.ok) {
           // Revert if failed (could reload list or just warn)
           console.error('Failed to update request');
        }
    } catch (e) {
        console.error('Error updating request', e);
    }
  };

  const getStatusClass = (requestStatus: number, mediaStatus: number) => {
    // 1. Check if Media is Available (Status 5) or Partially Available (Status 4)
    if (mediaStatus === 5 || mediaStatus === 4) return styles.available;
    
    // 2. Check Request Status
    switch (requestStatus) {
      case 1: return styles.pending;  // Pending Approval
      case 2: return styles.approved; // Approved (Processing/Downloading)
      case 3: return styles.declined; // Declined
      default: return styles.pending;
    }
  };

  const getStatusLabel = (requestStatus: number, mediaStatus: number) => {
    if (mediaStatus === 5) return 'Available';
    if (mediaStatus === 4) return 'Partially Available';
    switch (requestStatus) {
      case 1: return 'Requested';
      case 2: return 'Processing';
      case 3: return 'Declined';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.widgetContainer}>
      <div className={`${styles.requestList} no-scrollbar`}>
        {loading ? (
          <div className={styles.message}>Loading requests...</div>
        ) : error ? (
          <div className={`${styles.message} ${styles.error}`}>{error}</div>
        ) : requests.length === 0 ? (
          <div className={styles.message}>No requests found</div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className={styles.requestItem}>
              
              {/* Poster */}
              <div className={styles.posterContainer}>
                {req.details?.posterPath ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w200${req.details.posterPath}`} 
                    alt={req.details?.title || req.details?.name || 'Poster'} 
                    className={styles.posterImage}
                  />
                ) : (
                  <div className={styles.posterPlaceholder}>
                    {req.type === 'movie' ? <Film size={16} /> : <Tv size={16} />}
                  </div>
                )}
              </div>
              
              {/* Content Info */}
              <div className={styles.requestContent}>
                <div className={styles.requestHeader}>
                  <h4 className={styles.mediaTitle} title={req.details?.title || req.details?.name}>
                    {req.details?.title || req.details?.name || 'Loading...'}
                  </h4>
                  <span className={styles.requestDate}>
                    {formatDate(req.createdAt)}
                  </span>
                </div>
                
                <div className={styles.requestFooter}>
                  {/* Status or Actions */}
                  {req.status === 1 ? (
                    <div className={styles.statusActions}>
                        <button 
                          className={`${styles.actionButton} ${styles.approveButton}`}
                          onClick={() => handleManageRequest(req.id, 'approve')}
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          className={`${styles.actionButton} ${styles.rejectButton}`}
                          onClick={() => handleManageRequest(req.id, 'decline')}
                          title="Decline"
                        >
                          <X size={14} />
                        </button>
                    </div>
                  ) : (
                    <span className={`${styles.statusFlag} ${getStatusClass(req.status, req.media?.status)}`}>
                      {getStatusLabel(req.status, req.media?.status)}
                    </span>
                  )}

                  <div className={styles.requesterInfo}>
                    <div className={styles.avatarContainer}>
                      {req.requestedBy?.avatar ? (
                          <img 
                            src={req.requestedBy.avatar.startsWith('http') ? req.requestedBy.avatar : `https://gravatar.com/avatar/${req.requestedBy.avatar}`} 
                            alt={req.requestedBy.displayName} 
                            className={styles.avatarImage} 
                          />
                      ) : (
                          <span className={styles.avatarFallback}>
                            {req.requestedBy?.displayName?.charAt(0) || 'U'}
                          </span>
                      )}
                    </div>
                    <span className={styles.requesterName}>
                      {req.requestedBy?.displayName || 'User'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div> 
    </div>
  );
}