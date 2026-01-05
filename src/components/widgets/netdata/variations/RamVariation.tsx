/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import styles from '../NetdataWidget.module.css';
import { Sparkline } from '../components/Sparkline';
import { formatBytes } from '../utils';

interface RamVariationProps {
    data: any;
    history: number[];
}

export const RamVariation: React.FC<RamVariationProps> = ({ data, history }) => {
    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>RAM USAGE</span>
            </div>
            <div className={styles.ramContent}>
                <div className={styles.ramGraphContainer}>
                    <Sparkline dataPoints={history} color="var(--accent-green)" maxLimit={100} />
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
