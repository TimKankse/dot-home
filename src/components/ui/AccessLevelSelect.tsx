import React from 'react';
import { Lock, Eye, Globe } from 'lucide-react';
import styles from './AccessLevelSelect.module.css';

export type AccessLevel = 'PUBLIC' | 'VIEWABLE' | 'PRIVATE';

interface AccessLevelSelectProps {
  value: AccessLevel;
  onChange: (value: AccessLevel) => void;
  disabled?: boolean;
}

const ACCESS_LEVELS: { value: AccessLevel; label: string; description: string }[] = [
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only you can view and edit',
  },
  {
    value: 'VIEWABLE',
    label: 'Viewable',
    description: 'Others can view, only you can edit',
  },
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Anyone can view and edit',
  },
];

const ACCESS_ICONS = {
  PRIVATE: Lock,
  VIEWABLE: Eye,
  PUBLIC: Globe,
};

export function AccessLevelSelect({
  value,
  onChange,
  disabled = false,
}: AccessLevelSelectProps) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>Access Level</label>
      <div className={styles.options}>
        {ACCESS_LEVELS.map((level) => {
          const Icon = ACCESS_ICONS[level.value];
          return (
            <button
              key={level.value}
              type="button"
              className={`${styles.option} ${value === level.value ? styles.selected : ''}`}
              onClick={() => onChange(level.value)}
              disabled={disabled}
            >
              <span className={styles.icon}>
                <Icon size={16} />
              </span>
              <span className={styles.optionLabel}>{level.label}</span>
              <span className={styles.description}>{level.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AccessLevelSelect;

