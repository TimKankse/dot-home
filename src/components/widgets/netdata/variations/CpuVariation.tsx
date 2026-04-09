import React from 'react';
import styles from '../NetdataWidget.module.css';
import { CircularProgress } from '../components/CircularProgress';
import { Sparkline } from '../components/Sparkline';
import { NetdataApiResponse, SensorData } from '@/app/api/netdata/types';
import type { NetdataWidgetConfig } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';

interface CpuVariationProps {
    data: NetdataApiResponse;
    history: number[];
    config?: NetdataWidgetConfig;
    title?: string;
}

export const CpuVariation: React.FC<CpuVariationProps> = ({ data, history, config, title }) => {
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

    if (!data.cpu) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.offlineState}>
                    <p style={{ fontSize: '0.8rem' }}>No CPU data</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>{title || 'CPU LOAD'}</span>
            </div>
            <div className={styles.cpuContent}>
                <CircularProgress value={data.cpu.total} color="var(--accent-green)" label="CPU" />
                <div className={styles.graphContainer}>
                    <Sparkline dataPoints={history} color="var(--accent-green)" maxLimit={100} />
                    <div className={styles.cpuFooter}>
                        {data.cpuModel ? (
                            <div className={styles.cpuModel} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {data.cpuModel}
                            </div>
                        ) : <div />}
                        
                        {data.sensors && data.sensors.length > 0 && (
                            <div className={styles.cpuTemp}>
                                {/* Try to find a package temp, otherwise take the first one */}
                                {(() => {
                                    const sensor = data.sensors.find((s: SensorData) => s.label.toLowerCase().includes('package') || s.label.toLowerCase().includes('physical')) || data.sensors[0];
                                    return sensor ? formatTemp(sensor.value) : '';
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
