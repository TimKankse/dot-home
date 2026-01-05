import React from 'react';
import styles from '../NetdataWidget.module.css';
import { AlertCircle } from 'lucide-react';
import { Sparkline } from '../components/Sparkline';

interface CpuCoresVariationProps {
    data: any;
    history: any;
}

export const CpuCoresVariation: React.FC<CpuCoresVariationProps> = ({ data, history }) => {
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
                {data.cores.map((core: any) => (
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
                                <span className={styles.coreTemp}>{Math.round(core.temp)}°C</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
