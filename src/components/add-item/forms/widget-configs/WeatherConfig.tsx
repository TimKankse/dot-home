import React from 'react';
import { WidgetConfigProps } from './types';

export const WeatherConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Location</label>
        <input 
          className={styles.input} 
          value={config.location || ''} 
          onChange={(e) => onChange('location', e.target.value)} 
          placeholder="City, Country" 
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>View</label>
        <select 
          className={styles.select} 
          value={config.view || 'current'} 
          onChange={(e) => onChange('view', e.target.value)}
        >
          <option value="current">Current Weather</option>
          <option value="daily">24-Hour Forecast</option>
          <option value="weekly">7-Day Forecast</option>
        </select>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Unit</label>
        <select 
          className={styles.select} 
          value={config.unit || 'metric'} 
          onChange={(e) => onChange('unit', e.target.value)}
        >
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </select>
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
    </>
  );
};
