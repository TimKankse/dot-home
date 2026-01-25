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
  { 
    type: 'input', 
    key: 'clientId', 
    label: 'Client ID', 
    placeholder: 'Twitch Client ID',
    condition: (c) => !c.integrationId
  },
  { 
    type: 'input', 
    key: 'clientSecret', 
    label: 'Client Secret', 
    inputType: 'password',
    placeholder: 'Twitch Client Secret',
    condition: (c) => !c.integrationId
  },
  // Channels is widget-specific, always shown
  { 
    type: 'input', 
    key: 'channels', 
    label: 'Channels (comma separated)', 
    placeholder: 'channel1, channel2' 
  }
]);
