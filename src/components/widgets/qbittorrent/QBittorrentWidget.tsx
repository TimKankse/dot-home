'use client';

import { useEffect, useState } from 'react';
import styles from './QBittorrentWidget.module.css';
import { Download, Clock, CheckCircle, Pause, Play } from 'lucide-react';

interface QueueSlot {
  filename: string;
  percentage: string;
  mbleft: string;
  mb: string;
  status: string;
  timeleft: string;
  index: number;
}

interface QueueData {
  status: string;
  speed: string;
  timeleft: string;
  slots: QueueSlot[];
  paused: boolean;
}

interface QBittorrentResponse {
  queue: QueueData;
}

const formatSize = (mbString: string) => {
  const mb = parseFloat(mbString);
  if (isNaN(mb)) return mbString;
  
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
};

export function QBittorrentWidget({ config }: { config?: { url?: string; username?: string; password?: string } }) {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!config?.url) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/qbittorrent?mode=queue', {
        headers: {
          'x-qbittorrent-url': config.url,
          'x-qbittorrent-username': config.username || '',
          'x-qbittorrent-password': config.password || '',
        }
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      
      const json: QBittorrentResponse = await res.json();
      setData(json.queue);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to qBittorrent');
    } finally {
      setLoading(false);
    }
  };

  const togglePause = async () => {
    if (!data) return;
    const newMode = data.paused ? 'resume' : 'pause';
    try {
      await fetch(`/api/qbittorrent?mode=${newMode}`, {
        method: 'POST', // Although GET with mode param works if API handles it, my API expects POST for pause/resume? 
        // Wait, my API route checks `mode` from searchParams, but for pause/resume it does a POST to qBittorrent.
        // But the widget calls the Next.js API.
        // My API route implementation for pause/resume:
        // } else if (mode === 'pause' || mode === 'resume') { ... }
        // It doesn't check method, just mode.
        headers: {
          'x-qbittorrent-url': config?.url || '',
          'x-qbittorrent-username': config?.username || '',
          'x-qbittorrent-password': config?.password || '',
        }
      });
      fetchData(); // Refresh data immediately
    } catch (err) {
      console.error('Failed to toggle pause', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

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

      <div className={styles.queueList}>
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
                  {formatSize(slot.mbleft)} / {formatSize(slot.mb)}
                </span>
                <span className={styles.itemStatus}>
                    {slot.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.pauseButton} 
          onClick={togglePause}
          title={data.paused ? "Resume Queue" : "Pause Queue"}
        >
          {data.paused ? <Play size={16} /> : <Pause size={16} />}
          <span>{data.paused ? "Resume" : "Pause"}</span>
        </button>
      </div>
    </div>
  );
}
