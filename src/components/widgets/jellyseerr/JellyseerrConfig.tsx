'use client';

import React from 'react';
import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { JellyseerrWidgetConfig } from '@/types';

export const JellyseerrConfig = buildConfigForm<JellyseerrWidgetConfig>([
  { 
    type: 'custom', 
    key: 'integrationId', 
    label: 'Connection',
    render: ({ config, onChange, styles }) => (
      <div key="integrationId" className={styles.fieldGroup}>
        <label className={styles.label}>Connection</label>
        <IntegrationSelect
          type="jellyseerr"
          value={config.integrationId}
          onChange={(id) => onChange('integrationId', id)}
          placeholder="Select Jellyseerr integration..."
        />
      </div>
    )
  },
  { 
    type: 'input', 
    key: 'url', 
    label: 'URL', 
    placeholder: 'http://...',
    condition: (c) => !c.integrationId
  },
  { 
    type: 'input', 
    key: 'apiKey', 
    label: 'API Key', 
    inputType: 'password',
    placeholder: 'API Key',
    condition: (c) => !c.integrationId
  }
]);
