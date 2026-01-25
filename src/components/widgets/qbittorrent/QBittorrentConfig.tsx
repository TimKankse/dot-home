'use client';

import React from 'react';
import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { QBittorrentWidgetConfig } from '@/types';

export const QBittorrentConfig = buildConfigForm<QBittorrentWidgetConfig>([
  { 
    type: 'custom', 
    key: 'integrationId', 
    label: 'Connection',
    render: ({ config, onChange, styles }) => (
      <div key="integrationId" className={styles.formGroup}>
        <label className={styles.label}>Connection</label>
        <IntegrationSelect
          type="qbittorrent"
          value={config.integrationId}
          onChange={(id) => onChange('integrationId', id)}
          placeholder="Select qBittorrent integration..."
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
    key: 'username', 
    label: 'Username', 
    placeholder: 'admin',
    condition: (c) => !c.integrationId
  },
  { 
    type: 'input', 
    key: 'password', 
    label: 'Password', 
    inputType: 'password',
    placeholder: 'adminadmin',
    condition: (c) => !c.integrationId
  }
]);
