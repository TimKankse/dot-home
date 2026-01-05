import React from 'react';
import { WidgetConfigProps } from './types';

export const PortainerConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
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
        <label className={styles.label}>Endpoint ID</label>
        <input 
          className={styles.input} 
          value={config.endpointId || '1'} 
          onChange={(e) => onChange('endpointId', e.target.value)} 
          placeholder="1" 
        />
      </div>
    </>
  );
};
