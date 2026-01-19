import React from 'react';
import { WeatherData, WeatherWidgetConfig } from '../types';
import { getWeatherIcon, getWeatherDescription } from '../utils';

interface WeeklyForecastVariationProps {
  weather: WeatherData;
  config?: WeatherWidgetConfig;
}

export const WeeklyForecastVariation: React.FC<WeeklyForecastVariationProps> = ({ weather, config }) => {
  const unitSymbol = config?.unit === 'imperial' ? '°F' : '°C';
  const IconComponent = getWeatherIcon(weather.current.weather_code);

  if (!weather.daily) return null;

  // Show next 5 days
  const nextDays = weather.daily.time.slice(0, 5);

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
            {nextDays.map((time, i) => {
                const date = new Date(time);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const DailyIcon = getWeatherIcon(weather.daily!.weather_code[i]);
                return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span className="font-mono text-xs text-muted">{dayName}</span>
                        <DailyIcon size={16} />
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                                <span className="font-mono text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(weather.daily!.temperature_2m_max[i])}°</span>
                                <span className="font-mono text-[10px] text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(weather.daily!.temperature_2m_min[i])}°</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};
