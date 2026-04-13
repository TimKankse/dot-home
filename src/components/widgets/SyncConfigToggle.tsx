/**
 * SyncConfigToggle - Toggle for widget sync configuration
 *
 * When enabled, config changes affect all users.
 * When disabled, each user has their own personal configuration.
 */

'use client';

import React from 'react';
import { Switch } from '@/components/primitives/switch';
import styles from './SyncConfigToggle.module.css';

interface SyncConfigToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SyncConfigToggle({
  value,
  onChange,
  disabled = false,
}: SyncConfigToggleProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>Sync Configuration</label>
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          className={styles.switchControl}
        />
      </div>
      <p className={styles.description}>
        {value
          ? 'All users see the same configuration. Changes affect everyone.'
          : 'Each user has their own personal configuration.'}
      </p>
    </div>
  );
}

export default SyncConfigToggle;
