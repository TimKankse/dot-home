import React from 'react';
import { WidgetConfigProps } from './types';

export const GlancesConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  const metricType = config.metricType || 'cpu';

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
        <label className={styles.label}>Metric Type</label>
        <select 
          className={styles.select} 
          value={metricType} 
          onChange={(e) => onChange('metricType', e.target.value)}
        >
          <option value="cpu">CPU</option>
          <option value="memory">Memory</option>
          <option value="storage">Storage</option>
          <option value="load">Load</option>
          <option value="network">Network</option>
        </select>
      </div>

      {metricType === 'storage' && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Mount Points (comma separated)</label>
          <input 
            className={styles.input} 
            value={Array.isArray(config.mountPoints) ? config.mountPoints.join(', ') : (config.mountPoints || '')} 
            onChange={(e) => onChange('mountPoints', e.target.value)} 
            placeholder="/, /home" 
          />
        </div>
      )}

      {metricType === 'network' && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Interface Name</label>
          <input 
            className={styles.input} 
            value={config.interfaceName || ''} 
            onChange={(e) => onChange('interfaceName', e.target.value)} 
            placeholder="eth0" 
          />
        </div>
      )}
    </>
  );
};
