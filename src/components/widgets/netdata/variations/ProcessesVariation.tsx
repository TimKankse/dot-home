/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import styles from '../NetdataWidget.module.css';

interface ProcessesVariationProps {
    data: any;
    config: any;
}

export const ProcessesVariation: React.FC<ProcessesVariationProps> = ({ data, config }) => {
    // Sort by CPU usage desc
    const processes = [...(data.processList || [])]
        .sort((a: any, b: any) => b.cpu_percent - a.cpu_percent)
        .slice(0, config?.processLimit || 5);

    if (processes.length === 0) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.header}>
                    <span className={styles.widgetTitle}>TOP APPS</span>
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
                <span className={styles.widgetTitle}>TOP APPS</span>
            </div>
            <div className={styles.processList}>
                <div className={styles.processHeader}>
                    <span>NAME</span>
                    <span>CPU</span>
                    <span>MEM</span>
                </div>
                {processes.map((proc: any) => (
                    <div key={proc.pid} className={styles.processItem}>
                        <span className={styles.processName} title={proc.name}>{proc.name}</span>
                        <span className={styles.processValue}>{proc.cpu_percent.toFixed(1)}%</span>
                        <span className={styles.processValue}>{proc.memory_percent.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
