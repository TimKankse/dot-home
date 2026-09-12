"use client";

import React from 'react';
import Link from 'next/link';
import { useShortcutIcon } from '@/hooks/useShortcutIcon';
import { DragHandles } from '../../ui/DragHandles';
import { Settings } from 'lucide-react';
// import { LucideIcon } from 'lucide-react'; // Removed unused import
import styles from './AppShortcutWidget.module.css';

interface AppShortcutWidgetProps {
  name: string;
  url: string;
  icon?: React.ReactNode; // Made optional
  iconUrl?: string; // Custom icon URL
  className?: string;
}

export const AppShortcutWidget: React.FC<AppShortcutWidgetProps & { isEditing?: boolean; onEdit?: () => void }> = ({
  name,
  url,
  icon,
  iconUrl,
  className = '',
  isEditing = false,
  onEdit
}) => {
  const {
    imageUrl,
    fallbackIcon,
    fallbackLetter,
    handleImageError,
  } = useShortcutIcon({
    name,
    url,
    iconUrl,
  });

  // Determine what to render
  let renderedIcon: React.ReactNode;

  if (icon) {
    renderedIcon = icon;
  }
  else if (imageUrl) {
    renderedIcon = (
      <div className={styles.iconWrapper}>
        {/* Background "Glow" Layer - Monochrome White */}
        <img 
          src={imageUrl} 
          alt="" 
          className={styles.iconBg}
          aria-hidden="true"
        />
        {/* Foreground Detail Layer - Original Color */}
        <img 
          src={imageUrl} 
          alt={name} 
          className={styles.iconFg}
          onError={handleImageError}
        />
      </div>
    );
  } else if (fallbackIcon) {
    renderedIcon = fallbackIcon;
  } else {
    renderedIcon = (
      <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        {fallbackLetter}
      </span>
    );
  }
  const content = (
    <>
      {isEditing && <DragHandles />}
      {isEditing && onEdit && (
        <button 
          type="button"
          className={`${styles.settingsButton} nodrag`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          aria-label={`Edit ${name}`}
        >
          <Settings size={14} />
        </button>
      )}
      <div className={styles.iconContainer}>
        {renderedIcon}
      </div>
      
      <span className={styles.label}>{name}</span>
    </>
  );

  if (isEditing) {
    return (
      <div
        className={`${styles.widgetContainer} ${className}`.trim()}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{ cursor: 'default', position: 'relative' }}
      >
        {content}
      </div>
    );
  }

  return (
    <Link 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`${styles.widgetContainer} ${className}`.trim()}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      {content}
    </Link>
  );
};
