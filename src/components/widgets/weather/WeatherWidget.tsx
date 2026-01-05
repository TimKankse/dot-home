"use client";

import React, { useState, useEffect } from 'react';
import { WeatherData, WeatherWidgetProps } from './types';
import { mapOwmCodeToWmo } from './utils';
import { CurrentWeatherVariation } from './variations/CurrentWeatherVariation';
import { DailyForecastVariation } from './variations/DailyForecastVariation';
import { WeeklyForecastVariation } from './variations/WeeklyForecastVariation';
import { useSettingsStore } from '@/store/useSettingsStore';

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ config }) => {
  const { settings } = useSettingsStore();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      const unit = config?.unit || 'metric';
      const view = config?.view || 'current';
      const isImperial = unit === 'imperial';
      
      // Use widget config location, or fallback to global settings location
      const location = config?.location || settings?.display?.location;

      // If no API key is provided, use Open-Meteo (Free)
      if (!config?.apiKey) {
        try {
            let lat = 59.3293;
            let lon = 18.0686;
            
            // If we have a location, try to geocode it
            if (location) {
                try {
                    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location as string)}&count=1&language=en&format=json`);
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        if (geoData.results && geoData.results.length > 0) {
                            lat = geoData.results[0].latitude;
                            lon = geoData.results[0].longitude;
                        }
                    }
                } catch (e) {
                    console.warn('Geocoding failed, falling back to default', e);
                }
            }

            let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
            
            if (isImperial) {
              url += '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch';
            }

            if (view === 'daily') {
              // "Daily" view -> Next 24h hourly forecast
              url += '&hourly=temperature_2m,weather_code&forecast_days=2';
            } else if (view === 'weekly') {
              // "Weekly" view -> 7 day daily forecast
              url += '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7';
            }

            const response = await fetch(url);
            const data = await response.json();
            setWeather(data);
            setError(null);
        } catch (error) {
            console.error('Failed to fetch weather:', error);
            setError('Failed to load');
        } finally {
            setLoading(false);
        }
        return;
      }

      // If API Key is present, use OpenWeatherMap
      try {
        // OpenWeatherMap API
        // Current Weather
        const currentRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location as string)}&units=${unit}&appid=${config.apiKey}`
        );
        
        if (!currentRes.ok) throw new Error('Failed to fetch weather');
        const currentData = await currentRes.json();

        const weatherData: WeatherData = {
            current: {
                temperature_2m: currentData.main.temp,
                weather_code: mapOwmCodeToWmo(currentData.weather[0].id)
            }
        };

        if (view === 'daily' || view === 'weekly') {
            const forecastRes = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location as string)}&units=${unit}&appid=${config.apiKey}`
            );
            
            if (forecastRes.ok) {
                const forecastData = await forecastRes.json();
                
                if (view === 'daily') {
                    // Map 3-hour forecast to "hourly" structure (next 8 items = 24h)
                    weatherData.hourly = {
                        time: forecastData.list.slice(0, 8).map((item: { dt_txt: string }) => item.dt_txt),
                        temperature_2m: forecastData.list.slice(0, 8).map((item: { main: { temp: number } }) => item.main.temp),
                        weather_code: forecastData.list.slice(0, 8).map((item: { weather: Array<{ id: number }> }) => mapOwmCodeToWmo(item.weather[0].id))
                    };
                } else if (view === 'weekly') {
                    // Aggregate 5-day forecast to daily high/low
                    // OWM returns 5 days in 3h steps.
                    const dailyMap = new Map<string, { min: number, max: number, code: number, count: number }>();
                    
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    forecastData.list.forEach((item: any) => {
                        const date = item.dt_txt.split(' ')[0];
                        const temp = item.main.temp;
                        const code = mapOwmCodeToWmo(item.weather[0].id);
                        
                        if (!dailyMap.has(date)) {
                            dailyMap.set(date, { min: temp, max: temp, code: code, count: 1 });
                        } else {
                            const entry = dailyMap.get(date)!;
                            entry.min = Math.min(entry.min, temp);
                            entry.max = Math.max(entry.max, temp);
                            // Simple logic: take the code that appears most often or just the midday one. 
                            // Let's just keep the first one for simplicity or maybe the one at 12:00 if possible.
                            // For now, first one is fine.
                        }
                    });

                    const times = Array.from(dailyMap.keys());
                    const maxs = Array.from(dailyMap.values()).map(v => v.max);
                    const mins = Array.from(dailyMap.values()).map(v => v.min);
                    const codes = Array.from(dailyMap.values()).map(v => v.code);

                    weatherData.daily = {
                        time: times,
                        temperature_2m_max: maxs,
                        temperature_2m_min: mins,
                        weather_code: codes
                    };
                }
            }
        }
        
        setWeather(weatherData);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch weather:', error);
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const timer = setInterval(fetchWeather, 30 * 60 * 1000);
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
