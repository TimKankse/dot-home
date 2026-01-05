import React from 'react';
import { WidgetConfigProps } from './types';

export const TwitchConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  const channels = Array.isArray(config.channels) 
    ? config.channels.join(', ') 
    : (config.channels || '');

  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Client ID</label>
        <input 
          className={styles.input} 
          value={config.clientId || ''} 
          onChange={(e) => onChange('clientId', e.target.value)} 
          placeholder="Twitch Client ID" 
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Client Secret</label>
        <input 
          className={styles.input} 
          type="password" 
          value={config.clientSecret || ''} 
          onChange={(e) => onChange('clientSecret', e.target.value)} 
          placeholder="Twitch Client Secret" 
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Channels (comma separated)</label>
        <input 
          className={styles.input} 
          value={channels} 
          onChange={(e) => onChange('channels', e.target.value)} 
          placeholder="channel1, channel2" 
        />
      </div>
    </>
  );
};
