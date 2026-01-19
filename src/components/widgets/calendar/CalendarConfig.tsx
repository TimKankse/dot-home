'use client';

import React from 'react';
import { WidgetConfigProps } from '@/components/item-editor/forms/types';
import type { CalendarWidgetConfig } from '@/types';
import { buildTabbedConfigForm } from '@/components/item-editor/forms/config-form-builder';
import type { TabDefinition } from '@/components/item-editor/forms/config-form-builder';

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
            type: 'input', 
            key: 'radarrUrl', 
            label: 'URL', 
            placeholder: 'http://localhost:7878' 
          },
          { 
            type: 'input', 
            key: 'radarrApiKey', 
            label: 'API Key', 
            inputType: 'password',
            placeholder: 'Radarr API Key' 
          }
        ]
      },
      {
        title: 'Sonarr (TV)',
        fields: [
          { 
            type: 'input', 
            key: 'sonarrUrl', 
            label: 'URL', 
            placeholder: 'http://localhost:8989' 
          },
          { 
            type: 'input', 
            key: 'sonarrApiKey', 
            label: 'API Key', 
            inputType: 'password',
            placeholder: 'Sonarr API Key' 
          }
        ]
      }
    ]
  }
];

export const CalendarConfig: React.FC<WidgetConfigProps<CalendarWidgetConfig>> = buildTabbedConfigForm(tabs);
