"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Server, HardDrive, Cpu, AlertCircle } from 'lucide-react';
import styles from './GlancesWidget.module.css';

interface GlancesData {
  cpu: {
    total: number;
    user?: number;
    system?: number;
  };
  mem: {
    percent: number;
    used: number;
    total: number;
  };
  fs: Array<{
    mnt_point: string;
    percent: number;
    used: number;
    size: number;
  }>;
  sensors: Array<{
    label: string;
    value: number;
    unit: string;
  }>;
  processList: Array<{
    pid: number;
    name: string;
    cpu_percent: number;
    memory_percent: number;
    username: string;
  }>;
  network: Array<{
    interface_name: string;
    rx: number;
    tx: number;
    cx: number;
    cumulative_rx: number;
    cumulative_tx: number;
    cumulative_cx: number;
  }>;
}

interface GlancesWidgetProps {
  isEditing?: boolean;
  config?: {
    url?: string;
    metricType?: 'cpu' | 'ram' | 'storage' | 'processes' | 'network';
    mountPoints?: string[];
    interfaceName?: string;
  };
}

export const GlancesWidget: React.FC<GlancesWidgetProps> = ({ isEditing = false, config }) => {
  const [data, setData] = useState<GlancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ cpu: number[], ram: number[], netRx: number[], netTx: number[] }>({ cpu: [], ram: [], netRx: [], netTx: [] });
  const lastNetworkRef = useRef<Record<string, { timestamp: number, rx: number, tx: number }>>({});
  const metricType = config?.metricType || 'cpu';

  useEffect(() => {
    const fetchData = async () => {
      if (!config?.url) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/glances', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: config.url }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch Glances data');
        }

        const result = await response.json();
        
        // Process network data to calculate rates if missing
        if (result.network) {
            const now = Date.now();
            result.network = result.network.map((iface: any) => {
                // If rx/tx are present and valid numbers, use them
                if (typeof iface.rx === 'number' && typeof iface.tx === 'number' && !isNaN(iface.rx) && !isNaN(iface.tx)) {
                    return iface;
                }

                // Otherwise calculate from cumulative
                const last = lastNetworkRef.current[iface.interface_name];
                let rx = 0;
                let tx = 0;

                if (last && iface.cumulative_rx >= last.rx && iface.cumulative_tx >= last.tx) {
                    const timeDiff = (now - last.timestamp) / 1000; // seconds
                    if (timeDiff > 0) {
                        rx = (iface.cumulative_rx - last.rx) / timeDiff;
                        tx = (iface.cumulative_tx - last.tx) / timeDiff;
                    }
                }

                // Update ref
                lastNetworkRef.current[iface.interface_name] = {
                    timestamp: now,
                    rx: iface.cumulative_rx,
                    tx: iface.cumulative_tx
                };

                return {
                    ...iface,
                    rx,
                    tx
                };
            });
        }

        setData(result);
        
        // Update history
        setHistory(prev => {
            const newCpu = [...prev.cpu, result.cpu.total].slice(-30); // Keep last 30 points
            const newRam = [...prev.ram, result.mem.percent].slice(-30);
            
            let newNetRx = prev.netRx;
            let newNetTx = prev.netTx;

            if (result.network) {
                // Find target interface
                const targetInterface = config?.interfaceName 
                    ? result.network.find((n: any) => n.interface_name === config.interfaceName)
                    : result.network.find((n: any) => n.interface_name !== 'lo');
                
                if (targetInterface) {
                    newNetRx = [...prev.netRx, targetInterface.rx].slice(-30);
                    newNetTx = [...prev.netTx, targetInterface.tx].slice(-30);
                }
            }

            return { cpu: newCpu, ram: newRam, netRx: newNetRx, netTx: newNetTx };
        });

        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000); // Update every 2 seconds for smoother graphs
    return () => clearInterval(interval);
  }, [config?.url]);

  const formatBytes = (bytes: number | undefined | null) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Sparkline SVG generator
  const renderSparkline = (dataPoints: number[], color: string) => {
    if (dataPoints.length < 2) return null;
    
    const width = 120;
    const height = 40;
    
    // Dynamic scaling
    const dataMin = Math.min(...dataPoints);
    const dataMax = Math.max(...dataPoints);
    const range = dataMax - dataMin;
    
    // Add 10% padding to top and bottom, but keep min >= 0 and max <= 100
    const min = Math.max(0, dataMin - range * 0.1);
    const max = Math.min(100, dataMax + range * 0.1 || 100); // Fallback to 100 if range is 0
    
    const points = dataPoints.map((val, i) => {
        const x = (i / (dataPoints.length - 1)) * width;
        const y = height - ((val - min) / (max - min)) * height;
        return `${x},${y}`;
    }).join(' ');

    const gradientId = `gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={color} stopOpacity="0.1" />
            </linearGradient>
            <polygon
                points={`${0},${height} ${points} ${width},${height}`}
                fill={`url(#${gradientId})`}
                stroke="none"
            />
        </svg>
    );
  };

  // Circular Progress Component
  const CircularProgress = ({ value, color, label }: { value: number, color: string, label: string }) => {
      const radius = 42;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (value / 100) * circumference;

      return (
          <div className={styles.circularProgress}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="14"
                      fill="none"
                  />
                  <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      stroke={color}
                      strokeWidth="14"
                      fill="none"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      transform="rotate(-90 50 50)"
                  />
              </svg>
              <div className={styles.circularLabel}>
                  <span className={styles.circularValue}>{Math.round(value)}%</span>
              </div>
          </div>
      );
  };

  if (isEditing) {
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Activity size={20} color="var(--accent-blue)" />
            <span className="font-display">Glances Config</span>
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

  if (!config?.url) {
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

  // Render based on metric type
  if (metricType === 'cpu') {
      return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>CPU LOAD</span>
            </div>
            <div className={styles.cpuContent}>
                <CircularProgress value={data.cpu.total} color="var(--accent-green)" label="CPU" />
                <div className={styles.graphContainer}>
                    {renderSparkline(history.cpu, 'var(--accent-green)')}
                    {data.sensors && data.sensors.length > 0 && (
                        <div className={styles.cpuTemp}>
                            {/* Try to find a package temp, otherwise take the first one */}
                            {(() => {
                                const sensor = data.sensors.find(s => s.label.toLowerCase().includes('package') || s.label.toLowerCase().includes('physical')) || data.sensors[0];
                                return sensor ? `${Math.round(sensor.value)}°C` : '';
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  if (metricType === 'ram') {
      return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>RAM USAGE</span>
            </div>
            <div className={styles.ramContent}>
                <div className={styles.ramGraphContainer}>
                    {renderSparkline(history.ram, 'var(--accent-green)')}
                </div>
                <div className={styles.progressBarContainer}>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill} 
                            style={{ width: `${data.mem.percent}%`, backgroundColor: 'var(--accent-green)' }} 
                        />
                    </div>
                </div>
                <div className={styles.ramDetails}>
                    <span className="font-mono text-muted">{formatBytes(data.mem.used)} / {formatBytes(data.mem.total)} ({Math.round(data.mem.percent)}%)</span>
                </div>
            </div>
        </div>
      );
  }

  if (metricType === 'storage') {
      // Show all storage items, sorted by usage desc
      let storageItems = [...data.fs].sort((a, b) => b.percent - a.percent);

      // Filter by mount points if provided
      if (config?.mountPoints && config.mountPoints.length > 0) {
          storageItems = storageItems.filter(fs => config.mountPoints!.includes(fs.mnt_point));
      }

      return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>STORAGE</span>
            </div>
            <div className={styles.storageList}>
                {storageItems.map((fs) => (
                    <div key={fs.mnt_point} className={styles.storageItem}>
                        <div className={styles.storageHeader}>
                            <span className={styles.mountPoint}>{fs.mnt_point}</span>
                            <span className={styles.storageValue}>{Math.round(fs.percent)}% ({formatBytes(fs.used)} / {formatBytes(fs.size)})</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill} 
                                style={{ width: `${fs.percent}%`, backgroundColor: fs.percent > 90 ? 'var(--accent-red)' : 'var(--accent-green)' }} 
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  if (metricType === 'processes') {
    // Sort by CPU usage desc
    const processes = [...(data.processList || [])]
        .sort((a, b) => b.cpu_percent - a.cpu_percent)
        .slice(0, 5); // Show top 5

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>TOP PROCESSES</span>
            </div>
            <div className={styles.processList}>
                <div className={styles.processHeader}>
                    <span>NAME</span>
                    <span>CPU</span>
                    <span>MEM</span>
                </div>
                {processes.map((proc) => (
                    <div key={proc.pid} className={styles.processItem}>
                        <span className={styles.processName} title={proc.name}>{proc.name}</span>
                        <span className={styles.processValue}>{proc.cpu_percent.toFixed(1)}%</span>
                        <span className={styles.processValue}>{proc.memory_percent.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  if (metricType === 'network') {
    // Find target interface
    const targetInterface = config?.interfaceName 
        ? data.network?.find(n => n.interface_name === config.interfaceName)
        : data.network?.find(n => n.interface_name !== 'lo');

    if (!targetInterface) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.offlineState}>
                    <AlertCircle size={24} color="var(--accent-red)" />
                    <p style={{ fontSize: '0.8rem' }}>Interface not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>NETWORK ({targetInterface.interface_name})</span>
            </div>
            <div className={styles.networkSingle}>
                <div className={styles.networkGraphContainer}>
                    {/* Render two graphs or one? Let's do two small ones for now */}
                    <div className={styles.netGraphRow}>
                        <span className={styles.netGraphLabel}>↓</span>
                        <div className={styles.netGraph}>
                             {renderSparkline(history.netRx, 'var(--accent-blue)')}
                        </div>
                    </div>
                    <div className={styles.netGraphRow}>
                        <span className={styles.netGraphLabel}>↑</span>
                        <div className={styles.netGraph}>
                             {renderSparkline(history.netTx, 'var(--accent-purple)')}
                        </div>
                    </div>
                </div>
                <div className={styles.networkStats}>
                    <div className={styles.networkStat}>
                        <span className={styles.statLabel} style={{ color: 'var(--accent-blue)' }}>↓</span>
                        <span className={styles.statValue}>{formatBytes(targetInterface.rx)}/s</span>
                    </div>
                    <div className={styles.networkStat}>
                        <span className={styles.statLabel} style={{ color: 'var(--accent-purple)' }}>↑</span>
                        <span className={styles.statValue}>{formatBytes(targetInterface.tx)}/s</span>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return null;
};
