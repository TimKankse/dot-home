/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import styles from '../NetdataWidget.module.css';
import { CircularProgress } from '../components/CircularProgress';
import { Sparkline } from '../components/Sparkline';

interface CpuVariationProps {
    data: any;
    history: number[];
}

export const CpuVariation: React.FC<CpuVariationProps> = ({ data, history }) => {
    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>CPU LOAD</span>
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
                                    const sensor = data.sensors.find((s: any) => s.label.toLowerCase().includes('package') || s.label.toLowerCase().includes('physical')) || data.sensors[0];
                                    return sensor ? `${Math.round(sensor.value)}°C` : '';
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
