"use client";

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import styles from './DigitalClock.module.css';
import type { ClockWidgetConfig, CityData } from '@/types';
import { getCityById } from '@/constants/cities';

interface DigitalClockProps {
  config?: ClockWidgetConfig;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ config }) => {
  const { settings } = useSettingsStore();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial sync for timer
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!time) return null; // Avoid hydration mismatch

  // Get city data: prefer widget's cityData, then widget's city ID, then app settings
  const getEffectiveCityData = (): { name: string; abbreviation: string; timezone: string } | undefined => {
    // Custom cityData from widget config (searched via CitySearch)
    if (config?.cityData) {
      const name = config.cityData.name || '';
      return {
        name,
        abbreviation: config.cityData.abbreviation || name.substring(0, 3).toUpperCase() || 'UTC',
        timezone: config.cityData.timezone,
      };
    }
    
    // Preset city ID from widget config
    if (config?.city) {
      const presetCity = getCityById(config.city);
      if (presetCity) {
        return {
          name: presetCity.name,
          abbreviation: presetCity.abbreviation,
          timezone: presetCity.timezone,
        };
      }
    }
    
    // App settings city - check if it's a valid CityData object
    if (settings?.display?.city) {
      const appCity = settings.display.city;
      // Handle both CityData object and legacy string format
      if (typeof appCity === 'object' && appCity.timezone) {
        const name = appCity.name || '';
        return {
          name,
          abbreviation: appCity.abbreviation || name.substring(0, 3).toUpperCase() || 'UTC',
          timezone: appCity.timezone,
        };
      }
    }
    
    return undefined;
  };

  const cityData = getEffectiveCityData();
  const cityFormat = config?.cityFormat || 'long';
  
  // Determine timezone to use
  const effectiveTimezone = cityData?.timezone || settings?.display?.timezone || undefined;

  const formatTime = (date: Date) => {
    // Use browser locale since language setting was removed
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-GB';
    const is24Hour = settings?.display?.is24Hour ?? true;
    
    // Config takes precedence, otherwise global setting
    const use12Hour = config?.hour12 !== undefined ? config.hour12 : !is24Hour;

    const timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
      timeZone: effectiveTimezone === 'UTC' ? 'UTC' : effectiveTimezone // Handle explicit UTC or system
    });
    // Remove AM/PM if present (case insensitive) and trim whitespace
    return timeStr.replace(/\s*(am|pm)/i, '');
  };

  const formatDate = (date: Date) => {
    // Use browser locale since language setting was removed
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

    const options: Intl.DateTimeFormatOptions = {
        timeZone: effectiveTimezone === 'UTC' ? 'UTC' : effectiveTimezone
    };

    if (config?.dateFormat === 'long') {
      options.weekday = 'long';
      options.month = 'long';
      options.day = 'numeric';
    } else {
      options.weekday = 'short';
      options.month = 'short';
      options.day = 'numeric';
    }
    
    return date.toLocaleDateString(locale, options);
  };

  const getCityName = (): string | null => {
    if (!config?.showCityName || !cityData) return null;
    return cityFormat === 'short' ? cityData.abbreviation : cityData.name;
  };
    
  const justification = config?.justification || 'center';
  const alignItems = justification === 'left' ? 'flex-start' : justification === 'right' ? 'flex-end' : 'center';
  const textAlign = justification === 'left' ? 'left' : justification === 'right' ? 'right' : 'center';

  return (
    <div className={styles.container} style={{ alignItems }}>
      {getCityName() && (
        <p className={styles.date} style={{ textAlign }}>
          {getCityName()}
        </p>
      )}
      <h1 className={styles.time} style={{ textAlign }}>
        {formatTime(time)}
      </h1>
      {(config?.includeDate ?? true) && (
        <p className={styles.date} style={{ textAlign }}>
          {formatDate(time)}
        </p>
      )}
    </div>
  );
};
