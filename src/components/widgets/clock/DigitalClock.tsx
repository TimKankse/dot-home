"use client";

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import styles from './DigitalClock.module.css';

interface DigitalClockProps {
  config?: {
    justification?: 'left' | 'center' | 'right';
    hour12?: boolean;
    includeDate?: boolean;
    dateFormat?: 'short' | 'long';
  };
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ config }) => {
  const { settings } = useSettingsStore();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date()); // Initial set
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!time) return null; // Avoid hydration mismatch

  const formatTime = (date: Date) => {
    const locale = settings?.display?.language || 'en-GB';
    const timeZone = settings?.display?.timezone || undefined;
    const is24Hour = settings?.display?.is24Hour ?? true;
    
    // Config takes precedence, otherwise global setting
    const use12Hour = config?.hour12 !== undefined ? config.hour12 : !is24Hour;

    const timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: use12Hour,
      timeZone: timeZone === 'UTC' ? 'UTC' : timeZone // Handle explicit UTC or system
    });
    // Remove AM/PM if present (case insensitive) and trim whitespace
    return timeStr.replace(/\s*(am|pm)/i, '');
  };

  const formatDate = (date: Date) => {
    const locale = settings?.display?.language || 'en-US';
    const timeZone = settings?.display?.timezone || undefined;

    const options: Intl.DateTimeFormatOptions = {
        timeZone: timeZone === 'UTC' ? 'UTC' : timeZone
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
    
  const justification = config?.justification || 'center';
  const alignItems = justification === 'left' ? 'flex-start' : justification === 'right' ? 'flex-end' : 'center';
  const textAlign = justification === 'left' ? 'left' : justification === 'right' ? 'right' : 'center';


  return (
    <div className={styles.container} style={{ alignItems }}>
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
