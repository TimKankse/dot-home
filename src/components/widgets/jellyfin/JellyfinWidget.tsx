import React, { useState, useEffect, useRef } from 'react';
import styles from './JellyfinWidget.module.css';
import { JellyfinSession, LibraryStats, JellyfinWidgetConfig } from './types';
import { NowPlayingVariation } from './variations/NowPlayingVariation';
import { LibrariesVariation } from './variations/LibrariesVariation';
import { fetchJellyfinData, createJellyfinWebSocket } from '@/services/jellyfin';

interface JellyfinWidgetProps {
  config?: JellyfinWidgetConfig;
}

export const JellyfinWidget: React.FC<JellyfinWidgetProps & { integrationId?: string }> = ({ config, integrationId }) => {
  const [sessions, setSessions] = useState<JellyfinSession[]>([]);
  const [libraries, setLibraries] = useState<LibraryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if ((!config?.url || !config?.apiKey) && !integrationId) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchJellyfinData({ config, integrationId });
        setSessions(data.sessions);
        setLibraries(data.libraries);
        setLoading(false);

        if (config?.url && config?.apiKey) {
          const ws = createJellyfinWebSocket(config, (newSessions) => {
            setSessions(newSessions);
          });
          
          if (ws) {
            wsRef.current = ws;
            ws.onclose = () => {
              reconnectTimeoutRef.current = setTimeout(loadData, 5000);
            };
          }
        }
      } catch (error) {
        console.error('Failed to initialize Jellyfin:', error);
        setLoading(false);
        reconnectTimeoutRef.current = setTimeout(loadData, 10000);
      }
    };

    loadData();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [config, integrationId]);

  if (loading && sessions.length === 0 && libraries.length === 0) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  if (config?.viewMode === 'libraries') {
    return <LibrariesVariation libraries={libraries} userId={config.userId} />;
  }

  if (config?.viewMode === 'now-playing') {
    return <NowPlayingVariation sessions={sessions} config={config} />;
  }

  if (sessions.length === 0 && libraries.length > 0) {
    return <LibrariesVariation libraries={libraries} userId={config?.userId} />;
  }

  return <NowPlayingVariation sessions={sessions} config={config} />;
};