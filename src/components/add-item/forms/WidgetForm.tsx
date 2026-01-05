"use client";

import React, { useState, useEffect } from 'react';
import { FormProps } from '../types';
import styles from '../AddItemDialog.module.css';
import { IconSelector } from '../../ui/IconSelector';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import { YamlEditorTab } from './YamlEditorTab';
import { CalendarConfig } from './widget-configs/CalendarConfig';
import { ClockConfig } from './widget-configs/ClockConfig';
import { GlancesConfig } from './widget-configs/GlancesConfig';
import { JellyfinConfig } from './widget-configs/JellyfinConfig';
import { JellyseerrConfig } from './widget-configs/JellyseerrConfig';
import { NetdataConfig } from './widget-configs/NetdataConfig';

import { PortainerConfig } from './widget-configs/PortainerConfig';
import { QBittorrentConfig } from './widget-configs/QBittorrentConfig';
import { RssConfig } from './widget-configs/RssConfig';
import { SabnzbdConfig } from './widget-configs/SabnzbdConfig';
import { TwitchConfig } from './widget-configs/TwitchConfig';
import { WeatherConfig } from './widget-configs/WeatherConfig';

import { SearchConfig } from './widget-configs/SearchConfig';
import { ImageConfig } from './widget-configs/ImageConfig';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CONFIG_COMPONENTS: Record<string, React.ComponentType<any>> = {
  calendar: CalendarConfig,
  clock: ClockConfig,

  glances: GlancesConfig,
  jellyfin: JellyfinConfig,
  jellyseerr: JellyseerrConfig,
  netdata: NetdataConfig,
  portainer: PortainerConfig,
  qbittorrent: QBittorrentConfig,
  rss: RssConfig,
  sabnzbd: SabnzbdConfig,
  search: SearchConfig,
  twitch: TwitchConfig,
  weather: WeatherConfig,
  image: ImageConfig,
};

export const WidgetForm: React.FC<FormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  onDelete,
  isEditing,
  activeTab = 'configuration',
  selectedType
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [iconUrl, setIconUrl] = useState(initialData?.iconUrl || '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<Record<string, any>>(initialData?.config || {});
  const [integrationId, setIntegrationId] = useState(initialData?.integrationId || '');

  const widgetType = selectedType || initialData?.widgetType || 'clock';
  const { integrations } = useIntegrationStore();


  // Allow all integrations to be selectable, as requested by user
  const availableIntegrations = integrations;

  // Link integration when selected
  useEffect(() => {
    if (integrationId) {
      const integration = integrations.find(i => i.id === integrationId);
      if (integration) {
        // Pre-fill config from integration if needed, or just link
        // For now we just link the ID. The store handles auto-linking usually, 
        // but explicit selection is better.
      }
    }
  }, [integrationId, integrations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name || widgetType, // Fallback name
      iconUrl,
      type: 'widget',
      widgetType,
      config,
      integrationId: integrationId || undefined,
      // Default dimensions, can be overridden by config if needed or handled by parent
      w: initialData?.w || 1, 
      h: initialData?.h || 1
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const ConfigComponent = CONFIG_COMPONENTS[widgetType];

  const getCurrentStateObject = () => ({
    name,
    type: 'widget',
    widgetType,
    iconUrl,
    integrationId: integrationId || undefined,
    config,
    w: initialData?.w || 1,
    h: initialData?.h || 1
  });



  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          <div style={{ display: activeTab === 'configuration' ? 'block' : 'none' }}>
             <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
              <label className={styles.label}>Name</label>
              <input 
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Widget Name"
              />
            </div>
             {/* Integration Selection */}
             {availableIntegrations.length > 0 && (
               <div className={styles.section}>
                 <h3 className={styles.sectionTitle}>Integration</h3>
                 <div className={styles.formGroup}>
                    <label className={styles.label}>Select Integration</label>
                    <select
                      className={styles.select}
                      value={integrationId}
                      onChange={(e) => setIntegrationId(e.target.value)}
                    >
                      <option value="">None (Configure Manually)</option>
                      {availableIntegrations.map(int => (
                        <option key={int.id} value={int.id}>
                          {int.name || int.config.url || 'Unnamed Integration'}
                        </option>
                      ))}
                    </select>
                 </div>
               </div>
             )}

             {ConfigComponent && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Widget Settings</h3>
                <ConfigComponent 
                  config={config} 
                  onChange={handleConfigChange}
                  styles={styles}
                />
              </div>
            )}
          </div>

          <div style={{ display: activeTab === 'appearance' ? 'block' : 'none' }}>


            <div className={styles.formGroup}>
              <label className={styles.label}>Icon</label>
              <IconSelector 
                iconUrl={iconUrl} 
                onIconSelect={setIconUrl} 
              />
            </div>
          </div>


          <YamlEditorTab 
            isActive={activeTab === 'yaml'}
            currentState={getCurrentStateObject()}
            onUpdate={(parsed) => {
              if (typeof parsed.name === 'string') setName(parsed.name);
              if (typeof parsed.iconUrl === 'string') setIconUrl(parsed.iconUrl);
              if (typeof parsed.integrationId === 'string') setIntegrationId(parsed.integrationId);
              // lodash isEqual logic was removed from import, but we can re-add it or just blindly set
              if (parsed.config && typeof parsed.config === 'object') setConfig(parsed.config as Record<string, unknown>);
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formStyles={styles as any}
          />
        </div>

        <div className={styles.actions}>
          {isEditing && onDelete && (
            <button 
              type="button" 
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={onDelete}
            >
              Delete
            </button>
          )}



          <button 
            type="button" 
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            {isEditing ? 'Save Changes' : 'Add Widget'}
          </button>
        </div>
      </form>
    </div>
  );
};
