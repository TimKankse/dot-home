'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Rss, AlertCircle } from 'lucide-react';
import styles from './RssWidget.module.css';
import type { RssWidgetConfig } from '@/types';
import { List } from '@/components/primitives/list/List';
import { fetchRssFeed, formatTimeAgo, RssData } from '@/services/rss';

interface RssWidgetProps {
  config?: RssWidgetConfig;
}

export const RssWidget: React.FC<RssWidgetProps> = ({ config }) => {
  const [data, setData] = useState<RssData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const feedUrls = config?.feedUrls || (config?.feedUrl ? [config.feedUrl] : []);
  const customTitle = config?.title;
  const maxItems = config?.maxItems || 5;
  const showThumbnail = config?.showThumbnail ?? true;
  const showSummary = config?.showSummary ?? true;
  const refreshInterval = config?.refreshInterval || 15;

  const feedUrlsKey = JSON.stringify(feedUrls);

  const loadData = useCallback(async () => {
    if (feedUrls.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const json = await fetchRssFeed(feedUrls);
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch RSS data:', err);
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedUrlsKey]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData, refreshInterval]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
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
            onClick={loadData} 
            title="Refresh Feed"
            disabled={loading}
          >
            <Rss size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      <List className={styles.feedList}>
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
                {formatTimeAgo(item.isoDate || item.pubDate, now)}
              </span>
            </div>
          </div>
        ))}
      </List>
    </div>
  );
};
