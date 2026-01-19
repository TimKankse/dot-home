import type { WeatherWidgetConfig } from '@/types';

export interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

// Re-export from centralized types for convenience
export type { WeatherWidgetConfig };

export interface WeatherWidgetProps {
  config?: WeatherWidgetConfig;
}
