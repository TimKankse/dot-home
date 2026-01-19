"use client";

import React, { useState } from 'react';
import styles from './ImageWidget.module.css';
import type { ImageWidgetConfig } from '@/types';

export interface ImageWidgetProps {
  config?: ImageWidgetConfig;
}

export const ImageWidget: React.FC<ImageWidgetProps> = ({ config }) => {
  const [error, setError] = useState(false);
  const url = config?.url;
  const fit = config?.fit || 'cover';

  if (!url) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.message}>No Image URL</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.message}>Failed to load image</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      { }
      <img 
        src={url} 
        alt="Widget" 
        className={styles.image}
        style={{ objectFit: fit }}
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
      />
    </div>
  );
};
