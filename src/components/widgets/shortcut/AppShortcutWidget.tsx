"use client";

import React, { useState, useEffect } from 'react';
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
  isSelfHosted?: boolean;
  internalUrl?: string; // Optional internal URL for status checking if different from public URL
  config?: Record<string, unknown>;
}

type Status = 'online' | 'offline' | 'fetching' | 'unknown';

export const AppShortcutWidget: React.FC<AppShortcutWidgetProps & { isEditing?: boolean; onEdit?: () => void }> = ({
  name,
  url,
  icon,
  iconUrl,
  className = '',
  isSelfHosted = false,
  internalUrl,
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
  const [status, setStatus] = useState<Status>('unknown');
  
  useEffect(() => {
    if (!isSelfHosted) return;

    const checkStatus = async () => {
      setStatus('fetching');
      const targetUrl = internalUrl || url;
      
      try {
        // Use our proxy API to avoid CORS and mixed content issues
        const response = await fetch(`/api/status?url=${encodeURIComponent(targetUrl)}`);
        if (response.ok) {
          setStatus('online');
        } else {
          setStatus('offline');
        }
      } catch (error) {
        console.error(`Failed to check status for ${name}:`, error);
        setStatus('offline');
      }
    };

    // Initial check
    checkStatus();

    // Poll every 60 seconds
    const intervalId = setInterval(checkStatus, 60000);

    return () => clearInterval(intervalId);
  }, [url, internalUrl, isSelfHosted, name]);

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
      {isSelfHosted && (
        <div 
          className={`
            ${styles.statusIndicator} 
            ${status === 'online' ? styles.statusOnline : ''}
            ${status === 'offline' ? styles.statusOffline : ''}
            ${status === 'fetching' ? styles.statusFetching : ''}
          `}
          title={`Status: ${status}`}
        />
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
