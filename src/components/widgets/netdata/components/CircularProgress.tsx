import React from 'react';
import styles from '../NetdataWidget.module.css';

interface CircularProgressProps {
    value: number;
    color: string;
    label: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ value, color, label }) => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className={styles.circularProgress}>
            <svg width="100" height="100" viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="14"
                    fill="none"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke={color}
                    strokeWidth="14"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <div className={styles.circularLabel}>
                <span className={styles.circularValue}>{Math.round(value)}%</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{label}</span>
            </div>
        </div>
    );
};
