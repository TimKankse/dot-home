import { buildConfigForm } from '@/components/item-editor/forms/config-form-builder';
import type { RssWidgetConfig } from '@/types';

export const RssConfig = buildConfigForm<RssWidgetConfig>([
  { 
    type: 'urlList', 
    key: 'feedUrls', 
    label: 'Feed URLs', 
    addLabel: 'Add Feed URL',
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
