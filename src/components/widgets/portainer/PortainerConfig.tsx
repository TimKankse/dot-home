'use client';

import React from 'react';
import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { PortainerWidgetConfig } from '@/types';

export const PortainerConfig = buildConfigForm<PortainerWidgetConfig>([
  { 
    type: 'custom', 
    key: 'integrationId', 
    label: 'Connection',
    render: ({ config, onChange, styles }) => (
      <div key="integrationId" className={styles.formGroup}>
        <label className={styles.label}>Connection</label>
        <IntegrationSelect
          type="portainer"
          value={config.integrationId}
          onChange={(id) => onChange('integrationId', id)}
          placeholder="Select Portainer integration..."
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
  },
  // Endpoint ID is widget-specific, always shown
  { 
    type: 'input', 
    key: 'endpointId', 
    label: 'Endpoint ID', 
    placeholder: '1' 
  }
]);
