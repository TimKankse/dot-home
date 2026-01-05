"use client";

import React, { useState, useEffect } from 'react';
import { Container, RefreshCw, AlertCircle, Play, Square, RotateCw, Info } from 'lucide-react';
import styles from './PortainerWidget.module.css';
import { ContainerInfoModal } from './components/ContainerInfoModal';

interface PortainerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports: Array<{ PrivatePort: number; PublicPort?: number; Type: string }>;
  NetworkSettings?: {
    Networks: Record<string, { IPAddress: string }>;
  };
}

interface PortainerWidgetProps {
  isEditing?: boolean;
  config?: {
    url?: string;
    apiKey?: string;
    endpointId?: string;
  };
}

export const PortainerWidget: React.FC<PortainerWidgetProps> = ({ isEditing = false, config }) => {
  const [containers, setContainers] = useState<PortainerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedContainer, setSelectedContainer] = useState<PortainerContainer | null>(null);

  const fetchData = async () => {
    if (!config?.url || !config?.apiKey) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/portainer', {
        headers: {
          'x-portainer-url': config.url,
          'x-portainer-apikey': config.apiKey,
          'x-portainer-endpoint-id': config.endpointId || '1',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await res.json();
      // Filter out non-running containers if list is too long? 
      // For now, just show all but sort running first
      const sorted = Array.isArray(data) ? data.sort((a: PortainerContainer, b: PortainerContainer) => {
          if (a.State === 'running' && b.State !== 'running') return -1;
          if (a.State !== 'running' && b.State === 'running') return 1;
          return a.Names[0].localeCompare(b.Names[0]);
      }) : [];
      
      setContainers(sorted);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [config?.url, config?.apiKey, config?.endpointId]);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    if (!config?.url || !config?.apiKey) return;
    
    setActionLoading(id);
    try {
        const res = await fetch('/api/portainer', {
            method: 'POST',
            headers: {
                'x-portainer-url': config.url,
                'x-portainer-apikey': config.apiKey,
                'x-portainer-endpoint-id': config.endpointId || '1',
            },
            body: JSON.stringify({ id, action }),
        });

        if (!res.ok) throw new Error('Action failed');
        
        // Refresh data after action
        setTimeout(fetchData, 1000);
    } catch (err) {
        console.error(err);
    } finally {
        setActionLoading(null);
    }
  };

  if (isEditing) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.header}>
          <div className="flex items-center gap-2">
            <Container size={20} color="var(--accent-blue)" />
            <span className="font-display">Portainer Config</span>
          </div>
        </div>
        <div className={styles.editContent}>
          <p className="font-mono text-muted" style={{ fontSize: '0.9rem' }}>
            URL: {config?.url || 'Not set'}
          </p>
          <p className="font-mono text-muted" style={{ fontSize: '0.9rem' }}>
            Endpoint: {config?.endpointId || '1'}
          </p>
        </div>
      </div>
    );
  }

  if (!config?.url || !config?.apiKey) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.offlineState}>
          <AlertCircle size={24} color="var(--accent-red)" />
          <p style={{ fontSize: '0.8rem' }}>Configure Portainer</p>
        </div>
      </div>
    );
  }

  if (loading && containers.length === 0) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.offlineState}>Loading...</div>
      </div>
    );
  }

  if (error && containers.length === 0) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.offlineState}>
          <AlertCircle size={24} color="var(--accent-red)" />
          <p style={{ fontSize: '0.8rem' }}>Offline</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.widgetContainer}>
        <div className={styles.header}>
          <span className={styles.widgetTitle}>CONTAINERS</span>
          <span className="text-xs font-mono text-muted">{containers.length}</span>
        </div>
        <div className={styles.containerList}>
          {containers.map((container) => {
              const isRunning = container.State === 'running';
              const name = container.Names[0].replace(/^\//, '');
              const isLoading = actionLoading === container.Id;

              return (
                  <div key={container.Id} className={styles.containerItem}>
                      <div className={styles.itemInfo}>
                          <div className={`${styles.statusDot} ${isRunning ? styles.statusRunning : styles.statusStopped}`} />
                          <span className={styles.containerName} title={name}>{name}</span>
                      </div>
                      <div className={styles.actions}>
                          <button 
                              className={styles.infoButton}
                              onClick={() => setSelectedContainer(container)}
                              title="Info"
                          >
                              <Info size={14} />
                          </button>
                          {isLoading ? (
                              <RefreshCw size={14} className="animate-spin" />
                          ) : (
                              <>
                                  {isRunning ? (
                                      <>
                                          <button 
                                              className={styles.actionButton} 
                                              onClick={() => handleAction(container.Id, 'restart')}
                                              title="Restart"
                                          >
                                              <RotateCw size={14} />
                                          </button>
                                          <button 
                                              className={styles.actionButton} 
                                              onClick={() => handleAction(container.Id, 'stop')}
                                              title="Stop"
                                          >
                                              <Square size={14} />
                                          </button>
                                      </>
                                  ) : (
                                      <button 
                                          className={styles.actionButton} 
                                          onClick={() => handleAction(container.Id, 'start')}
                                          title="Start"
                                      >
                                          <Play size={14} />
                                      </button>
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              );
          })}
        </div>
      </div>
      {selectedContainer && (
        <ContainerInfoModal 
          container={selectedContainer} 
          onClose={() => setSelectedContainer(null)} 
        />
      )}
    </>
  );
};
