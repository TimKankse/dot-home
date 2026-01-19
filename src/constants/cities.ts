/**
 * City timezone definitions for clock widget
 * Each city includes full name, abbreviation, and IANA timezone identifier
 */

export interface CityTimezone {
  id: string;
  name: string;
  abbreviation: string;
  timezone: string;
}

export const CITIES: readonly CityTimezone[] = [
  // North America - US
  { id: 'nyc', name: 'New York', abbreviation: 'NYC', timezone: 'America/New_York' },
  { id: 'la', name: 'Los Angeles', abbreviation: 'LA', timezone: 'America/Los_Angeles' },
  { id: 'chicago', name: 'Chicago', abbreviation: 'CHI', timezone: 'America/Chicago' },
  { id: 'denver', name: 'Denver', abbreviation: 'DEN', timezone: 'America/Denver' },
  { id: 'phoenix', name: 'Phoenix', abbreviation: 'PHX', timezone: 'America/Phoenix' },
  { id: 'seattle', name: 'Seattle', abbreviation: 'SEA', timezone: 'America/Los_Angeles' },
  { id: 'miami', name: 'Miami', abbreviation: 'MIA', timezone: 'America/New_York' },
  { id: 'boston', name: 'Boston', abbreviation: 'BOS', timezone: 'America/New_York' },
  { id: 'sf', name: 'San Francisco', abbreviation: 'SF', timezone: 'America/Los_Angeles' },
  { id: 'honolulu', name: 'Honolulu', abbreviation: 'HNL', timezone: 'Pacific/Honolulu' },
  { id: 'anchorage', name: 'Anchorage', abbreviation: 'ANC', timezone: 'America/Anchorage' },
  
  // North America - Canada
  { id: 'toronto', name: 'Toronto', abbreviation: 'YYZ', timezone: 'America/Toronto' },
  { id: 'vancouver', name: 'Vancouver', abbreviation: 'YVR', timezone: 'America/Vancouver' },
  { id: 'montreal', name: 'Montreal', abbreviation: 'YUL', timezone: 'America/Montreal' },
  
  // North America - Mexico
  { id: 'mexico-city', name: 'Mexico City', abbreviation: 'MEX', timezone: 'America/Mexico_City' },
  
  // Europe
  { id: 'london', name: 'London', abbreviation: 'LON', timezone: 'Europe/London' },
  { id: 'paris', name: 'Paris', abbreviation: 'PAR', timezone: 'Europe/Paris' },
  { id: 'berlin', name: 'Berlin', abbreviation: 'BER', timezone: 'Europe/Berlin' },
  { id: 'madrid', name: 'Madrid', abbreviation: 'MAD', timezone: 'Europe/Madrid' },
  { id: 'rome', name: 'Rome', abbreviation: 'ROM', timezone: 'Europe/Rome' },
  { id: 'amsterdam', name: 'Amsterdam', abbreviation: 'AMS', timezone: 'Europe/Amsterdam' },
  { id: 'stockholm', name: 'Stockholm', abbreviation: 'STO', timezone: 'Europe/Stockholm' },
  { id: 'moscow', name: 'Moscow', abbreviation: 'MOW', timezone: 'Europe/Moscow' },
  { id: 'athens', name: 'Athens', abbreviation: 'ATH', timezone: 'Europe/Athens' },
  { id: 'zurich', name: 'Zurich', abbreviation: 'ZRH', timezone: 'Europe/Zurich' },
  
  // Asia
  { id: 'tokyo', name: 'Tokyo', abbreviation: 'TYO', timezone: 'Asia/Tokyo' },
  { id: 'hong-kong', name: 'Hong Kong', abbreviation: 'HKG', timezone: 'Asia/Hong_Kong' },
  { id: 'singapore', name: 'Singapore', abbreviation: 'SIN', timezone: 'Asia/Singapore' },
  { id: 'dubai', name: 'Dubai', abbreviation: 'DXB', timezone: 'Asia/Dubai' },
  { id: 'shanghai', name: 'Shanghai', abbreviation: 'SHA', timezone: 'Asia/Shanghai' },
  { id: 'beijing', name: 'Beijing', abbreviation: 'BJS', timezone: 'Asia/Shanghai' },
  { id: 'seoul', name: 'Seoul', abbreviation: 'SEL', timezone: 'Asia/Seoul' },
  { id: 'mumbai', name: 'Mumbai', abbreviation: 'BOM', timezone: 'Asia/Kolkata' },
  { id: 'bangkok', name: 'Bangkok', abbreviation: 'BKK', timezone: 'Asia/Bangkok' },
  { id: 'istanbul', name: 'Istanbul', abbreviation: 'IST', timezone: 'Europe/Istanbul' },
  
  // Oceania
  { id: 'sydney', name: 'Sydney', abbreviation: 'SYD', timezone: 'Australia/Sydney' },
  { id: 'melbourne', name: 'Melbourne', abbreviation: 'MEL', timezone: 'Australia/Melbourne' },
  { id: 'auckland', name: 'Auckland', abbreviation: 'AKL', timezone: 'Pacific/Auckland' },
  
  // South America
  { id: 'sao-paulo', name: 'São Paulo', abbreviation: 'GRU', timezone: 'America/Sao_Paulo' },
  { id: 'buenos-aires', name: 'Buenos Aires', abbreviation: 'BUE', timezone: 'America/Argentina/Buenos_Aires' },
  { id: 'santiago', name: 'Santiago', abbreviation: 'SCL', timezone: 'America/Santiago' },
  
  // Africa
  { id: 'cairo', name: 'Cairo', abbreviation: 'CAI', timezone: 'Africa/Cairo' },
  { id: 'johannesburg', name: 'Johannesburg', abbreviation: 'JNB', timezone: 'Africa/Johannesburg' },
  { id: 'lagos', name: 'Lagos', abbreviation: 'LOS', timezone: 'Africa/Lagos' },
] as const;

/**
 * Get city by ID
 */
export function getCityById(id: string): CityTimezone | undefined {
  return CITIES.find(city => city.id === id);
}

/**
 * Timezone options for dropdowns (settings)
 */
export const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  
  // Europe
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)" },
  { value: "Europe/Brussels", label: "Brussels (CET/CEST)" },
  { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)" },
  { value: "Europe/Oslo", label: "Oslo (CET/CEST)" },
  { value: "Europe/Copenhagen", label: "Copenhagen (CET/CEST)" },
  { value: "Europe/Helsinki", label: "Helsinki (EET/EEST)" },
  { value: "Europe/Vienna", label: "Vienna (CET/CEST)" },
  { value: "Europe/Zurich", label: "Zurich (CET/CEST)" },
  { value: "Europe/Prague", label: "Prague (CET/CEST)" },
  { value: "Europe/Warsaw", label: "Warsaw (CET/CEST)" },
  { value: "Europe/Budapest", label: "Budapest (CET/CEST)" },
  { value: "Europe/Athens", label: "Athens (EET/EEST)" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Europe/Kiev", label: "Kiev (EET/EEST)" },
  
  // Americas
  { value: "America/New_York", label: "New York (Eastern Time)" },
  { value: "America/Chicago", label: "Chicago (Central Time)" },
  { value: "America/Denver", label: "Denver (Mountain Time)" },
  { value: "America/Los_Angeles", label: "Los Angeles (Pacific Time)" },
  { value: "America/Phoenix", label: "Phoenix (MST)" },
  { value: "America/Anchorage", label: "Anchorage (Alaska Time)" },
  { value: "America/Honolulu", label: "Honolulu (Hawaii Time)" },
  { value: "America/Toronto", label: "Toronto (Eastern Time)" },
  { value: "America/Vancouver", label: "Vancouver (Pacific Time)" },
  { value: "America/Montreal", label: "Montreal (Eastern Time)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (Brasilia Time)" },
  { value: "America/Mexico_City", label: "Mexico City (Central Time)" },
  
  // Asia
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "Kolkata (IST)" },
  { value: "Asia/Jakarta", label: "Jakarta (WIB)" },
  { value: "Asia/Taipei", label: "Taipei (CST)" },
  { value: "Asia/Manila", label: "Manila (PHT)" },
  
  // Oceania
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  { value: "Pacific/Fiji", label: "Fiji (FJT/FJST)" },
  
  // Africa
  { value: "Africa/Cairo", label: "Cairo (EET/EEST)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)" },
];

/**
 * Extract city name from a timezone string
 */
export const extractCityFromTimezone = (timezone: string): string => {
  if (!timezone) return '';
  const parts = timezone.split('/');
  if (parts.length > 1) {
    return parts[parts.length - 1].replace(/_/g, ' ');
  }
  return timezone;
};

/**
 * Maps timezone to city name for auto-detect feature
 * Derived from CITIES array + additional timezone mappings not in CITIES
 */
export const TIMEZONE_TO_CITY: Record<string, string> = {
  // Derived from CITIES array
  ...Object.fromEntries(CITIES.map(c => [c.timezone, c.name])),
  // Additional timezones not covered by CITIES (used in TIMEZONES dropdown)
  "Europe/Brussels": "Brussels",
  "Europe/Oslo": "Oslo",
  "Europe/Copenhagen": "Copenhagen",
  "Europe/Helsinki": "Helsinki",
  "Europe/Vienna": "Vienna",
  "Europe/Prague": "Prague",
  "Europe/Warsaw": "Warsaw",
  "Europe/Budapest": "Budapest",
  "Europe/Kiev": "Kiev",
  "Asia/Jakarta": "Jakarta",
  "Asia/Taipei": "Taipei",
  "Asia/Manila": "Manila",
  "Australia/Brisbane": "Brisbane",
  "Australia/Perth": "Perth",
  "Australia/Adelaide": "Adelaide",
  "Pacific/Fiji": "Suva",
  "Africa/Nairobi": "Nairobi",
};

/**
 * Get city data from CITIES by timezone (useful for auto-detect)
 */
export function getCityByTimezone(timezone: string): CityTimezone | undefined {
  return CITIES.find(city => city.timezone === timezone);
}
