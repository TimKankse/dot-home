/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import styles from '../NetdataWidget.module.css';
import { AlertCircle } from 'lucide-react';
import { StorageCircularProgress } from '../components/StorageCircularProgress';
import { formatBytes } from '../utils';

interface StorageVariationProps {
    data: any;
    config: any;
}

export const StorageVariation: React.FC<StorageVariationProps> = ({ data, config }) => {
    // Show all storage items, sorted by usage desc
    let storageItems = [...data.fs].sort((a: any, b: any) => b.percent - a.percent);
    const availableMounts = storageItems.map((fs: any) => fs.mnt_point).join(', ');

    // Filter by mount points if provided
    if (config?.mountPoints && config.mountPoints.length > 0) {
        const filtered = storageItems.filter((fs: any) => config.mountPoints!.includes(fs.mnt_point));
        if (filtered.length > 0) {
            storageItems = filtered;
        } else {
            // If no matches, show error but also available mounts
            return (
            <div className={styles.widgetContainer}>
                <div className={styles.header}>
                    <span className={styles.widgetTitle}>STORAGE</span>
                </div>
                <div className={styles.offlineState}>
                    <AlertCircle size={24} color="var(--accent-red)" />
                    <p style={{ fontSize: '0.8rem' }}>Mounts not found</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Available: {availableMounts || 'None'}
                    </p>
                </div>
            </div>
            );
        }
    }

    if (config?.storageViewMode === 'circular') {
        return (
        <div className={styles.widgetContainer}>
            <div className={styles.header}>
                <span className={styles.widgetTitle}>STORAGE</span>
            </div>
            <div className={styles.storageCircularList}>
                {storageItems.map((fs: any) => (
                    <StorageCircularProgress 
                        key={fs.mnt_point}
                        value={fs.percent}
                        label={fs.mnt_point}
                        subLabel={`${formatBytes(fs.used)} / ${formatBytes(fs.size)}`}
                        color={fs.percent > 90 ? 'var(--accent-red)' : 'var(--accent-green)'}
                    />
                ))}
            </div>
        </div>
        );
    }

    return (
    <div className={styles.widgetContainer}>
        <div className={styles.header}>
            <span className={styles.widgetTitle}>STORAGE</span>
        </div>
        <div className={styles.storageList}>
            {storageItems.map((fs: any) => (
                <div key={fs.mnt_point} className={styles.storageItem}>
                    <div className={styles.storageHeader}>
                        <span className={styles.mountPoint}>{fs.mnt_point}</span>
                        <span className={styles.storageValue}>{Math.round(fs.percent)}% ({formatBytes(fs.used)} / {formatBytes(fs.size)})</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill} 
                            style={{ width: `${fs.percent}%`, backgroundColor: fs.percent > 90 ? 'var(--accent-red)' : 'var(--accent-green)' }} 
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
    );
};
