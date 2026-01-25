import React, { useState, useEffect, useRef } from 'react';
import styles from './JellyfinWidget.module.css';
import { JellyfinSession, LibraryStats, JellyfinWidgetConfig } from './types';
import { NowPlayingVariation } from './variations/NowPlayingVariation';
import { LibrariesVariation } from './variations/LibrariesVariation';
import { fetchJellyfinData, createJellyfinWebSocket, fetchJellyfinLibraryCounts } from '@/services/jellyfin';
import isEqual from 'lodash/isEqual';

interface JellyfinWidgetProps {
  config?: JellyfinWidgetConfig;
}

export const JellyfinWidget: React.FC<JellyfinWidgetProps & { integrationId?: string }> = ({ config, integrationId }) => {
  const [sessions, setSessions] = useState<JellyfinSession[]>([]);
  const [libraries, setLibraries] = useState<LibraryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep ref to latest libraries for comparison in polling closure
  const librariesRef = useRef<LibraryStats[]>([]);
  useEffect(() => {
    librariesRef.current = libraries;
  }, [libraries]);

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

        // Smart Polling for Libraries View
        if (config?.viewMode === 'libraries') {
           // Clear existing interval if any
           if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
           
           pollIntervalRef.current = setInterval(async () => {
               try {
                   const newCounts = await fetchJellyfinLibraryCounts({ config, integrationId });
                   
                   // Compare simplified objects (Id + Counts)
                   const currentState = librariesRef.current.map(l => ({ Id: l.Id, Counts: l.Counts }));
                   const newState = newCounts.map(l => ({ Id: l.Id, Counts: l.Counts }));
                   
                   if (!isEqual(currentState, newState)) {
                       // Refresh full data to get updated sizes
                       loadData(); 
                   }
               } catch (e) {
                   console.error('Failed to poll Jellyfin counts', e);
               }
           }, 60000);
        } else if (config?.url && config?.apiKey) {
           // WebSocket for Now Playing View
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
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
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