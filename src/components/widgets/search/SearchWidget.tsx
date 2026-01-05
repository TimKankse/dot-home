"use client";

import React, { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';
import styles from './SearchWidget.module.css';
import { DragHandles } from '../../ui/DragHandles';

import { WidgetConfig } from '@/types/widget';

interface SearchWidgetProps {
  isEditing?: boolean;
  config?: WidgetConfig;
}

const DEFAULT_SEARCH = 'https://www.google.com/search?q=';
const DDG_SEARCH = 'https://duckduckgo.com/?q=';

export const SearchWidget: React.FC<SearchWidgetProps> = ({ isEditing = false, config }) => {
  const [query, setQuery] = useState(config?.defaultQuery as string || '');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const baseUrl = (config?.searchEngineUrl as string) || DEFAULT_SEARCH;
    let searchUrl = baseUrl + encodeURIComponent(query);
    
    // Check if the query contains a bang (starts with !)
    // We let DuckDuckGo handle the redirect for any bang
    if (query.trim().startsWith('!')) {
      searchUrl = DDG_SEARCH + encodeURIComponent(query);
    }

    window.open(searchUrl, '_blank');
    setQuery(config?.defaultQuery as string || '');
  };

  return (
    <div className={styles.widgetContainer}>
      {isEditing && <DragHandles />}
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or use !bangs..."
            className={`${styles.searchInput} ${isEditing ? 'nodrag' : ''}`}
            onKeyDown={(e) => {
                if (isEditing) {
                    e.stopPropagation();
                }
            }}
          />
          <Search className={styles.searchIcon} size={20} />
        </div>
      </form>
    </div>
  );
};
