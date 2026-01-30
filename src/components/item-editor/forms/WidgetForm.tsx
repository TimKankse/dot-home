"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  
  // Single source of truth: config.integrationId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<Record<string, any>>(() => {
    const baseConfig = initialData?.config || {};
    // Inject top-level integrationId into config for widget components
    if (initialData?.integrationId) {
      return {
        ...baseConfig,
        integrationId: initialData.integrationId
      };
    }
    return baseConfig;
  });
  
  // Track last synced integration to avoid re-syncing on every render
  const lastSyncedIntegrationId = useRef<string | null>(null);
  const [syncConfig, setSyncConfig] = useState(initialData?.syncConfig ?? true);

  const widgetType = selectedType || initialData?.widgetType || 'clock';
  const { integrations } = useIntegrationStore();

  const availableIntegrations = integrations;

  // Sync integration config ONLY when integrationId changes to a NEW non-empty value
  useEffect(() => {
    const currentIntegrationId = config.integrationId || '';
    
    // Skip if: no integration selected, or we already synced this ID
    if (!currentIntegrationId || lastSyncedIntegrationId.current === currentIntegrationId) {
      // If cleared, update tracking but don't sync
      if (!currentIntegrationId) {
        lastSyncedIntegrationId.current = '';
      }
      return;
    }
    
    const integration = integrations.find(i => i.id === currentIntegrationId);
    if (integration && integration.config) {
      // Mark as synced BEFORE updating to prevent loops
      lastSyncedIntegrationId.current = currentIntegrationId;
      
      setConfig(prev => ({
        ...prev,
        ...integration.config,
        integrationId: currentIntegrationId
      }));
    }
  }, [config.integrationId, integrations]);

  useEffect(() => {
    onValidityChange?.(true);
  }, [onValidityChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Extract integrationId from config (single source of truth)
    const finalIntegrationId = config.integrationId || '';
    
    // Remove integrationId from config blob to avoid duplication
    const finalConfig = { ...config };
    delete finalConfig.integrationId;

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

  const getCurrentStateObject = () => {
    // Create a clean config without integrationId (it goes at top level)
    const cleanConfig = { ...config };
    const effectiveIntegrationId = cleanConfig.integrationId || '';
    delete cleanConfig.integrationId;
    
    return {
      name,
      type: 'widget',
      widgetType,
      iconUrl,
      integrationId: effectiveIntegrationId || undefined,
      syncConfig,
      config: cleanConfig,
      w: initialData?.w || 1,
      h: initialData?.h || 1
    };
  };



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
              // Handle integrationId from YAML - update config.integrationId (single source of truth)
              if ('integrationId' in parsed) {
                const rawId = parsed.integrationId;
                const newId = typeof rawId === 'string' ? rawId : '';
                setConfig(prev => ({
                  ...prev,
                  integrationId: newId || undefined
                }));
              }
              if (parsed.config && typeof parsed.config === 'object') {
                // Merge YAML config
                const yamlConfig = parsed.config as Record<string, unknown>;
                setConfig(prev => ({
                  ...prev,
                  ...yamlConfig
                }));
              }
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formStyles={styles as any}
          />
        </div>

      </form>
    </div>
  );
};
