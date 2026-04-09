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
  
  const librariesRef = useRef<LibraryStats[]>([]);
  useEffect(() => {
    librariesRef.current = libraries;
  }, [libraries]);

  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      if ((!config?.url || !config?.apiKey) && !integrationId) {
        if (isSubscribed) setLoading(false);
        return;
      }

      try {
        const data = await fetchJellyfinData({ config, integrationId });
        if (!isSubscribed) return;

        setSessions(data.sessions);
        setLibraries(data.libraries);
        setLoading(false);

        if (config?.viewMode === 'libraries') {
           if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
           
           pollIntervalRef.current = setInterval(async () => {
               try {
                   const newCounts = await fetchJellyfinLibraryCounts({ config, integrationId });
                   if (!isSubscribed) return;
                   
                   const currentState = librariesRef.current.map(l => ({ Id: l.Id, Counts: l.Counts }));
                   const newState = newCounts.map(l => ({ Id: l.Id, Counts: l.Counts }));
                   
                   if (!isEqual(currentState, newState)) {
                       loadData(); 
                   }
               } catch (e) {
                   console.error('Failed to poll Jellyfin counts', e);
               }
           }, 60000);
        } else if (config?.url && config?.apiKey) {
          if (wsRef.current) {
            wsRef.current.onclose = null; // Remove listener so we don't trigger reconnect loop
            wsRef.current.close();
            wsRef.current = null;
          }

          const ws = createJellyfinWebSocket(config, (newSessions) => {
            if (isSubscribed) setSessions(newSessions);
          });
          
          if (ws) {
            wsRef.current = ws;
            ws.onclose = () => {
              if (isSubscribed) {
                reconnectTimeoutRef.current = setTimeout(loadData, 5000);
              }
            };
          }
        }
      } catch (error) {
        console.error('Failed to initialize Jellyfin:', error);
        if (isSubscribed) {
          setLoading(false);
          reconnectTimeoutRef.current = setTimeout(loadData, 10000);
        }
      }
    };

    loadData();

    return () => {
      isSubscribed = false;
      if (wsRef.current) {
        wsRef.current.onclose = null; // Important to avoid triggering reconnects on unmount
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [config, integrationId]);

  if (loading && sessions.length === 0 && libraries.length === 0) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  if (config?.viewMode === 'libraries') {
    return <LibrariesVariation libraries={libraries} userId={config.userId} selectedLibraries={config.selectedLibraries} />;
  }

  if (config?.viewMode === 'now-playing') {
    return <NowPlayingVariation sessions={sessions} config={config} />;
  }

  if (sessions.length === 0 && libraries.length > 0) {
    return <LibrariesVariation libraries={libraries} userId={config?.userId} selectedLibraries={config?.selectedLibraries} />;
  }

  return <NowPlayingVariation sessions={sessions} config={config} />;
};