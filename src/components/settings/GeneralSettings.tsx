"use client";

import React, { useEffect, useRef } from 'react';
import { Globe, RefreshCw } from 'lucide-react';

import { useSettingsStore } from '@/store/useSettingsStore';
import { SearchableSelect } from '../primitives/searchable-select';
import { Select, Switch, ToggleGroup, Badge, CitySearch } from '../primitives';
import { TIMEZONES, CITIES, extractCityFromTimezone } from '@/constants/cities';
import type { CityData } from '@/types';
import styles from './SettingsDialog.module.css';

// Helper to run auto-detection logic
const runAutoDetection = (): { timezone: string; city: CityData } => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Find city from CITIES constant based on timezone
  const matchedCity = CITIES.find(c => c.timezone === timeZone);
  const cityName = matchedCity?.name || extractCityFromTimezone(timeZone);
  
  // Create CityData from timezone
  const cityData: CityData = {
    name: cityName,
    country: '', // Unknown from timezone
    timezone: timeZone,
    latitude: 0, // Unknown from timezone
    longitude: 0,
    abbreviation: matchedCity?.abbreviation || cityName.substring(0, 3).toUpperCase(),
  };
  
  return {
    timezone: timeZone,
    city: cityData
  };
};

export const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const hasRunAutoDetect = useRef(false);
  
  // Run auto-detection on mount if enabled (fixes issue where setting is true from DB but detection never ran)
  useEffect(() => {
    if (settings?.behavior?.autoDetectLocation && !hasRunAutoDetect.current) {
      hasRunAutoDetect.current = true;
      const detected = runAutoDetection();
      updateSettings(detected, 'display');
    }
  }, [settings?.behavior?.autoDetectLocation, updateSettings]);

  const handleCityChange = (city: CityData | undefined) => {
    updateSettings({ city }, 'display');
    // Also update timezone when city changes
    if (city?.timezone) {
      updateSettings({ timezone: city.timezone }, 'display');
    }
  };

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Location</div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Auto-Detect Location</span>
            <span className={styles.settingDesc}>Set timezone and city based on browser</span>
          </div>
          <Switch 
            checked={settings?.behavior?.autoDetectLocation ?? false}
            onCheckedChange={(checked) => {
              updateSettings({ autoDetectLocation: checked }, 'behavior');
              if (checked) {
                const detected = runAutoDetection();
                updateSettings(detected, 'display');
              }
            }}
          />
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Timezone</span>
            <span className={styles.settingDesc}>System timezone</span>
          </div>
          <div style={{ width: '240px' }}>
             <SearchableSelect
               options={TIMEZONES}
               value={settings?.display?.timezone || ''}
               onChange={(val) => updateSettings({ timezone: val }, 'display')}
               placeholder="Select timezone..."
               icon={<Globe size={14} />}
               disabled={settings?.behavior?.autoDetectLocation}
             />
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>City</span>
            <span className={styles.settingDesc}>Location for weather & display</span>
          </div>
          <div style={{ width: '240px' }}>
            <CitySearch
              value={settings?.display?.city}
              onChange={handleCityChange}
              placeholder="Search city..."
              disabled={settings?.behavior?.autoDetectLocation}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Behavior</div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Refresh Interval</span>
            <span className={styles.settingDesc}>Global widget refresh rate</span>
          </div>
          <div style={{ width: '140px' }}>
            <Select 
              value={(settings?.behavior?.refreshInterval ?? 10).toString()}
              onChange={(val) => updateSettings({ refreshInterval: parseInt(val) }, 'behavior')}
              icon={<RefreshCw size={14} />}
              options={[
                { value: '5', label: '5 mins' },
                { value: '10', label: '10 mins' },
                { value: '15', label: '15 mins' },
                { value: '30', label: '30 mins' },
                { value: '60', label: '1 hour' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Display</div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Clock Format</span>
            <span className={styles.settingDesc}>12h vs 24h time display</span>
          </div>
          <ToggleGroup
            value={settings?.display?.is24Hour ? '24h' : '12h'}
            onChange={(val) => updateSettings({ is24Hour: val === '24h' }, 'display')}
            options={[
              { value: '12h', label: '12h' },
              { value: '24h', label: '24h' },
            ]}
          />
        </div>

        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <span className={styles.settingLabel}>Temperature</span>
            <span className={styles.settingDesc}>Display units</span>
          </div>
          <ToggleGroup
            value={settings?.display?.temperatureUnit || 'C'}
            onChange={(val) => updateSettings({ temperatureUnit: val as 'C' | 'F' }, 'display')}
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
          />
        </div>
      </div>

    </>
  );
};
