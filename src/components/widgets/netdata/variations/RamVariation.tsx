import React from 'react';
import styles from '../NetdataWidget.module.css';
import { Sparkline, type SparklinePoint } from '../components/Sparkline';
import { formatBytes } from '../utils';
import { NetdataApiResponse } from '@/app/api/netdata/types';

interface RamVariationProps {
    data: NetdataApiResponse;
    history: SparklinePoint[];
    title?: string;
}

export const RamVariation: React.FC<RamVariationProps> = ({ data, history, title }) => {
    const formatPercent = (value: number) => `${Math.round(value * 10) / 10}%`;

    if (!data.mem) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.offlineState}>
                    <p style={{ fontSize: '0.8rem' }}>No RAM data</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>{title || 'RAM USAGE'}</span>
            </div>
            <div className={styles.ramContent}>
                <div className={styles.ramGraphContainer}>
                    <Sparkline
                        dataPoints={history}
                        color="var(--accent-green)"
                        maxLimit={100}
                        formatY={formatPercent}
                        tooltipLabel="RAM usage"
                    />
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
};
