import React from 'react';
import { WidgetConfigProps } from './types';

export const NetdataConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
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
          <option value="network">Network</option>
          <option value="processes">Processes</option>
          <option value="gpu">GPU</option>
        </select>
      </div>

      {metricType === 'storage' && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.label}>Mount Points (comma separated)</label>
            <input 
              className={styles.input} 
              value={Array.isArray(config.mountPoints) ? config.mountPoints.join(', ') : (config.mountPoints || '')} 
              onChange={(e) => onChange('mountPoints', e.target.value)} 
              placeholder="/, /home" 
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>View Mode</label>
            <select 
              className={styles.select} 
              value={config.storageViewMode || 'linear'} 
              onChange={(e) => onChange('storageViewMode', e.target.value)}
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </div>
        </>
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

      {metricType === 'processes' && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Process Limit</label>
          <input 
            className={styles.input} 
            type="number" 
            value={config.processLimit || 5} 
            onChange={(e) => onChange('processLimit', Number(e.target.value))} 
          />
        </div>
      )}

      {metricType === 'gpu' && (
        <div className={styles.formGroup}>
          <label className={styles.label}>GPU ID</label>
          <input 
            className={styles.input} 
            value={config.gpuId || ''} 
            onChange={(e) => onChange('gpuId', e.target.value)} 
            placeholder="gpu0" 
          />
        </div>
      )}
    </>
  );
};
