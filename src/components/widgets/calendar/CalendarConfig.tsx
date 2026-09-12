'use client';

import React from 'react';
import { WidgetConfigProps } from '@/components/item-editor/forms/types';
import type { CalendarWidgetConfig } from '@/types';
import { buildTabbedConfigForm } from '@/components/item-editor/forms/config-form-builder';
import type { TabDefinition } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';

const tabs: TabDefinition<CalendarWidgetConfig>[] = [
  {
    value: 'general',
    label: 'General',
    fields: [
      { 
        type: 'select', 
        key: 'weekStart', 
        label: 'Week Start', 
        options: [
          { value: 'sunday', label: 'Sunday' },
          { value: 'monday', label: 'Monday' }
        ],
        fullWidth: true
      },
      { 
        type: 'select', 
        key: 'defaultView', 
        label: 'Default View', 
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'monthly', label: 'Monthly' }
        ],
        fullWidth: true
      },
      { 
        type: 'urlList', 
        key: 'icalUrls', 
        label: 'iCal URLs', 
        addLabel: 'Add iCal URL',
        placeholder: 'https://...',
        legacySingleKey: 'icalUrl'
      }
    ]
  },
  {
    value: 'arr',
    label: '*arr Stack',
    sections: [
      {
        title: 'Radarr (Movies)',
        fields: [
          { 
            type: 'custom',
            key: 'radarrIntegrationId',
            label: 'Connection',
            render: ({ config, onChange, styles }) => (
              <div key="radarrIntegrationId" className={styles.formGroup}>
                <label className={styles.label}>Connection</label>
                <IntegrationSelect
                  type="radarr"
                  value={config.radarrIntegrationId}
                  onChange={(id) => onChange('radarrIntegrationId', id)}
                  placeholder="Select Radarr integration..."
                />
              </div>
            ),
          }
        ]
      },
      {
        title: 'Sonarr (TV)',
        fields: [
          { 
            type: 'custom',
            key: 'sonarrIntegrationId',
            label: 'Connection',
            render: ({ config, onChange, styles }) => (
              <div key="sonarrIntegrationId" className={styles.formGroup}>
                <label className={styles.label}>Connection</label>
                <IntegrationSelect
                  type="sonarr"
                  value={config.sonarrIntegrationId}
                  onChange={(id) => onChange('sonarrIntegrationId', id)}
                  placeholder="Select Sonarr integration..."
                />
              </div>
            ),
          }
        ]
      }
    ]
  }
];

export const CalendarConfig: React.FC<WidgetConfigProps<CalendarWidgetConfig>> = buildTabbedConfigForm(tabs);
