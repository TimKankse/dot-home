'use client';

import { useEffect, useState } from 'react';
import styles from './JellyseerrWidget.module.css';
import { Film, Tv, Check, X } from 'lucide-react';
import { List } from '@/components/primitives/list/List';
import { 
  fetchJellyseerrRequests, 
  manageJellyseerrRequest,
  getRequestStatusClass,
  getRequestStatusLabel,
  formatRequestDate,
  EnrichedRequest
} from '@/services/jellyseerr';
import type { JellyseerrWidgetConfig } from '@/types';

interface JellyseerrWidgetProps {
  config?: JellyseerrWidgetConfig;
}

export default function JellyseerrWidget({ config, integrationId }: JellyseerrWidgetProps & { integrationId?: string }) {
  const [requests, setRequests] = useState<EnrichedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function loadRequests() {
      if ((!config?.url || !config?.apiKey) && !integrationId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchJellyseerrRequests({ config, integrationId });
        if (isMounted) {
          setRequests(data);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError('Failed to load requests');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRequests();
    
    return () => {
      isMounted = false;
    };
  }, [config, config?.url, config?.apiKey, integrationId]);

  const handleManageRequest = async (requestId: number, action: 'approve' | 'decline') => {
    if (!config?.url || !config?.apiKey) return;
    
    setRequests(current => current.map(req => 
      req.id === requestId ? { ...req, status: action === 'approve' ? 2 : 3 } : req
    ));

    const success = await manageJellyseerrRequest(requestId, action, config);
    if (!success) {
      console.error('Failed to update request');
    }
  };

  return (
    <div className={styles.widgetContainer}>
      <List className={styles.requestList}>
        {loading ? (
          <div className={styles.message}>Loading requests...</div>
        ) : error ? (
          <div className={`${styles.message} ${styles.error}`}>{error}</div>
        ) : requests.length === 0 ? (
          <div className={styles.message}>No requests found</div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className={styles.requestItem}>
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
              
              <div className={styles.requestContent}>
                <div className={styles.requestHeader}>
                  <h4 className={styles.mediaTitle} title={req.details?.title || req.details?.name}>
                    {req.details?.title || req.details?.name || 'Loading...'}
                  </h4>
                  <span className={styles.requestDate}>
                    {formatRequestDate(req.createdAt)}
                  </span>
                </div>
                
                <div className={styles.requestFooter}>
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
                    <span className={`${styles.statusFlag} ${styles[getRequestStatusClass(req.status, req.media?.status)]}`}>
                      {getRequestStatusLabel(req.status, req.media?.status)}
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
      </List>
    </div>
  );
}
