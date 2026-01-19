"use client";

import React, { useState, useEffect } from 'react';
import { WeatherData, WeatherWidgetProps } from './types';
import { CurrentWeatherVariation } from './variations/CurrentWeatherVariation';
import { DailyForecastVariation } from './variations/DailyForecastVariation';
import { WeeklyForecastVariation } from './variations/WeeklyForecastVariation';
import { useSettingsStore } from '@/store/useSettingsStore';
import { fetchWeather } from '@/services/weather';

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ config }) => {
  const { settings } = useSettingsStore();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      const appTempUnit = settings?.display?.temperatureUnit === 'F' ? 'imperial' : 'metric';
      const unit = config?.unit ?? appTempUnit;
      const view = config?.view || 'current';
      
      // Prefer widget's cityData, then legacy location string, then app settings
      const cityData = config?.cityData || settings?.display?.city;
      const legacyLocation = config?.location;

      try {
        const data = await fetchWeather({
          cityData,
          location: legacyLocation,
          apiKey: config?.apiKey,
          unit,
          view,
        });
        setWeather(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch weather:', err);
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
    const timer = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [config, settings]);

  if (loading) {
    return (
      <div className="widget-weather" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-mono text-muted">Loading...</p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="widget-weather" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-mono text-muted">{error || 'No Data'}</p>
      </div>
    );
  }

  const view = config?.view || 'current';

  if (view === 'daily') {
    return <DailyForecastVariation weather={weather} config={config} />;
  }

  if (view === 'weekly') {
    return <WeeklyForecastVariation weather={weather} config={config} />;
  }

  return <CurrentWeatherVariation weather={weather} config={config} />;
};
