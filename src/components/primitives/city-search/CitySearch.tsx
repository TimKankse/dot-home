'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import type { CityData } from '@/types';
import styles from './CitySearch.module.css';

interface GeocodingResult {
  name: string;
  country: string;
  admin1?: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

interface CitySearchProps {
  value?: CityData;
  onChange: (city: CityData | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CitySearch: React.FC<CitySearchProps> = ({
  value,
  onChange,
  placeholder = 'Search city...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced city search using Open-Meteo Geocoding API
  const searchCities = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          setResults(data.results.map((r: GeocodingResult & { timezone?: string }) => ({
            name: r.name,
            country: r.country,
            admin1: r.admin1,
            timezone: r.timezone || 'UTC',
            latitude: r.latitude,
            longitude: r.longitude,
          })));
        } else {
          setResults([]);
        }
      }
    } catch (error) {
      console.error('City search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCities(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchCities]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: GeocodingResult) => {
    const cityData: CityData = {
      name: result.name,
      country: result.country,
      admin1: result.admin1,
      timezone: result.timezone,
      latitude: result.latitude,
      longitude: result.longitude,
      abbreviation: result.name.substring(0, 3).toUpperCase(),
    };
    onChange(cityData);
    setIsOpen(false);
    setSearchTerm('');
    setResults([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      if (value) {
        // If a city is selected, clicking opens dropdown to search for a new one
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else {
        setIsOpen(!isOpen);
      }
    }
  };

  const formatCityDetail = (city: { admin1?: string; country: string }) => {
    return city.admin1 ? `${city.admin1}, ${city.country}` : city.country;
  };

  return (
    <div 
      className={`${styles.container} ${disabled ? styles.disabled : ''}`} 
      ref={containerRef}
    >
      <div 
        className={`${styles.trigger} ${isOpen ? styles.active : ''}`}
        onClick={handleTriggerClick}
      >
        <span className={styles.icon}>
          <MapPin size={14} />
        </span>
        
        {value ? (
          <>
            <div className={styles.cityInfo}>
              <span className={styles.cityName}>{value.name}</span>
              <span className={styles.cityDetail}>{formatCityDetail(value)}</span>
            </div>
            {!disabled && (
              <button 
                className={styles.clearBtn}
                onClick={handleClear}
                title="Clear city"
              >
                <X size={14} />
              </button>
            )}
          </>
        ) : (
          <span className={styles.value} style={{ color: 'var(--text-dim)' }}>
            {placeholder}
          </span>
        )}
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Search city..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
          <div className={styles.optionsList}>
            {isSearching ? (
              <div className={styles.loadingState}>
                <Loader2 size={14} className={styles.spinner} />
                Searching...
              </div>
            ) : results.length > 0 ? (
              results.map((result, index) => (
                <div
                  key={`${result.name}-${result.latitude}-${index}`}
                  className={styles.option}
                  onClick={() => handleSelect(result)}
                >
                  <MapPin size={12} />
                  <div className={styles.optionInfo}>
                    <span className={styles.optionName}>{result.name}</span>
                    <span className={styles.optionDetail}>{formatCityDetail(result)}</span>
                  </div>
                </div>
              ))
            ) : searchTerm.length >= 2 ? (
              <div className={styles.noResults}>No cities found</div>
            ) : (
              <div className={styles.noResults}>Type to search...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
