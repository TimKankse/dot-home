"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Container, RefreshCw, AlertCircle, Play, Square, RotateCw, Info } from 'lucide-react';
import styles from './PortainerWidget.module.css';
import { ContainerInfoModal } from './components/ContainerInfoModal';
import type { PortainerWidgetConfig } from '@/types';
import { 
  fetchPortainerContainers, 
  performContainerAction, 
  getContainerName,
  PortainerContainer 
} from '@/services/portainer';

interface PortainerWidgetProps {
  isEditing?: boolean;
  config?: PortainerWidgetConfig;
}

export const PortainerWidget: React.FC<PortainerWidgetProps> = ({ isEditing = false, config }) => {
  const [containers, setContainers] = useState<PortainerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<PortainerContainer | null>(null);

  const loadData = useCallback(async () => {
    if (!config?.url || !config?.apiKey) {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchPortainerContainers({ config });
      setContainers(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    if (!config) return;
    
    setActionLoading(id);
    try {
      await performContainerAction(id, action, config);
      setTimeout(loadData, 1000);
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
            const name = getContainerName(container);
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
