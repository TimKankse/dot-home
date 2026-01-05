"use client";

import React from 'react';
import { Users } from 'lucide-react';
import styles from './SettingsDialog.module.css';

export const UsersSettings: React.FC = () => {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>User Management</div>
      <div className={styles.emptyState}>
        <Users size={32} className={styles.emptyStateIcon} />
        <p>User management coming soon.</p>
        <p style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.7 }}>Configure user accounts and permissions.</p>
      </div>
    </div>
  );
};
