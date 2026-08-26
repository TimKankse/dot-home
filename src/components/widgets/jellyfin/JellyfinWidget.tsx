import React, { useState, useEffect } from 'react';
import styles from './JellyfinWidget.module.css';
import { JellyfinSession, LibraryStats, JellyfinWidgetConfig } from './types';
import { NowPlayingVariation } from './variations/NowPlayingVariation';
import { LibrariesVariation } from './variations/LibrariesVariation';
import { mergeSessionsPreservingOrder } from './utils';
import { fetchJellyfinData } from '@/services/jellyfin';

interface JellyfinWidgetProps {
  config?: JellyfinWidgetConfig;
}

export const JellyfinWidget: React.FC<JellyfinWidgetProps & { integrationId?: string }> = ({ config, integrationId }) => {
  const [sessions, setSessions] = useState<JellyfinSession[]>([]);
  const [libraries, setLibraries] = useState<LibraryStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      if (!integrationId) {
        if (isSubscribed) setLoading(false);
        return;
      }

      try {
        const data = await fetchJellyfinData({ config, integrationId });
        if (!isSubscribed) return;

        setSessions((previousSessions) => mergeSessionsPreservingOrder(previousSessions, data.sessions));
        setLibraries(data.libraries);
        setLoading(false);
      } catch (error) {
        console.error('Failed to refresh Jellyfin:', error);
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    loadData();
    const refreshInterval = config?.viewMode === 'libraries' ? 60_000 : 10_000;
    const intervalId = window.setInterval(loadData, refreshInterval);

    return () => {
      isSubscribed = false;
      window.clearInterval(intervalId);
    };
  }, [config, integrationId]);

  if (loading && sessions.length === 0 && libraries.length === 0) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  if (config?.viewMode === 'libraries') {
    return <LibrariesVariation libraries={libraries} selectedLibraries={config.selectedLibraries} />;
  }

  if (config?.viewMode === 'now-playing') {
    return <NowPlayingVariation sessions={sessions} integrationId={integrationId} />;
  }

  if (sessions.length === 0 && libraries.length > 0) {
    return <LibrariesVariation libraries={libraries} selectedLibraries={config?.selectedLibraries} />;
  }

  return <NowPlayingVariation sessions={sessions} integrationId={integrationId} />;
};
