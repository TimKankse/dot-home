import React from 'react';

import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import { IntegrationSelect } from '@/components/primitives';
import type { RssWidgetConfig } from '@/types';

export const RssConfig = buildConfigForm<RssWidgetConfig>([
  {
    type: 'custom',
    key: 'integrationId',
    label: 'Private feed',
    render: ({ config, onChange, styles }) => (
      <div key="integrationId" className={styles.formGroup}>
        <label className={styles.label}>Private or authenticated feed</label>
        <IntegrationSelect
          type="rss"
          value={config.integrationId}
          onChange={(id) => onChange('integrationId', id)}
          placeholder="Select RSS integration..."
        />
      </div>
    ),
  },
  { 
    type: 'urlList', 
    key: 'feedUrls', 
    label: 'Public Feed URLs',
    addLabel: 'Add Public Feed URL',
    placeholder: 'https://...',
    legacySingleKey: 'feedUrl'
  },
  { 
    type: 'input', 
    key: 'maxItems', 
    label: 'Max Items', 
    inputType: 'number'
  },
  { 
    type: 'input', 
    key: 'refreshInterval', 
    label: 'Refresh Interval (minutes)', 
    inputType: 'number',
    min: 1
  },
  { 
    type: 'switch', 
    key: 'showThumbnail', 
    label: 'Show Thumbnail',
    defaultValue: true
  },
  { 
    type: 'switch', 
    key: 'showSummary', 
    label: 'Show Summary',
    defaultValue: true
  }
]);
