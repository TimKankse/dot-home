import React from 'react';
import { WeatherData, WeatherWidgetConfig } from '../types';
import { getWeatherIcon, getWeatherDescription } from '../utils';

interface DailyForecastVariationProps {
  weather: WeatherData;
  config?: WeatherWidgetConfig;
}

export const DailyForecastVariation: React.FC<DailyForecastVariationProps> = ({ weather, config }) => {
  const unitSymbol = config?.unit === 'imperial' ? '°F' : '°C';
  const IconComponent = getWeatherIcon(weather.current.weather_code);

  if (!weather.hourly) return null;

  // Filter out passed hours
  const now = new Date();
  
  // Find the index of the first future hour (or current hour)
  let startIndex = weather.hourly.time.findIndex(t => new Date(t).getTime() > now.getTime());
  
  // If we're at the end of the day/list, fallback to showing what we have or just the end
  if (startIndex === -1) startIndex = 0; 

  // Check interval between first two available points to guess density
  const t1 = new Date(weather.hourly.time[startIndex]).getTime();
  const t2 = new Date(weather.hourly.time[startIndex + 1] || t1 + 3600000).getTime();
  const intervalHours = (t2 - t1) / (1000 * 60 * 60);
  
  let step = 1;
  if (intervalHours < 2) {
      // Hourly data: Step by 3 to show next ~15 hours (3*5)
      step = 3;
  } else {
      // 3-hourly data: Step by 1 to show next ~15 hours (3*5)
      step = 1;
  }

  const nextIndices = [];
  for (let i = 0; i < 5; i++) {
      const idx = startIndex + (i * step);
      if (idx < weather.hourly.time.length) {
          nextIndices.push(idx);
      }
  }

  return (
    <div className="widget-weather" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {React.createElement(IconComponent, { size: 24 })}
                <span className="font-display text-lg">{Math.round(weather.current.temperature_2m)}{unitSymbol}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <span className="font-mono text-xs text-muted">{config?.cityData?.name || config?.location || 'Stockholm'}</span>
                <span className="font-mono text-[10px] text-muted">{getWeatherDescription(weather.current.weather_code)}</span>
            </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'flex-end' }}>
            {nextIndices.map((idx, i) => {
                const time = weather.hourly!.time[idx];
                const date = new Date(time);
                const hours = date.getHours().toString().padStart(2, '0');
                const HourlyIcon = getWeatherIcon(weather.hourly!.weather_code[idx]);
                return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span className="font-mono text-xs text-muted">{hours}</span>
                        <HourlyIcon size={16} />
                        <span className="font-mono text-xs">{Math.round(weather.hourly!.temperature_2m[idx])}°</span>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
