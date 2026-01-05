import React from 'react';
import { WidgetConfigProps } from './types';

export const CalendarConfig: React.FC<WidgetConfigProps> = ({ config, onChange, styles }) => {
  const [activeTab, setActiveTab] = React.useState<'general' | 'arr'>('general');

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            background: activeTab === 'general' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: 'none',
            color: activeTab === 'general' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('arr')}
          style={{
            background: activeTab === 'arr' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: 'none',
            color: activeTab === 'arr' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
            padding: '4px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          *arr Stack
        </button>
      </div>

      {activeTab === 'general' && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.label}>Week Start</label>
            <select 
              className={styles.select} 
              value={config.weekStart || 'sunday'} 
              onChange={(e) => onChange('weekStart', e.target.value)}
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Default View</label>
            <select 
              className={styles.select} 
              value={config.defaultView || 'daily'} 
              onChange={(e) => onChange('defaultView', e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>iCal URLs</label>
            {(config.icalUrls || (config.icalUrl ? [config.icalUrl] : [''])).map((url: string, index: number) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input 
                  className={styles.input} 
                  value={url} 
                  onChange={(e) => {
                    const newUrls = [...(config.icalUrls || (config.icalUrl ? [config.icalUrl] : ['']))];
                    newUrls[index] = e.target.value;
                    onChange('icalUrls', newUrls);
                    if (index === 0) onChange('icalUrl', e.target.value);
                  }} 
                  placeholder="https://..." 
                />
                <button
                  type="button"
                  onClick={() => {
                    const newUrls = [...(config.icalUrls || (config.icalUrl ? [config.icalUrl] : ['']))];
                    newUrls.splice(index, 1);
                    onChange('icalUrls', newUrls);
                    if (index === 0 && newUrls.length > 0) onChange('icalUrl', newUrls[0]);
                    if (newUrls.length === 0) onChange('icalUrl', '');
                  }}
                  style={{
                    background: 'rgba(255, 59, 48, 0.1)',
                    color: '#ff3b30',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    padding: '0 12px',
                    fontSize: '16px'
                  }}
                  title="Remove URL"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newUrls = [...(config.icalUrls || (config.icalUrl ? [config.icalUrl] : [])), ''];
                onChange('icalUrls', newUrls);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '8px 12px',
                fontSize: '12px',
                width: '100%'
              }}
            >
              + Add iCal URL
            </button>
          </div>
        </>
      )}

      {activeTab === 'arr' && (
        <>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle} style={{ marginTop: 0, marginBottom: '12px' }}>Radarr (Movies)</h4>
            <div className={styles.formGroup}>
              <label className={styles.label}>URL</label>
              <input 
                className={styles.input} 
                value={config.radarrUrl || ''} 
                onChange={(e) => onChange('radarrUrl', e.target.value)} 
                placeholder="http://localhost:7878" 
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>API Key</label>
              <input 
                className={styles.input} 
                type="password"
                value={config.radarrApiKey || ''} 
                onChange={(e) => onChange('radarrApiKey', e.target.value)} 
                placeholder="Radarr API Key" 
              />
            </div>
          </div>

          <div className={styles.section} style={{ marginTop: '20px' }}>
            <h4 className={styles.sectionTitle} style={{ marginTop: 0, marginBottom: '12px' }}>Sonarr (TV)</h4>
            <div className={styles.formGroup}>
              <label className={styles.label}>URL</label>
              <input 
                className={styles.input} 
                value={config.sonarrUrl || ''} 
                onChange={(e) => onChange('sonarrUrl', e.target.value)} 
                placeholder="http://localhost:8989" 
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>API Key</label>
              <input 
                 className={styles.input} 
                 type="password"
                 value={config.sonarrApiKey || ''} 
                 onChange={(e) => onChange('sonarrApiKey', e.target.value)} 
                 placeholder="Sonarr API Key" 
               />
            </div>
          </div>
        </>
      )}
    </>
  );
};
