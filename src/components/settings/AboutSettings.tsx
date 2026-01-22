"use client";

import React from 'react';
import { DotHomeVersionCard } from '../ui/DotHomeVersionCard';
import styles from './SettingsDialog.module.css';

export const AboutSettings: React.FC = () => {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>About</div>
      <DotHomeVersionCard />
    </div>
  );
};
