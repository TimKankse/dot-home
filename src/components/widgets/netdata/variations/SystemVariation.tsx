import React from 'react';
import styles from '../NetdataWidget.module.css';
import { AlertCircle } from 'lucide-react';
import { NetdataApiResponse } from '@/app/api/netdata/types';
import { List } from '@/components/primitives';

interface SystemVariationProps {
    data: NetdataApiResponse;
    title?: string;
}

export const SystemVariation: React.FC<SystemVariationProps> = ({ data, title }) => {
    if (!data.systemInfo) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.offlineState}>
                    <AlertCircle size={24} color="var(--accent-red)" />
                    <p style={{ fontSize: '0.8rem' }}>No system info</p>
                </div>
            </div>
        );
    }

    const { hostname: _hostname, uptime, os, kernel, ip, virtualization } = data.systemInfo;

    // Format uptime
    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        
        const parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        
        return parts.join(' ') || '0m';
    };

    return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>{title || 'SYSTEM'}</span>
            </div>
            <List variant="compact" className={styles.systemInfoList}>
                <div className={styles.systemInfoItem}>
                    <span className={styles.systemInfoLabel}>UPTIME</span>
                    <span className={styles.systemInfoValue}>{formatUptime(uptime)}</span>
                </div>
                <div className={styles.systemInfoItem}>
                    <span className={styles.systemInfoLabel}>OS</span>
                    <span className={styles.systemInfoValue}>{os}</span>
                </div>
                <div className={styles.systemInfoItem}>
                    <span className={styles.systemInfoLabel}>KERNEL</span>
                    <span className={styles.systemInfoValue}>{kernel}</span>
                </div>
                <div className={styles.systemInfoItem}>
                    <span className={styles.systemInfoLabel}>IP</span>
                    <span className={styles.systemInfoValue}>{ip}</span>
                </div>
                <div className={styles.systemInfoItem}>
                    <span className={styles.systemInfoLabel}>VIRT</span>
                    <span className={styles.systemInfoValue}>{virtualization}</span>
                </div>
            </List>
        </div>
    );
};
