import React from 'react';

interface SearchConfigProps {
  config: Record<string, any>;
  onChange: (key: string, value: any) => void;
  styles: Record<string, string>;
}

const SEARCH_ENGINES = [
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=' },
  { name: 'Custom', url: '' },
];

export const SearchConfig: React.FC<SearchConfigProps> = ({ config, onChange, styles }) => {
  const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUrl = e.target.value;
    onChange('searchEngineUrl', selectedUrl);
  };

  const isCustom = !SEARCH_ENGINES.some(e => e.url === config.searchEngineUrl && e.name !== 'Custom');

  return (
    <>
      <div className={styles.formGroup}>
        <label className={styles.label}>Search Engine</label>
        <select
          className={styles.select}
          value={isCustom ? '' : config.searchEngineUrl || SEARCH_ENGINES[0].url}
          onChange={handleEngineChange}
        >
          {SEARCH_ENGINES.filter(e => e.name !== 'Custom').map((engine) => (
            <option key={engine.name} value={engine.url}>
              {engine.name}
            </option>
          ))}
          <option value="">Custom</option>
        </select>
      </div>

      {isCustom && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Custom Search URL</label>
          <input
            type="text"
            className={styles.input}
            value={config.searchEngineUrl || ''}
            onChange={(e) => onChange('searchEngineUrl', e.target.value)}
            placeholder="https://example.com/search?q="
          />
          <p className={styles.helpText}>Ensure the URL ends with the query parameter (e.g., ?q=)</p>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>Default Query</label>
        <input
          type="text"
          className={styles.input}
          value={config.defaultQuery || ''}
          onChange={(e) => onChange('defaultQuery', e.target.value)}
          placeholder="Optional default text..."
        />
      </div>
    </>
  );
};
