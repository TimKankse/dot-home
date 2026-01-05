import React from 'react';
import { WidgetConfigProps } from './types';

export const JellyfinConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>URL</label>
        <input 
          className={styles.input} 
          value={config.url || ''} 
          onChange={(e) => onChange('url', e.target.value)} 
          placeholder="http://..." 
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>API Key</label>
        <input 
          className={styles.input} 
          type="password" 
          value={config.apiKey || ''} 
          onChange={(e) => onChange('apiKey', e.target.value)} 
          placeholder="API Key" 
        />
      </div>
       <div className={styles.formGroup}>
        <label className={styles.label}>User ID (Optional)</label>
        <input 
          className={styles.input} 
          value={config.userId || ''} 
          onChange={(e) => onChange('userId', e.target.value)} 
          placeholder="Jellyfin User ID" 
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>View Mode</label>
        <select 
          className={styles.select} 
          value={config.viewMode || 'now_playing'} 
          onChange={(e) => onChange('viewMode', e.target.value)}
        >
          <option value="now_playing">Now Playing</option>
          <option value="recent">Recent</option>
          <option value="libraries">Libraries</option>
        </select>
      </div>
    </>
  );
};
