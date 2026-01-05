'use client';

import React, { useState, useEffect } from 'react';
import { Rss, AlertCircle } from 'lucide-react';
import styles from './RssWidget.module.css';

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  isoDate?: string;
  thumbnail?: string;
  publisher?: string;
}

interface RssData {
  title: string;
  description: string;
  items: RssItem[];
}

interface RssWidgetProps {
  config?: {
    feedUrl?: string; // Legacy support
    feedUrls?: string[];
    title?: string;
    maxItems?: number;
    showThumbnail?: boolean;
    showSummary?: boolean;
    refreshInterval?: number;
  };
}

export const RssWidget: React.FC<RssWidgetProps> = ({ config }) => {
  const [data, setData] = useState<RssData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Backward compatibility: use feedUrl if feedUrls is not present
  const feedUrls = config?.feedUrls || (config?.feedUrl ? [config.feedUrl] : []);
  const customTitle = config?.title;
  const maxItems = config?.maxItems || 5;
  const showThumbnail = config?.showThumbnail ?? true;
  const showSummary = config?.showSummary ?? true;
  const refreshInterval = config?.refreshInterval || 15;

  const fetchData = async () => {
    if (feedUrls.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Build query string with one or more 'url' params
      const params = new URLSearchParams();
      feedUrls.forEach(url => params.append('url', url));
      
      const response = await fetch(`/api/rss?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch RSS feed');
      
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch RSS data:', err);
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh based on config
    const interval = setInterval(fetchData, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [JSON.stringify(feedUrls), refreshInterval]);

  // Update "time ago" every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (feedUrls.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Rss size={24} />
        <span>Configure Feed URL</span>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className={styles.emptyState}>
        <span>Loading...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={styles.error}>
        <AlertCircle size={24} />
        <span>{error}</span>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span>No items found</span>
      </div>
    );
  }

  const displayItems = data.items.slice(0, maxItems);
  const widgetTitle = customTitle || data.title || 'RSS Feed';

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.header}>
        <h3 className={styles.title} title={widgetTitle}>
          {widgetTitle}
        </h3>
        <div className={styles.headerControls}>
          <button 
            className={styles.refreshButton} 
            onClick={fetchData} 
            title="Refresh Feed"
            disabled={loading}
          >
            <Rss size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      <div className={styles.feedList}>
        {displayItems.map((item, index) => (
          <div key={index} className={styles.feedItem}>
            <div className={styles.itemHeader}>
              {showThumbnail && item.thumbnail && (
                <div className={styles.thumbnail}>
                  <img src={item.thumbnail} alt="" loading="lazy" />
                </div>
              )}
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.itemTitle}
                title={item.title}
              >
                {item.title}
              </a>
            </div>
            
            {showSummary && item.contentSnippet && (
              <p className={styles.summary} title={item.contentSnippet}>
                {item.contentSnippet}
              </p>
            )}
            
            <div className={styles.itemMeta}>
              {item.publisher && (
                <span className={styles.publisher}>{item.publisher}</span>
              )}
              <span className={styles.date}>
                {(() => {
                  const dateStr = item.isoDate || item.pubDate;
                  const date = new Date(dateStr);
                  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
                  
                  let timeString = '';
                  if (diffInSeconds < 60) {
                    timeString = 'just now';
                  } else {
                    const diffInMinutes = Math.floor(diffInSeconds / 60);
                    if (diffInMinutes < 60) {
                      timeString = `${diffInMinutes}m ago`;
                    } else {
                      const diffInHours = Math.floor(diffInMinutes / 60);
                      if (diffInHours < 24) {
                        timeString = `${diffInHours}h ago`;
                      } else {
                        const diffInDays = Math.floor(diffInHours / 24);
                        if (diffInDays === 1) {
                          timeString = 'yesterday';
                        } else if (diffInDays < 7) {
                          timeString = `${diffInDays}d ago`;
                        } else {
                          const diffInWeeks = Math.floor(diffInDays / 7);
                          if (diffInWeeks === 1) {
                            timeString = 'last week';
                          } else if (diffInWeeks < 4) {
                            timeString = `${diffInWeeks}w ago`;
                          } else {
                            timeString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          }
                        }
                      }
                    }
                  }
                  return timeString;
                })()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
