import React from 'react';
import styles from '../NetdataWidget.module.css';
import { NetdataApiResponse, ProcessData } from '@/app/api/netdata/types';
import type { NetdataWidgetConfig } from '@/types';
import { List } from '@/components/primitives';

interface ProcessesVariationProps {
    data: NetdataApiResponse;
    config?: NetdataWidgetConfig;
    title?: string;
}

export const ProcessesVariation: React.FC<ProcessesVariationProps> = ({ data, config, title }) => {
    // Sort by CPU usage desc
    const processes = [...(data.processList || [])]
        .sort((a: ProcessData, b: ProcessData) => b.cpu_percent - a.cpu_percent)
        .slice(0, config?.processLimit || 5);

    if (processes.length === 0) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.header}>
                    <span className={styles.widgetTitle}>{title || 'TOP APPS'}</span>
                </div>
                <div className={styles.offlineState}>
                    <p style={{ fontSize: '0.8rem' }}>No process data</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Check apps.plugin</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>{title || 'TOP APPS'}</span>
            </div>
            <div className={styles.processListWrapper}>
                <div className={styles.processHeader}>
                    <span>NAME</span>
                    <span>CPU</span>
                    <span>MEM</span>
                </div>
                <List variant="compact" className={styles.processList}>
                    {processes.map((proc: ProcessData) => (
                        <div key={proc.pid} className={styles.processItem}>
                            <span className={styles.processName} title={proc.name}>{proc.name}</span>
                            <span className={styles.processValue}>{proc.cpu_percent.toFixed(1)}%</span>
                            <span className={styles.processValue}>{proc.memory_percent.toFixed(1)}%</span>
                        </div>
                    ))}
                </List>
            </div>
        </div>
    );
};
