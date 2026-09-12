"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FormProps } from '../types';
import styles from '../ItemEditorDialog.module.css';
import { IconSelector } from '../../ui/IconSelector';
import { Input } from '../../primitives/input';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import { SyncConfigToggle } from '../../widgets/SyncConfigToggle';
import { FormErrorBoundary } from '../FormErrorBoundary';
import type { WidgetConfigProps, WidgetConfigValue } from './types';
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
import { SectionConfig } from '@/components/widgets/section/SectionConfig';

const CONFIG_COMPONENTS: Record<string, React.ComponentType<WidgetConfigProps>> = {
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
  section: SectionConfig,
};

import { getMinDimensions } from '@/constants/widget-definitions';
import { redactSensitiveFields } from '@/utils/sensitive-config';

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
  const [config, setConfig] = useState<Record<string, unknown>>(
    () => ({ ...(initialData?.config || {}) }),
  );
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(
    initialData?.integrationId || '',
  );
  
  // Track last synced integration to avoid re-syncing on every render
  const lastSyncedIntegrationId = useRef<string | null>(null);
  const [syncConfig, setSyncConfig] = useState(initialData?.syncConfig ?? true);

  const widgetType = selectedType || initialData?.widgetType || 'clock';
  const { integrations } = useIntegrationStore();
  const resolvedConfig = useMemo<Record<string, unknown>>(
    () => (
      selectedIntegrationId
        ? { ...config, integrationId: selectedIntegrationId }
        : config
    ),
    [config, selectedIntegrationId],
  );

  useEffect(() => {
    onValidityChange?.(true);
  }, [onValidityChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalIntegrationId = selectedIntegrationId || '';
    const finalConfig = { ...config };

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
      // Preserve an explicit empty string so the save route can distinguish an
      // intentional disconnect from an older client omitting the field.
      integrationId: finalIntegrationId,
      syncConfig,
      w: finalW, 
      h: finalH
    });
  };

  const handleConfigChange = (key: string, value: WidgetConfigValue) => {
    if (key === 'integrationId') {
      const nextIntegrationId = typeof value === 'string' ? value : '';
      setSelectedIntegrationId(nextIntegrationId);

      if (!nextIntegrationId) {
        lastSyncedIntegrationId.current = '';
        return;
      }

      if (lastSyncedIntegrationId.current === nextIntegrationId) {
        return;
      }

      const integration = integrations.find((candidate) => candidate.id === nextIntegrationId);
      lastSyncedIntegrationId.current = nextIntegrationId;

      if (integration?.config) {
        setConfig((prev) => ({
          ...prev,
          ...redactSensitiveFields(
            integration.config as Record<string, unknown>,
            'omit',
          ),
        }));
      }
      return;
    }

    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const ConfigComponent = CONFIG_COMPONENTS[widgetType];

  return (
    <div className={styles.formContainer}>
      <form id={formId} onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          <div style={{ display: activeTab === 'configuration' ? 'block' : 'none' }}>
            <FormErrorBoundary sectionName="Widget Configuration">
             <div className={styles.formGroup} style={{ marginBottom: '20px' }}>
              <label className={styles.label}>Name</label>
              <Input
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
                  config={resolvedConfig}
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

        </div>

      </form>
    </div>
  );
};
