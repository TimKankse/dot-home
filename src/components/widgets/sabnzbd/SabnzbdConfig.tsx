'use client';

import React from 'react';
import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { SabnzbdWidgetConfig } from '@/types';

export const SabnzbdConfig = buildConfigForm<SabnzbdWidgetConfig>([
  { 
    type: 'custom', 
    key: 'integrationId', 
    label: 'Connection',
    render: ({ config, onChange, styles }) => (
      <div key="integrationId" className={styles.formGroup}>
        <label className={styles.label}>Connection</label>
        <IntegrationSelect
          type="sabnzbd"
          value={config.integrationId}
          onChange={(id) => onChange('integrationId', id)}
          placeholder="Select SABnzbd integration..."
        />
      </div>
    )
  }
]);
