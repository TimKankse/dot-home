import type { WeatherData } from '@/components/widgets/weather/types';
import type { CityData } from '@/types';
import { mapOwmCodeToWmo } from '@/components/widgets/weather/utils';

export interface WeatherFetchParams {
  location?: string; 
  cityData?: CityData;
  apiKey?: string;
  unit: 'metric' | 'imperial';
  view: 'current' | 'daily' | 'weekly';
}

interface GeocodingResult {
  results?: Array<{ latitude: number; longitude: number }>;
}

interface OpenMeteoResponse {
  current?: { temperature_2m: number; weather_code: number };
  daily?: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
  hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[] };
}

interface OWMCurrentResponse {
  main: { temp: number };
  weather: Array<{ id: number }>;
}

interface OWMForecastItem {
  dt_txt: string;
  main: { temp: number };
  weather: Array<{ id: number }>;
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
}

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number }> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    if (geoRes.ok) {
      const geoData: GeocodingResult = await geoRes.json();
      if (geoData.results?.[0]) {
        return { lat: geoData.results[0].latitude, lon: geoData.results[0].longitude };
      }
    }
  } catch (e) {
    console.warn('Geocoding failed, falling back to default', e);
  }
  return { lat: 59.3293, lon: 18.0686 }; // Default: Stockholm
}

async function resolveCoordinates(params: WeatherFetchParams): Promise<{ lat: number; lon: number }> {
  if (params.cityData?.latitude && params.cityData?.longitude) {
    return { lat: params.cityData.latitude, lon: params.cityData.longitude };
  }
  
  if (params.location) {
    return geocodeLocation(params.location);
  }
  return { lat: 59.3293, lon: 18.0686 };
}

export async function fetchOpenMeteoWeather(params: WeatherFetchParams): Promise<WeatherData> {
  const { view, unit } = params;
  const isImperial = unit === 'imperial';
  
  const { lat, lon } = await resolveCoordinates(params);

  let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  
  if (isImperial) {
    url += '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch';
  }

  if (view === 'daily') {
    url += '&hourly=temperature_2m,weather_code&forecast_days=2';
  } else if (view === 'weekly') {
    url += '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7';
  }

  const response = await fetch(url);
  const data: OpenMeteoResponse = await response.json();
  
  return {
    current: {
      temperature_2m: data.current?.temperature_2m ?? 0,
      weather_code: data.current?.weather_code ?? 0,
    },
    daily: data.daily,
    hourly: data.hourly,
  };
}

export async function fetchOWMWeather(params: WeatherFetchParams): Promise<WeatherData> {
  const { location, cityData, apiKey, view, unit } = params;
  
  // OWM requires a location string or city name
  const locationQuery = cityData?.name || location;
  
  if (!locationQuery || !apiKey) {
    throw new Error('Location and API key are required for OpenWeatherMap');
  }

  const currentRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationQuery)}&units=${unit}&appid=${apiKey}`
  );
  
  if (!currentRes.ok) throw new Error('Failed to fetch weather');
  const currentData: OWMCurrentResponse = await currentRes.json();

  const weatherData: WeatherData = {
    current: {
      temperature_2m: currentData.main.temp,
      weather_code: mapOwmCodeToWmo(currentData.weather[0].id),
    },
  };

  if (view === 'daily' || view === 'weekly') {
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(locationQuery)}&units=${unit}&appid=${apiKey}`
    );
    
    if (forecastRes.ok) {
      const forecastData: OWMForecastResponse = await forecastRes.json();
      
      if (view === 'daily') {
        weatherData.hourly = {
          time: forecastData.list.slice(0, 8).map(item => item.dt_txt),
          temperature_2m: forecastData.list.slice(0, 8).map(item => item.main.temp),
          weather_code: forecastData.list.slice(0, 8).map(item => mapOwmCodeToWmo(item.weather[0].id)),
        };
      } else if (view === 'weekly') {
        const dailyMap = new Map<string, { min: number; max: number; code: number }>();
        
        for (const item of forecastData.list) {
          const date = item.dt_txt.split(' ')[0];
          const temp = item.main.temp;
          const code = mapOwmCodeToWmo(item.weather[0].id);
          
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { min: temp, max: temp, code });
          } else {
            const entry = dailyMap.get(date)!;
            entry.min = Math.min(entry.min, temp);
            entry.max = Math.max(entry.max, temp);
          }
        }

        weatherData.daily = {
          time: Array.from(dailyMap.keys()),
          temperature_2m_max: Array.from(dailyMap.values()).map(v => v.max),
          temperature_2m_min: Array.from(dailyMap.values()).map(v => v.min),
          weather_code: Array.from(dailyMap.values()).map(v => v.code),
        };
      }
    }
  }
  
  return weatherData;
}

export async function fetchWeather(params: WeatherFetchParams): Promise<WeatherData> {
  if (params.apiKey) {
    return fetchOWMWeather(params);
  }
  return fetchOpenMeteoWeather(params);
}
