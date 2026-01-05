import React from 'react';
import { WidgetConfigProps } from './types';

export const QBittorrentConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
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
        <label className={styles.label}>Username</label>
        <input 
          className={styles.input} 
          value={config.username || ''} 
          onChange={(e) => onChange('username', e.target.value)} 
          placeholder="admin" 
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Password</label>
        <input 
          className={styles.input} 
          type="password" 
          value={config.password || ''} 
          onChange={(e) => onChange('password', e.target.value)} 
          placeholder="adminadmin" 
        />
      </div>
    </>
  );
};
