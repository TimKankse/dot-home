import React from 'react';
import styles from '../NetdataWidget.module.css';
import { AlertCircle } from 'lucide-react';
import { Sparkline } from '../components/Sparkline';
import type { NetdataWidgetConfig } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';

interface CoreData {
    id: number;
    load: number;
    temp?: number;
}

interface NetdataData {
    cores?: CoreData[];
    coresDataType?: 'utilization' | 'frequency';
}

interface CpuCoresVariationProps {
    data: NetdataData;
    history: {
        cores: Record<number, number[]>;
    };
    config?: NetdataWidgetConfig;
}

export const CpuCoresVariation: React.FC<CpuCoresVariationProps> = ({ data, history, config }) => {
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

    if (!data.cores || data.cores.length === 0) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.offlineState}>
                    <AlertCircle size={24} color="var(--accent-red)" />
                    <p style={{ fontSize: '0.8rem' }}>No core data found</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 8px' }}>
                        If using Docker, ensure /proc is mounted to /host/proc
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>
                    {data.coresDataType === 'frequency' ? 'CPU FREQ' : 'CPU CORES'}
                </span>
            </div>
            <div className={styles.coresGrid}>
                {data.cores.map((core) => (
                    <div key={core.id} className={styles.coreItem}>
                        <div className={styles.coreGraph}>
                            <Sparkline 
                                dataPoints={history.cores[core.id] || []} 
                                color="var(--accent-green)" 
                                maxLimit={data.coresDataType === 'frequency' ? undefined : 100} 
                            />
                            <div className={styles.coreOverlay}>
                                {Math.round(core.load)}{data.coresDataType === 'frequency' ? ' MHz' : '%'}
                            </div>
                        </div>
                        <div className={styles.coreFooter}>
                            <span className={styles.coreLabel}>CORE {core.id}</span>
                            {core.temp !== undefined && (
                                <span className={styles.coreTemp}>{formatTemp(core.temp)}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
