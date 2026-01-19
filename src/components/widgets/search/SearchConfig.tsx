import { buildConfigForm, type FieldDefinition } from '@/components/item-editor/forms/config-form-builder';
import type { SearchWidgetConfig } from '@/types';

const SEARCH_ENGINES = [
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=' },
];

const fields: FieldDefinition<SearchWidgetConfig>[] = [
  { 
    type: 'select', 
    key: 'searchEngineUrl', 
    label: 'Search Engine', 
    options: [
      ...SEARCH_ENGINES.map(e => ({ value: e.url, label: e.name })),
      { value: '', label: 'Custom' }
    ],
    fullWidth: true
  },
  { 
    type: 'input', 
    key: 'searchEngineUrl', 
    label: 'Custom Search URL', 
    placeholder: 'https://example.com/search?q=',
    condition: (config) => {
      // Show custom input when value is empty or not in predefined list
      const isCustom = !SEARCH_ENGINES.some(e => e.url === config.searchEngineUrl);
      return !config.searchEngineUrl || isCustom;
    }
  },
  { 
    type: 'input', 
    key: 'defaultQuery', 
    label: 'Default Query', 
    placeholder: 'Optional default text...' 
  }
];

export const SearchConfig = buildConfigForm<SearchWidgetConfig>(fields);
