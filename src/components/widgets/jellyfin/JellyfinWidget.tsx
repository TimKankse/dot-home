import React from 'react';
import { useLiveWidget } from '@/hooks/useLiveWidget';
import styles from './JellyfinWidget.module.css';
import { JellyfinSession, LibraryStats, JellyfinWidgetConfig } from './types';
import { NowPlayingVariation } from './variations/NowPlayingVariation';
import { LibrariesVariation } from './variations/LibrariesVariation';

interface JellyfinWidgetProps {
  config?: JellyfinWidgetConfig;
}

export const JellyfinWidget: React.FC<JellyfinWidgetProps & { integrationId?: string }> = ({ config, integrationId }) => {
  const sessionFeed = useLiveWidget<JellyfinSession[]>(integrationId, 'sessions', config?.viewMode !== 'libraries');
  const sessions = sessionFeed.data ?? [];
  const needsLibraries = config?.viewMode === 'libraries' || (!config?.viewMode && sessionFeed.data?.length === 0);
  const libraryFeed = useLiveWidget<LibraryStats[]>(integrationId, 'libraries', needsLibraries);
  const libraries = libraryFeed.data ?? [];
  const loading = needsLibraries ? libraryFeed.loading : sessionFeed.loading;
  const error = needsLibraries ? libraryFeed.error : sessionFeed.error;

  if (loading && !sessions.length && !libraries.length) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }
  if (error && !sessions.length && !libraries.length) {
    return <div className={styles.loadingContainer}>{error}</div>;
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
