"use client";

import React, { useState, useEffect } from 'react';
import { useNetdataStore } from '@/store/useNetdataStore';
import { AlertCircle } from 'lucide-react';
import styles from './NetdataWidget.module.css';

import { CpuVariation } from './variations/CpuVariation';
import { RamVariation } from './variations/RamVariation';
import { StorageVariation } from './variations/StorageVariation';
import { ProcessesVariation } from './variations/ProcessesVariation';
import { NetworkVariation } from './variations/NetworkVariation';
import { SystemVariation } from './variations/SystemVariation';
import { CpuCoresVariation } from './variations/CpuCoresVariation';
import { GpuVariation } from './variations/GpuVariation';
import type { SparklinePoint } from './components/Sparkline';
import type { NetdataWidgetConfig } from '@/types';
import { useIntegrationStore } from '@/store/useIntegrationStore';

interface NetdataWidgetProps {
  isEditing?: boolean;
  config?: NetdataWidgetConfig;
}

interface NetdataHistory {
  cpu: SparklinePoint[];
  ram: SparklinePoint[];
  netRx: SparklinePoint[];
  netTx: SparklinePoint[];
  cores: Record<number, SparklinePoint[]>;
  gpus: Record<string, SparklinePoint[]>;
}

const appendHistoryPoint = (history: SparklinePoint[], point: SparklinePoint) => (
  [...history, point].slice(-30)
);

export const NetdataWidget: React.FC<NetdataWidgetProps & { integrationId?: string; title?: string }> = ({ isEditing = false, config, integrationId, title }) => {
  const { instances, subscribe, unsubscribe } = useNetdataStore();
  const { integrations } = useIntegrationStore();
  
  const key = integrationId || config?.url;
  const instance = key ? instances[key] : null;
  const data = instance?.data || null;
  const loading = instance?.loading || false;
  const error = instance?.error || null;

  const [history, setHistory] = useState<NetdataHistory>({ cpu: [], ram: [], netRx: [], netTx: [], cores: {}, gpus: {} });
  const metricType = config?.metricType || 'cpu';

  // Determine Refresh Interval
  // Widget Config > Integration Config > Default (2000ms)
  const integration = integrationId ? integrations.find(i => i.id === integrationId) : null;
  const integrationConfig = integration?.config as { refreshInterval?: string } | undefined;
  
  const effectiveInterval = config?.refreshInterval 
      ? parseInt(String(config.refreshInterval), 10) 
      : (integrationConfig?.refreshInterval 
          ? parseInt(integrationConfig.refreshInterval, 10) 
          : 2000);

  useEffect(() => {
    if (key) {
      subscribe({ 
          url: config?.url, 
          integrationId, 
          scope: metricType, 
          refreshInterval: effectiveInterval 
      }); 
      return () => unsubscribe({ 
          url: config?.url, 
          integrationId, 
          scope: metricType,
          refreshInterval: effectiveInterval
      });
    }
  }, [config?.url, integrationId, metricType, subscribe, unsubscribe, key, effectiveInterval]);

  // Update history when data changes - accumulate time-series data in a rolling buffer
  useEffect(() => {
    if (!data) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid pattern for accumulating streaming time-series data
    setHistory(prev => {
        const timestamp = Date.now();
        const newCpu = data.cpu && typeof data.cpu.total === 'number' 
            ? appendHistoryPoint(prev.cpu, { x: timestamp, y: data.cpu.total })
            : prev.cpu;
        
        const newRam = data.mem && typeof data.mem.percent === 'number'
            ? appendHistoryPoint(prev.ram, { x: timestamp, y: data.mem.percent })
            : prev.ram;
        
        let newNetRx = prev.netRx;
        let newNetTx = prev.netTx;

        if (data.network && Array.isArray(data.network)) {
            // Find target interface
            const targetInterface = config?.interfaceName 
                ? data.network.find((n: { interface_name: string }) => n.interface_name === config.interfaceName)
                : data.network.find((n: { interface_name: string }) => n.interface_name !== 'lo');
            
            if (targetInterface) {
                newNetRx = appendHistoryPoint(prev.netRx, { x: timestamp, y: targetInterface.rx });
                newNetTx = appendHistoryPoint(prev.netTx, { x: timestamp, y: targetInterface.tx });
            }
        }

        let newCores = prev.cores;
        if (data.cores && Array.isArray(data.cores)) {
            newCores = { ...prev.cores };
            data.cores.forEach((core: { id: number; load: number }) => {
                const currentHistory = newCores[core.id] || [];
                newCores[core.id] = appendHistoryPoint(currentHistory, { x: timestamp, y: core.load });
            });
        }

        let newGpus = prev.gpus;
        if (data.gpus && Array.isArray(data.gpus)) {
            newGpus = { ...prev.gpus };
            data.gpus.forEach((gpu: { id: string; utilization: number }) => {
                const currentHistory = newGpus[gpu.id] || [];
                newGpus[gpu.id] = appendHistoryPoint(currentHistory, { x: timestamp, y: gpu.utilization });
            });
        }

        return { cpu: newCpu, ram: newRam, netRx: newNetRx, netTx: newNetTx, cores: newCores, gpus: newGpus };
    });
  }, [data, config?.interfaceName]);

  if (isEditing) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className="font-display">Netdata Config</span>
          </div>
        </div>
        <div className={styles.editContent}>
          <p className="font-mono text-muted" style={{ fontSize: '0.9rem' }}>
            URL: {config?.url || 'Not set'}
          </p>
          <p className="font-mono text-muted" style={{ fontSize: '0.9rem' }}>
            Metric: {metricType.toUpperCase()}
          </p>
        </div>
      </div>
    );
  }

  if (!config?.url && !integrationId) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.offlineState}>
          <AlertCircle size={24} color="var(--accent-red)" />
          <p style={{ fontSize: '0.8rem' }}>Configure URL</p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.offlineState}>Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.offlineState}>
          <AlertCircle size={24} color="var(--accent-red)" />
          <p style={{ fontSize: '0.8rem' }}>Offline</p>
        </div>
      </div>
    );
  }

  switch (metricType) {
    case 'cpu':
        if (!data.cpu) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading CPU...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No CPU Data</p>
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <CpuVariation data={data} history={history.cpu} config={config} title={title} />;
    case 'ram':
        if (!data.mem) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading RAM...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No RAM Data</p>
                                {data.chartsError && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{data.chartsError}</p>}
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <RamVariation data={data} history={history.ram} title={title} />;
    case 'storage':
        if (!data.fs) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading Storage...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No Storage Data</p>
                                {data.chartsError && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{data.chartsError}</p>}
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <StorageVariation data={data} config={config} title={title} />;
    case 'processes':
        if (!data.processList) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading Processes...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No Process Data</p>
                                {data.chartsError && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{data.chartsError}</p>}
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <ProcessesVariation data={data} config={config} title={title} />;
    case 'network':
        if (!data.network) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading Network...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No Network Data</p>
                                {data.chartsError && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{data.chartsError}</p>}
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <NetworkVariation data={data} history={history} config={config} title={title} />;
    case 'system':
        if (!data.systemInfo) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading System...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No System Data</p>
                                {data.chartsError && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{data.chartsError}</p>}
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <SystemVariation data={data} title={title} />;
    case 'cpu-cores':
        if (!data.cores) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading Cores...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No Cores Data</p>
                                {data.chartsError && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{data.chartsError}</p>}
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <CpuCoresVariation data={data} history={history} config={config} title={title} />;
    case 'gpu':
        if (!data.gpus) {
            return (
                <div className={styles.widgetContainer}>
                    <div className={styles.offlineState}>
                        {loading ? 'Loading GPU...' : (
                            <>
                                <AlertCircle size={24} color="var(--accent-red)" />
                                <p style={{ fontSize: '0.8rem' }}>No GPU Data</p>
                                {data.chartsError && <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{data.chartsError}</p>}
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <GpuVariation data={data} history={history} config={config} title={title} />;
    default:
        return null;
  }
};
