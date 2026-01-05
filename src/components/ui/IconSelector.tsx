import React, { useRef, useState, useEffect } from 'react';
import styles from './IconSelector.module.css';
import { ALL_APP_ICONS, getAppIconUrl } from '@/utils/appIcons';

interface IconSelectorProps {
  iconUrl: string;
  onIconSelect: (url: string) => void;
  className?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ iconUrl, onIconSelect, className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize search term from iconUrl if present (for editing)
  useEffect(() => {
    // Only if we haven't typed anything yet
    if (iconUrl && !searchTerm) {
       // We don't set searchTerm here to avoid overriding user input, 
       // but maybe we should if we want to show what's selected?
       // The original code did: value={showIconSuggestions || iconSearchTerm !== '' ? iconSearchTerm : iconUrl}
    }
  }, [iconUrl]);

  return (
    <div className={`${styles.iconSelectorContainer} ${className || ''}`}>
      {iconUrl && (
        <div className={styles.iconPreview}>
          <img 
            src={iconUrl} 
            alt="Icon preview"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className={styles.iconInputWrapper} ref={dropdownRef}>
        <input 
          ref={inputRef}
          className={styles.input}
          value={showSuggestions || searchTerm !== '' ? searchTerm : iconUrl}
          onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);
            setShowSuggestions(value.length > 0);
            if (value.startsWith('http')) {
              onIconSelect(value);
            }
          }}
          onFocus={() => {
            if (iconUrl && !searchTerm) {
              setSearchTerm(iconUrl);
            }
            if (searchTerm) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              setShowSuggestions(false);
              if (!searchTerm) {
                onIconSelect('');
              }
            }, 200);
          }}
          placeholder="Search apps or paste CDN URL..."
        />
        
        {showSuggestions && searchTerm && (
          <div className={styles.autocompleteDropdown}>
            {ALL_APP_ICONS
              .filter(app => {
                const searchLower = searchTerm.toLowerCase();
                return app.name.toLowerCase().includes(searchLower);
              })
              .slice(0, 10)
              .map(app => {
                const appIconUrl = getAppIconUrl(app.filename);
                return (
                  <div
                    key={app.filename}
                    className={styles.autocompleteSuggestion}
                    onClick={() => {
                      onIconSelect(appIconUrl);
                      setSearchTerm('');
                      setShowSuggestions(false);
                    }}
                  >
                    <img
                      src={appIconUrl}
                      alt={app.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span>{app.name}</span>
                  </div>
                );
              })}
            
            {searchTerm.length >= 3 && 
             !ALL_APP_ICONS.some(app => 
               app.name.toLowerCase() === searchTerm.toLowerCase()
             ) && (
              <div
                key="dynamic-suggestion"
                className={styles.autocompleteSuggestion}
                onClick={() => {
                  const filename = searchTerm.toLowerCase().replace(/\s+/g, '-');
                  const dynamicIconUrl = getAppIconUrl(filename);
                  onIconSelect(dynamicIconUrl);
                  setSearchTerm('');
                  setShowSuggestions(false);
                }}
                style={{ borderTop: ALL_APP_ICONS.filter(app => {
                  const searchLower = searchTerm.toLowerCase();
                  return app.name.toLowerCase().includes(searchLower);
                }).length > 0 ? '1px solid var(--border)' : 'none' }}
              >
                <img
                  src={getAppIconUrl(searchTerm.toLowerCase().replace(/\s+/g, '-'))}
                  alt={searchTerm}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span>Try: {searchTerm.toLowerCase().replace(/\s+/g, '-')}</span>
              </div>
            )}
            
            {ALL_APP_ICONS.filter(app => {
              const searchLower = searchTerm.toLowerCase();
              return app.name.toLowerCase().includes(searchLower);
            }).length === 0 && searchTerm.length < 3 && (
              <div className={styles.autocompleteNoResults}>
                Type at least 3 characters to see suggestions.
              </div>
            )}
          </div>
        )}
        
        <div className={styles.helperText}>
          Type to search apps or paste CDN/image URL. Leave empty for auto-detect.
        </div>
      </div>
    </div>
  );
};
