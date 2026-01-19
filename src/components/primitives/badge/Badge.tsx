import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon,
  className = ''
}) => {
  return (
    <div className={`${styles.badge} ${styles[`variant-${variant}`]} ${className}`}>
      {icon}
      {children}
    </div>
  );
};
