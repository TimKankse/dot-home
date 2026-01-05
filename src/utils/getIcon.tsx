import React from 'react';
import { 
  Facebook, 
  Twitter, 
  Youtube, 
  Container, 
  Shield, 
  Terminal, 
  Search, 
  HardDrive, 
  Download, 
  Server, 
  Globe, 
  Music, 
  Video, 
  Tv,
  Wifi,
  Cpu,
  Database
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  'facebook': <Facebook size={32} strokeWidth={1.5} />,
  'x': <Twitter size={32} strokeWidth={1.5} />,
  'twitter': <Twitter size={32} strokeWidth={1.5} />,
  'youtube': <Youtube size={32} strokeWidth={1.5} />,
  'portainer': <Container size={32} strokeWidth={1.5} />,
  'docker': <Container size={32} strokeWidth={1.5} />,
  'pihole': <Shield size={32} strokeWidth={1.5} />,
  'adguard': <Shield size={32} strokeWidth={1.5} />,
  'terminal': <Terminal size={32} strokeWidth={1.5} />,
  'ssh': <Terminal size={32} strokeWidth={1.5} />,
  'google': <Search size={32} strokeWidth={1.5} />,
  'search': <Search size={32} strokeWidth={1.5} />,
  'nzbget': <Download size={32} strokeWidth={1.5} />,
  'sabnzbd': <Download size={32} strokeWidth={1.5} />,
  'qbittorrent': <Download size={32} strokeWidth={1.5} />,
  'transmission': <Download size={32} strokeWidth={1.5} />,
  'deluge': <Download size={32} strokeWidth={1.5} />,
  'wikipedia': <Globe size={32} strokeWidth={1.5} />,
  'plex': <Tv size={32} strokeWidth={1.5} />,
  'jellyfin': <Tv size={32} strokeWidth={1.5} />,
  'emby': <Tv size={32} strokeWidth={1.5} />,
  'radarr': <Video size={32} strokeWidth={1.5} />,
  'sonarr': <Tv size={32} strokeWidth={1.5} />,
  'lidarr': <Music size={32} strokeWidth={1.5} />,
  'readarr': <Globe size={32} strokeWidth={1.5} />,
  'prowlarr': <Search size={32} strokeWidth={1.5} />,
  'bazarr': <Globe size={32} strokeWidth={1.5} />,
  'overseerr': <Search size={32} strokeWidth={1.5} />,
  'jellyseerr': <Search size={32} strokeWidth={1.5} />,
  'proxmox': <Server size={32} strokeWidth={1.5} />,
  'truenas': <HardDrive size={32} strokeWidth={1.5} />,
  'unraid': <HardDrive size={32} strokeWidth={1.5} />,
  'homeassistant': <Globe size={32} strokeWidth={1.5} />,
  'grafana': <Database size={32} strokeWidth={1.5} />,
  'prometheus': <Database size={32} strokeWidth={1.5} />,
  'uptime': <Wifi size={32} strokeWidth={1.5} />,
  'health': <Cpu size={32} strokeWidth={1.5} />,
};

// Export available icon names for UI selection
export const AVAILABLE_ICONS = Object.keys(ICON_MAP).sort();

// Get icon by exact key name (for custom icon selection)
export const getIconByName = (iconKey: string): React.ReactNode | null => {
  return ICON_MAP[iconKey] || null;
};

// Get icon by searching/matching name (for auto-detection)
export const getIcon = (name: string): React.ReactNode | null => {
  const lowerName = name.toLowerCase().replace(/\s+/g, '');
  
  // 1. Check mapped icons
  if (ICON_MAP[lowerName]) {
    return ICON_MAP[lowerName];
  }

  return null;
};
