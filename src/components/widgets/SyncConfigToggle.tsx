/**
 * SyncConfigToggle - Toggle for widget sync configuration
 *
 * When enabled, config changes affect all users.
 * When disabled, each user has their own personal configuration.
 */

'use client';

import React from 'react';
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
        <button
          type="button"
          role="switch"
          aria-checked={value}
          className={`${styles.toggle} ${value ? styles.on : styles.off}`}
          onClick={() => onChange(!value)}
          disabled={disabled}
        >
          <span className={styles.slider} />
        </button>
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
