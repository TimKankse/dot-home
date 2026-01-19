import React from 'react';
import styles from '../NetdataWidget.module.css';
import { AlertCircle } from 'lucide-react';
import { CircularProgress } from '../components/CircularProgress';
import { Sparkline } from '../components/Sparkline';
import { NetdataApiResponse, GpuData } from '@/app/api/netdata/types';
import type { NetdataWidgetConfig } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';

interface GpuHistory {
    gpus: Record<string, number[]>;
}

interface GpuVariationProps {
    data: NetdataApiResponse;
    history: GpuHistory;
    config?: NetdataWidgetConfig;
}

export const GpuVariation: React.FC<GpuVariationProps> = ({ data, history, config }) => {
    const { settings } = useSettingsStore();
    
    // Determine temperature unit: use config if set, otherwise app settings
    const tempUnit = config?.temperatureUnit ?? settings?.display?.temperatureUnit ?? 'C';
    
    // Convert temperature from Celsius to Fahrenheit if needed
    const formatTemp = (tempC: number): string => {
        if (tempUnit === 'F') {
            return `${Math.round(tempC * 9/5 + 32)}°F`;
        }
        return `${Math.round(tempC)}°C`;
    };

    if (!data.gpus || data.gpus.length === 0) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.offlineState}>
                    <AlertCircle size={24} color="var(--accent-red)" />
                    <p style={{ fontSize: '0.8rem' }}>No GPU data</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 8px' }}>
                        Ensure Netdata has GPU plugins enabled
                    </p>
                </div>
            </div>
        );
    }

    // Find target GPU
    const targetGpu = config?.gpuId 
        ? data.gpus.find((g: GpuData) => g.id === config.gpuId) || data.gpus[0]
        : data.gpus[0];

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>GPU LOAD</span>
            </div>
            <div className={styles.cpuContent}>
                <CircularProgress value={targetGpu.utilization} color="var(--accent-purple)" label="GPU" />
                <div className={styles.graphContainer}>
                    <Sparkline dataPoints={history.gpus[targetGpu.id] || []} color="var(--accent-purple)" maxLimit={100} />
                    <div className={styles.cpuFooter}>
                        <div className={styles.cpuModel} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {targetGpu.name.replace('NVIDIA ', '').replace('Intel ', '')}
                        </div>
                        
                        {targetGpu.temperature !== undefined && targetGpu.temperature > 0 && (
                            <div className={styles.cpuTemp}>
                                {formatTemp(targetGpu.temperature)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
