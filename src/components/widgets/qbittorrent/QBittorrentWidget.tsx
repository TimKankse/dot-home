'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './QBittorrentWidget.module.css';
import { Download, Clock, CheckCircle, Pause, Play } from 'lucide-react';
import { List } from '@/components/primitives/list/List';
import { 
  fetchQBittorrentQueue, 
  toggleQBittorrentPause, 
  formatSize,
  QueueData 
} from '@/services/qbittorrent';

interface QBittorrentWidgetProps {
  config?: { url?: string; username?: string; password?: string };
  integrationId?: string;
}

export function QBittorrentWidget({ config, integrationId }: QBittorrentWidgetProps) {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!config?.url && !integrationId) {
      setLoading(false);
      return;
    }

    try {
      const queue = await fetchQBittorrentQueue({ config, integrationId });
      setData(queue);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to qBittorrent');
    } finally {
      setLoading(false);
    }
  }, [config, integrationId]);

  const handleTogglePause = async () => {
    if (!data) return;
    try {
      await toggleQBittorrentPause(data.paused, { config, integrationId });
      loadData();
    } catch (err) {
      console.error('Failed to toggle pause', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !data) {
    return <div className={styles.emptyState}>Loading...</div>;
  }

  if (error && !data) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!data) return null;

  const hasItems = data.slots && data.slots.length > 0;

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <div className={styles.statusInfo}>
          <div className={styles.speed}>
            <Download size={14} />
            <span>{data.speed}</span>
          </div>
          <div className={styles.timeleft}>
            <Clock size={14} />
            <span>{data.timeleft}</span>
          </div>
        </div>
      </div>

      <List className={styles.queueList}>
        {!hasItems ? (
          <div className={styles.emptyState}>
            <CheckCircle size={24} />
            <span>Queue is empty</span>
          </div>
        ) : (
          data.slots.map((slot, index) => (
            <div key={index} className={styles.queueItem}>
              <div className={styles.itemHeader}>
                <span className={styles.filename} title={slot.filename}>
                  {slot.filename}
                </span>
                <span className={styles.percentage}>{slot.percentage}%</span>
              </div>
              
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${slot.percentage}%` }}
                />
              </div>

              <div className={styles.itemFooter}>
                <span className={styles.itemSize}>
                  {formatSize(String(parseFloat(slot.mb) - parseFloat(slot.mbleft)))} / {formatSize(slot.mb)}
                </span>
                <span className={styles.itemStatus}>
                  {slot.status}
                </span>
              </div>
            </div>
          ))
        )}
      </List>

      <div className={styles.footer}>
        <button 
          className={styles.pauseButton} 
          onClick={handleTogglePause}
          title={data.paused ? "Resume Queue" : "Pause Queue"}
        >
          {data.paused ? <Play size={16} /> : <Pause size={16} />}
          <span>{data.paused ? "Resume" : "Pause"}</span>
        </button>
      </div>
    </div>
  );
}
