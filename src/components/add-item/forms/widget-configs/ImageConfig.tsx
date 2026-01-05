import React from 'react';
import { WidgetConfigProps } from './types';

export const ImageConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  return (
    <div className={styles.configContainer}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Image URL</label>
        <input 
          className={styles.input}
          value={config.url || ''}
          onChange={(e) => onChange('url', e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Object Fit</label>
        <select 
          className={styles.select}
          value={config.fit || 'cover'}
          onChange={(e) => onChange('fit', e.target.value)}
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>
    </div>
  );
};
