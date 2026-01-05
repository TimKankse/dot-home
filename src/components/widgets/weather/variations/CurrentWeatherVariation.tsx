import React from 'react';
import { WeatherData, WeatherWidgetConfig } from '../types';
import { getWeatherIcon, getWeatherDescription } from '../utils';

interface CurrentWeatherVariationProps {
  weather: WeatherData;
  config?: WeatherWidgetConfig;
}

export const CurrentWeatherVariation: React.FC<CurrentWeatherVariationProps> = ({ weather, config }) => {
  const IconComponent = getWeatherIcon(weather.current.weather_code);
  const description = getWeatherDescription(weather.current.weather_code);
  const unitSymbol = config?.unit === 'imperial' ? '°F' : '°C';

  return (
    <div className="widget-weather" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="weather-icon">
        {React.createElement(IconComponent, { size: 48, style: { marginBottom: '8px', color: 'var(--text-main)' } })}
      </div>
      <h2 className="font-display text-xl">{Math.round(weather.current.temperature_2m)}{unitSymbol}</h2>
      <p className="font-mono text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '4px' }}>
        {description}<br />{config?.location || 'Stockholm'}
      </p>
    </div>
  );
};
