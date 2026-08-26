'use client';

import React from 'react';
import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { JellyfinWidgetConfig } from '@/types';
import { LibrarySelector } from './config/LibrarySelector';

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
  // Widget-specific config - always shown
  { 
    type: 'toggle', 
    key: 'viewMode', 
    label: 'View Mode', 
    options: [
      { value: 'now-playing', label: 'Now Playing' },
      { value: 'libraries', label: 'Libraries' }
    ]
  },
  {
      type: 'custom',
      key: 'selectedLibraries',
      label: 'Visible Libraries',
      render: (props) => <LibrarySelector {...props} />,
      condition: (c) => c.viewMode === 'libraries'
  }
]);
