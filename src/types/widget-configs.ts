/**
 * Centralized widget configuration types
 * All widget-specific config interfaces in one place for type safety
 */

import type { CityData } from './settings';

// ============================================================================
// Clock Widget
// ============================================================================
export interface ClockWidgetConfig {
  variant?: 'digital' | 'analog';
  justification?: 'left' | 'center' | 'right';
  hour12?: boolean;
  includeDate?: boolean;
  dateFormat?: 'short' | 'long';
  analogStyle?: 'squircle' | 'classic';
  classicDigits?: 'none' | 'cardinal' | 'all' | 'dynamic';
  showHands?: 'hour' | 'minute' | 'all';
  city?: string; // City ID from static CITIES list (for preset cities)
  cityData?: CityData; // Custom city data (for non-preset cities)
  cityFormat?: 'short' | 'long'; // Display format for city name (digital only)
  showCityName?: boolean; // Whether to display the city name
  showDate?: boolean; // Whether to display date on analog clock
}

// ============================================================================
// Weather Widget
// ============================================================================
export interface WeatherWidgetConfig {
  location?: string; // Legacy: plain text location
  cityData?: CityData; // New: structured city data with coordinates
  apiKey?: string;
  unit?: 'metric' | 'imperial' | 'app';
  view?: 'current' | 'daily' | 'weekly';
}

// ============================================================================
// Calendar Widget
// ============================================================================
export interface CalendarWidgetConfig {
  icalUrl?: string;
  icalUrls?: string[];
  radarrIntegrationId?: string;  // Reference to Radarr integration
  radarrUrl?: string;
  radarrApiKey?: string;
  sonarrIntegrationId?: string;  // Reference to Sonarr integration
  sonarrUrl?: string;
  sonarrApiKey?: string;
  weekStart?: 'monday' | 'sunday';
  defaultView?: 'daily' | 'monthly';
}

// ============================================================================
// Jellyfin Widget
// ============================================================================
export interface JellyfinWidgetConfig {
  integrationId?: string;  // Reference to saved integration
  url?: string;
  apiKey?: string;
  userId?: string;
  viewMode?: 'now-playing' | 'libraries';
  selectedLibraries?: string[];  // IDs of libraries to show
}

// ============================================================================
// Jellyseerr Widget
// ============================================================================
export interface JellyseerrWidgetConfig {
  integrationId?: string;
  url?: string;
  apiKey?: string;
}

// ============================================================================
// Netdata Widget
// ============================================================================
export type NetdataMetricType = 'cpu' | 'ram' | 'storage' | 'processes' | 'network' | 'system' | 'cpu-cores' | 'gpu';

export interface NetdataWidgetConfig {
  integrationId?: string;
  url?: string;
  metricType?: NetdataMetricType;
  mountPoints?: string[];
  interfaceName?: string;
  storageViewMode?: 'linear' | 'circular';
  processLimit?: number;
  gpuId?: string;
  temperatureUnit?: 'C' | 'F'; // undefined = use app settings
  refreshInterval?: number;
}

// ============================================================================
// Twitch Widget
// ============================================================================
export interface TwitchWidgetConfig {
  integrationId?: string;
  clientId?: string;
  clientSecret?: string;
  channels?: string[] | string;
}

// ============================================================================
// Portainer Widget
// ============================================================================
export interface PortainerWidgetConfig {
  integrationId?: string;
  url?: string;
  apiKey?: string;
  endpointId?: string;
}

// ============================================================================
// SABnzbd Widget
// ============================================================================
export interface SabnzbdWidgetConfig {
  integrationId?: string;
  url?: string;
  apiKey?: string;
}

// ============================================================================
// qBittorrent Widget
// ============================================================================
export interface QBittorrentWidgetConfig {
  integrationId?: string;
  url?: string;
  username?: string;
  password?: string;
}

// ============================================================================
// RSS Widget
// ============================================================================
export interface RssWidgetConfig {
  feedUrl?: string;
  feedUrls?: string[];
  title?: string;
  maxItems?: number;
  showThumbnail?: boolean;
  showSummary?: boolean;
  refreshInterval?: number;
}

// ============================================================================
// Search Widget
// ============================================================================
export interface SearchWidgetConfig {
  searchEngineUrl?: string;
  defaultQuery?: string;
}

// ============================================================================
// Image Widget
// ============================================================================
export interface ImageWidgetConfig {
  url?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

// ============================================================================
// Shortcut Widget (App Shortcut)
// ============================================================================
export interface ShortcutWidgetConfig {
  externalUrl?: string;
}

// ============================================================================
// Union type of all widget configs for generic use
// ============================================================================
export type AnyWidgetConfig =
  | ClockWidgetConfig
  | WeatherWidgetConfig
  | CalendarWidgetConfig
  | JellyfinWidgetConfig
  | JellyseerrWidgetConfig
  | NetdataWidgetConfig
  | TwitchWidgetConfig
  | PortainerWidgetConfig
  | SabnzbdWidgetConfig
  | QBittorrentWidgetConfig
  | RssWidgetConfig
  | SearchWidgetConfig
  | ImageWidgetConfig
  | ShortcutWidgetConfig;
