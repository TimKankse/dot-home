"use client";

import React, { useState, useEffect } from 'react';
import { FormProps } from '../types';
import styles from '../ItemEditorDialog.module.css';
import { IconSelector } from '../../ui/IconSelector';
import { Select } from '../../primitives/select';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import { YamlEditorTab } from './YamlEditorTab';
import { SyncConfigToggle } from '../../widgets/SyncConfigToggle';
import { FormErrorBoundary } from '../FormErrorBoundary';
import { CalendarConfig } from '@/components/widgets/calendar/CalendarConfig';
import { ClockConfig } from '@/components/widgets/clock/ClockConfig';
import { JellyfinConfig } from '@/components/widgets/jellyfin/JellyfinConfig';
import { JellyseerrConfig } from '@/components/widgets/jellyseerr/JellyseerrConfig';
import { NetdataConfig } from '@/components/widgets/netdata/NetdataConfig';

import { PortainerConfig } from '@/components/widgets/portainer/PortainerConfig';
import { QBittorrentConfig } from '@/components/widgets/qbittorrent/QBittorrentConfig';
import { RssConfig } from '@/components/widgets/rss/RssConfig';
import { SabnzbdConfig } from '@/components/widgets/sabnzbd/SabnzbdConfig';
import { TwitchConfig } from '@/components/widgets/twitch/TwitchConfig';
import { WeatherConfig } from '@/components/widgets/weather/WeatherConfig';

import { SearchConfig } from '@/components/widgets/search/SearchConfig';
import { ImageConfig } from '@/components/widgets/image/ImageConfig';



const CONFIG_COMPONENTS: Record<string, React.ComponentType<any>> = {
  calendar: CalendarConfig,
  clock: ClockConfig,
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

import { WIDGET_DEFINITIONS, getMinDimensions } from '@/constants/widget-definitions';

export const WidgetForm: React.FC<FormProps> = ({ 
  initialData, 
  onSubmit, 
  activeTab = 'configuration',
  selectedType,
  formId,
  onValidityChange
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [iconUrl, setIconUrl] = useState(initialData?.iconUrl || '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<Record<string, any>>(() => {
    const baseConfig = initialData?.config || {};
    // If we have a top-level integration ID, inject it into config so UI components see it immediately
    if (initialData?.integrationId) {
      return {
        ...baseConfig,
        integrationId: initialData.integrationId
      };
    }
    return baseConfig;
  });
  const [integrationId, setIntegrationId] = useState(initialData?.integrationId || '');
  const [syncConfig, setSyncConfig] = useState(initialData?.syncConfig ?? true);

  const widgetType = selectedType || initialData?.widgetType || 'clock';
  const { integrations } = useIntegrationStore();


  const availableIntegrations = integrations;

  useEffect(() => {
    // Determine the active integration ID (prefer config-level, fallback to form-level)
    // This handles both new widget-specific selectors and legacy/generic selections
    const targetIntegrationId = config.integrationId || integrationId;

    if (targetIntegrationId) {
      const integration = integrations.find(i => i.id === targetIntegrationId);
      if (integration && integration.config) {
        // When integration changes, propagate its configuration to the widget config
        // effectively pre-filling or syncing the connection details
        setConfig(prev => {
          // Check if we actually need to update to avoid infinite loops
          const hasChanges = Object.entries(integration.config).some(
            ([key, value]) => prev[key] !== value
          );

          if (!hasChanges) return prev;

          return {
            ...prev,
            ...integration.config,
            // Ensure we preserve the ID that triggered this
            integrationId: targetIntegrationId 
          };
        });
      }
    }
  }, [config.integrationId, integrationId, integrations]);

  useEffect(() => {
    onValidityChange?.(true);
  }, [onValidityChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Extract integrationId from config if present (e.g. from specific widget forms)
    // This supports the new pattern where widgets manage their own integration selection
    const configIntegrationId = config.integrationId; 
    
    // If we have an integrationId in the config, we want to lift it to the top level
    // and remove it from the config blob to avoid duplication/confusion
    const finalIntegrationId = configIntegrationId || integrationId;
    
    const finalConfig = { ...config };
    if (configIntegrationId) {
      delete finalConfig.integrationId;
    }

    // specific dimensions logic
    let finalW = initialData?.w;
    let finalH = initialData?.h;

    // If no initial dimensions (new widget), use defaults from definition
    if (!finalW || !finalH) {
      const { w, h } = getMinDimensions(widgetType, finalConfig);
      finalW = w;
      finalH = h;
    }

    onSubmit({
      name: name || widgetType, // Fallback name
      iconUrl,
      type: 'widget',
      widgetType,
      config: finalConfig,
      integrationId: finalIntegrationId || undefined,
      syncConfig,
      w: finalW, 
      h: finalH
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
    syncConfig,
    config,
    w: initialData?.w || 1,
    h: initialData?.h || 1
  });



  return (
    <div className={styles.formContainer}>
      <form id={formId} onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          <div style={{ display: activeTab === 'configuration' ? 'block' : 'none' }}>
            <FormErrorBoundary sectionName="Widget Configuration">
             <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
              <label className={styles.label}>Name</label>
              <input 
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Widget Name"
              />
            </div>
            {/* Generic integration selector removed in favor of widget-specific selectors */}

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

            <div className={styles.section} style={{ marginTop: '1rem' }}>
              <SyncConfigToggle
                value={syncConfig}
                onChange={setSyncConfig}
              />
            </div>
            </FormErrorBoundary>
          </div>

          <div style={{ display: activeTab === 'appearance' ? 'block' : 'none' }}>
            <FormErrorBoundary sectionName="Appearance Settings">


            <div className={styles.formGroup}>
              <label className={styles.label}>Icon</label>
              <IconSelector 
                iconUrl={iconUrl} 
                onIconSelect={setIconUrl} 
              />
            </div>
            </FormErrorBoundary>
          </div>


          <YamlEditorTab 
            isActive={activeTab === 'yaml'}
            currentState={getCurrentStateObject()}
            onUpdate={(parsed) => {
              if (typeof parsed.name === 'string') setName(parsed.name);
              if (typeof parsed.iconUrl === 'string') setIconUrl(parsed.iconUrl);
              if (typeof parsed.integrationId === 'string') setIntegrationId(parsed.integrationId);
              if (parsed.config && typeof parsed.config === 'object') setConfig(parsed.config as Record<string, unknown>);
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formStyles={styles as any}
          />
        </div>

      </form>
    </div>
  );
};
