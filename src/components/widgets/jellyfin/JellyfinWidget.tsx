import React, { useState, useEffect, useRef } from 'react';
import styles from './JellyfinWidget.module.css';
import { JellyfinSession, LibraryStats, JellyfinWidgetConfig } from './types';
import { NowPlayingVariation } from './variations/NowPlayingVariation';
import { LibrariesVariation } from './variations/LibrariesVariation';

interface JellyfinWidgetProps {
  config?: JellyfinWidgetConfig;
}

export const JellyfinWidget: React.FC<JellyfinWidgetProps> = ({ config }) => {
  const [sessions, setSessions] = useState<JellyfinSession[]>([]);
  const [libraries, setLibraries] = useState<LibraryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!config?.url || !config?.apiKey) {
        setLoading(false);
        return;
      }

      try {
        // Fetch Sessions
        const sessionsRes = await fetch('/api/jellyfin/sessions', {
          headers: {
            'x-jellyfin-url': config.url,
            'x-jellyfin-apikey': config.apiKey
          }
        });
        const sessionsData = await sessionsRes.json();
        const activeSessions = Array.isArray(sessionsData) 
          ? sessionsData.filter((s: JellyfinSession) => s.NowPlayingItem) 
          : [];
        setSessions(activeSessions);

        // Fetch Libraries if no sessions or just to have them ready
        if (config.userId) {
          const libRes = await fetch('/api/jellyfin/libraries', {
            headers: {
              'x-jellyfin-url': config.url,
              'x-jellyfin-apikey': config.apiKey,
              'x-jellyfin-userid': config.userId
            }
          });
          if (libRes.ok) {
            const libData = await libRes.json();
            setLibraries(libData);
          }
        }

        setLoading(false);

        // WebSocket Setup
        const wsUrl = new URL(config.url);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl.pathname = wsUrl.pathname.replace(/\/$/, '') + '/socket';
        wsUrl.searchParams.set('api_key', config.apiKey);
        wsUrl.searchParams.set('deviceId', 'dot-home-dashboard');

        const ws = new WebSocket(wsUrl.toString());
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Jellyfin WebSocket connected');
          ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '1000,1000' }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.MessageType === 'Sessions') {
              const data = msg.Data;
              const activeSessions = Array.isArray(data) 
                ? data.filter((s: JellyfinSession) => s.NowPlayingItem) 
                : [];
              setSessions(activeSessions);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          console.log('Jellyfin WebSocket disconnected');
          reconnectTimeoutRef.current = setTimeout(fetchData, 5000);
        };

      } catch (error) {
        console.error('Failed to initialize Jellyfin:', error);
        setLoading(false);
        reconnectTimeoutRef.current = setTimeout(fetchData, 10000);
      }
    };

    fetchData();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [config]);

  if (loading && sessions.length === 0 && libraries.length === 0) {
     return <div className={styles.loadingContainer}>Loading...</div>;
  }

  // View Mode: Libraries
  if (config?.viewMode === 'libraries') {
      return <LibrariesVariation libraries={libraries} userId={config.userId} />;
  }

  // View Mode: Now Playing (Default)
  // Fallback to libraries if configured and nothing playing
  if (sessions.length === 0 && libraries.length > 0) {
      return <LibrariesVariation libraries={libraries} userId={config?.userId} />;
  }

  return <NowPlayingVariation sessions={sessions} config={config} />;
};