import React from 'react';
import styles from '../NetdataWidget.module.css';

interface StorageCircularProgressProps {
    value: number;
    label: string;
    subLabel: string;
    color: string;
}

export const StorageCircularProgress: React.FC<StorageCircularProgressProps> = ({ value, label, subLabel, color }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className={styles.storageCircularItem}>
            <div className={styles.circularProgress} style={{ width: '85px', height: '85px' }}>
                <svg width="85" height="85" viewBox="0 0 85 85">
                    <circle
                        cx="42.5"
                        cy="42.5"   
                        r={radius}
                        stroke="var(--surface-overlay-active)"
                        strokeWidth="14"
                        fill="none"
                    />
                    <circle
                        cx="42.5"
                        cy="42.5"
                        r={radius}
                        stroke={color}
                        strokeWidth="14"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        transform="rotate(-90 42.5 42.5)"
                    />
                </svg>
                <div className={styles.circularLabel} style={{ position: 'absolute' }}>
                    <span className={styles.circularValue} style={{ fontSize: '1rem' }}>{Math.round(value)}%</span>
                </div>
            </div>
            <span className={styles.storageCircularLabel}>{label}</span>
            <span className={styles.storageCircularDetails}>{subLabel}</span>
        </div>
    );
};
