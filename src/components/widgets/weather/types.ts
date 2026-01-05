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

export interface WeatherWidgetConfig {
  location?: string;
  apiKey?: string;
  unit?: 'metric' | 'imperial';
  view?: 'current' | 'daily' | 'weekly';
}

export interface WeatherWidgetProps {
  config?: WeatherWidgetConfig;
}
