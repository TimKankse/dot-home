'use client';

import React from 'react';
import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { JellyfinWidgetConfig } from '@/types';

export const JellyfinConfig = buildConfigForm<JellyfinWidgetConfig>([
  // Integration selector at top
  { 
    type: 'custom', 
    key: 'integrationId', 
    label: 'Connection',
    render: ({ config, onChange, styles }) => (
      <div key="integrationId" className={styles.formGroup}>
        <label className={styles.label}>Connection</label>
        <IntegrationSelect
          type="jellyfin"
          value={config.integrationId}
          onChange={(id) => onChange('integrationId', id)}
          placeholder="Select Jellyfin integration..."
        />
      </div>
    )
  },
  // Connection fields - only shown when NOT using integration
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
  },
  { 
    type: 'input', 
    key: 'userId', 
    label: 'User ID (Optional)', 
    placeholder: 'Jellyfin User ID',
    condition: (c) => !c.integrationId
  },
  // Widget-specific config - always shown
  { 
    type: 'toggle', 
    key: 'viewMode', 
    label: 'View Mode', 
    options: [
      { value: 'now-playing', label: 'Now Playing' },
      { value: 'libraries', label: 'Libraries' }
    ]
  }
]);
