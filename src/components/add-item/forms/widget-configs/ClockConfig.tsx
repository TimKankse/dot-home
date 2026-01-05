import React from 'react';
import { WidgetConfigProps } from './types';

export const ClockConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  const variant = config.variant || 'digital';
  const justification = config.justification || 'center';
  const hour12 = config.hour12 ?? false;
  const includeDate = config.includeDate ?? true;
  const dateFormat = config.dateFormat || 'short';

  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Variant</label>
        <select 
          className={styles.select} 
          value={variant} 
          onChange={(e) => onChange('variant', e.target.value)}
        >
          <option value="digital">Digital</option>
          <option value="analog">Analog</option>
        </select>
      </div>
      {variant === 'digital' && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.label}>Justification</label>
            <select 
              className={styles.select} 
              value={justification} 
              onChange={(e) => onChange('justification', e.target.value)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Time Format</label>
            <select 
              className={styles.select} 
              value={hour12 ? '12h' : '24h'} 
              onChange={(e) => onChange('hour12', e.target.value === '12h')}
            >
              <option value="24h">24 Hour</option>
              <option value="12h">12 Hour</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Show Date</label>
            <select 
              className={styles.select} 
              value={includeDate ? 'yes' : 'no'} 
              onChange={(e) => onChange('includeDate', e.target.value === 'yes')}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          {includeDate && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Date Format</label>
              <select 
                className={styles.select} 
                value={dateFormat} 
                onChange={(e) => onChange('dateFormat', e.target.value)}
              >
                <option value="short">Short (Mon, Jan 1)</option>
                <option value="long">Long (Monday, January 1)</option>
              </select>
            </div>
          )}
        </>
      )}
    </>
  );
};
