import React from 'react';
import { WidgetConfigProps } from './types';

export const RssConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Feed URLs</label>
        {(config.feedUrls || (config.feedUrl ? [config.feedUrl] : [''])).map((url: string, index: number, arr: string[]) => (
          <div key={index} className={styles.inputRow}>
            <input 
              className={styles.input} 
              value={url} 
              onChange={(e) => {
                const newUrls = [...(config.feedUrls || (config.feedUrl ? [config.feedUrl] : ['']))];
                newUrls[index] = e.target.value;
                onChange('feedUrls', newUrls);
                // Sync legacy field for backward compatibility/first item
                if (index === 0) onChange('feedUrl', e.target.value);
              }} 
              placeholder="https://..." 
            />
            <button
              type="button"
              onClick={() => {
                const newUrls = [...(config.feedUrls || (config.feedUrl ? [config.feedUrl] : ['']))];
                newUrls.splice(index, 1);
                onChange('feedUrls', newUrls);
                if (index === 0 && newUrls.length > 0) onChange('feedUrl', newUrls[0]);
                if (newUrls.length === 0) onChange('feedUrl', '');
              }}
              className={styles.removeButton}
              title="Remove URL"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const newUrls = [...(config.feedUrls || (config.feedUrl ? [config.feedUrl] : [])), ''];
            onChange('feedUrls', newUrls);
          }}
          className={styles.addButton}
        >
          + Add Feed URL
        </button>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Max Items</label>
        <input 
          className={styles.input} 
          type="number" 
          value={config.maxItems || 5} 
          onChange={(e) => onChange('maxItems', Number(e.target.value))} 
        />
      </div>
    </>
  );
};
