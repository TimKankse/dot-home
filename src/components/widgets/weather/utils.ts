import { Sun, CloudSun, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning, Cloud } from 'lucide-react';

// Helper to map OWM codes to WMO codes (used by existing icon logic)
export const mapOwmCodeToWmo = (owmId: number) => {
    // https://openweathermap.org/weather-conditions
    if (owmId === 800) return 0; // Clear
    if (owmId >= 801 && owmId <= 804) return 1; // Clouds
    if (owmId >= 200 && owmId <= 232) return 95; // Thunderstorm
    if (owmId >= 300 && owmId <= 321) return 51; // Drizzle
    if (owmId >= 500 && owmId <= 531) return 61; // Rain
    if (owmId >= 600 && owmId <= 622) return 71; // Snow
    if (owmId >= 701 && owmId <= 781) return 45; // Atmosphere (Fog etc)
    return 0;
};

export const getWeatherIcon = (code: number) => {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return Sun; // Clear sky
  if (code >= 1 && code <= 3) return CloudSun; // Partly cloudy
  if (code >= 45 && code <= 48) return CloudFog; // Fog
  if (code >= 51 && code <= 55) return CloudDrizzle; // Drizzle
  if (code >= 61 && code <= 67) return CloudRain; // Rain
  if (code >= 71 && code <= 77) return Snowflake; // Snow
  if (code >= 80 && code <= 82) return CloudRain; // Rain showers
  if (code >= 85 && code <= 86) return Snowflake; // Snow showers
  if (code >= 95 && code <= 99) return CloudLightning; // Thunderstorm
  return Cloud; // Default
};

export const getWeatherDescription = (code: number) => {
  if (code === 0) return 'Clear Sky';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
};
