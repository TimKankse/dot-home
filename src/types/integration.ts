/**
 * Integration types - saved widget connection configurations
 * Integrations store connection settings that can be shared across widgets
 */

// Supported integration types - maps to widget types that have connection settings
export type IntegrationType = 
  | 'jellyfin' 
  | 'jellyseerr' 
  | 'netdata' 
  | 'portainer' 
  | 'sabnzbd' 
  | 'qbittorrent' 
  | 'twitch'
  | 'sonarr'
  | 'radarr';

// Map integration types to their config shapes (connection fields only)
export interface IntegrationConfigMap {
  jellyfin: JellyfinIntegrationConfig;
  jellyseerr: JellyseerrIntegrationConfig;
  netdata: NetdataIntegrationConfig;
  portainer: PortainerIntegrationConfig;
  sabnzbd: SabnzbdIntegrationConfig;
  qbittorrent: QBittorrentIntegrationConfig;
  twitch: TwitchIntegrationConfig;
  sonarr: SonarrIntegrationConfig;
  radarr: RadarrIntegrationConfig;
}

// Individual integration config types
export interface JellyfinIntegrationConfig {
  url?: string;
  apiKey?: string;
  userId?: string;
}

export interface JellyseerrIntegrationConfig {
  url?: string;
  apiKey?: string;
}

export interface NetdataIntegrationConfig {
  url?: string;
}

export interface PortainerIntegrationConfig {
  url?: string;
  apiKey?: string;
  endpointId?: string;
}

export interface SabnzbdIntegrationConfig {
  url?: string;
  apiKey?: string;
}

export interface QBittorrentIntegrationConfig {
  url?: string;
  username?: string;
  password?: string;
}

export interface TwitchIntegrationConfig {
  clientId?: string;
  clientSecret?: string;
}

export interface SonarrIntegrationConfig {
  url?: string;
  apiKey?: string;
}

export interface RadarrIntegrationConfig {
  url?: string;
  apiKey?: string;
}

// Main Integration interface
export interface Integration<T extends IntegrationType = IntegrationType> {
  id: string;
  name: string;              // User-friendly name, e.g., "Home Media Server"
  type: T;                   // Widget type this integration is for
  iconUrl?: string;          // Custom icon (optional)
  config: IntegrationConfigMap[T];  // Type-safe config based on type
}

// Integration metadata for UI display
export interface IntegrationTypeMeta {
  type: IntegrationType;
  label: string;
  description: string;
  icon?: string;
}

export const INTEGRATION_TYPE_META: IntegrationTypeMeta[] = [
  { type: 'jellyfin', label: 'Jellyfin', description: 'Media server' },
  { type: 'jellyseerr', label: 'Jellyseerr', description: 'Media request manager' },
  { type: 'netdata', label: 'Netdata', description: 'System monitoring' },
  { type: 'portainer', label: 'Portainer', description: 'Container management' },
  { type: 'sabnzbd', label: 'SABnzbd', description: 'Usenet downloader' },
  { type: 'qbittorrent', label: 'qBittorrent', description: 'Torrent client' },
  { type: 'twitch', label: 'Twitch', description: 'Streaming platform' },
  { type: 'sonarr', label: 'Sonarr', description: 'TV show management' },
  { type: 'radarr', label: 'Radarr', description: 'Movie management' },
];

// Helper to get integration type metadata
export function getIntegrationTypeMeta(type: IntegrationType): IntegrationTypeMeta | undefined {
  return INTEGRATION_TYPE_META.find(m => m.type === type);
}
