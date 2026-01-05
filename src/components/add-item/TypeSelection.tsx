"use client";

import React from 'react';
import { Link as LinkIcon, AppWindow } from 'lucide-react';
import styles from './AddItemDialog.module.css';

interface TypeSelectionProps {
  onSelect: (type: 'shortcut' | 'widget') => void;
}

export const TypeSelection: React.FC<TypeSelectionProps> = ({ onSelect }) => {
  return (
    <div className={styles.typeSelection}>
      <div className={styles.typeCard} onClick={() => onSelect('shortcut')}>
        <LinkIcon size={48} className={styles.typeIcon} />
        <span className={styles.typeLabel}>Shortcut</span>
      </div>
      <div className={styles.typeCard} onClick={() => onSelect('widget')}>
        <AppWindow size={48} className={styles.typeIcon} />
        <span className={styles.typeLabel}>Widget</span>
      </div>
    </div>
  );
};
