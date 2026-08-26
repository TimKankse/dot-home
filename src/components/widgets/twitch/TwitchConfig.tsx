'use client';

import React from 'react';
import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { TwitchWidgetConfig } from '@/types';

export const TwitchConfig = buildConfigForm<TwitchWidgetConfig>([
  { 
    type: 'custom', 
    key: 'integrationId', 
    label: 'Connection',
    render: ({ config, onChange, styles }) => (
      <div key="integrationId" className={styles.formGroup}>
        <label className={styles.label}>Connection</label>
        <IntegrationSelect
          type="twitch"
          value={config.integrationId}
          onChange={(id) => onChange('integrationId', id)}
          placeholder="Select Twitch integration..."
        />
      </div>
    )
  },
  // Channels is widget-specific, always shown
  { 
    type: 'input', 
    key: 'channels', 
    label: 'Channels (comma separated)', 
    placeholder: 'channel1, channel2' 
  }
]);
