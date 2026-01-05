// Popular app icons from walkxcode/dashboard-icons CDN
// URLs are constructed dynamically using SVG format for better quality
export interface AppIcon {
  name: string;
  filename: string; // Filename in the dashboard-icons repo (without extension)
  keywords?: string[]; // Additional search terms
}

const CDN_BASE_URL = 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg';

// Helper function to get the full URL for an app icon
export const getAppIconUrl = (filename: string): string => {
  return `${CDN_BASE_URL}/${filename}.svg`;
};

// Import all available SVG icons from JSON
import iconData from './appIcons.json';

// Convert JSON icon names to AppIcon format
// Remove .svg extension and convert to human-readable names
const generateAppIcons = (): AppIcon[] => {
  return iconData.svg.map(filename => {
    const name = filename
      .replace('.svg', '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      name,
      filename: filename.replace('.svg', ''),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
};

export const ALL_APP_ICONS = generateAppIcons();

// Curated list of popular apps for better autocomplete experience
export const POPULAR_APP_ICONS: AppIcon[] = [
  // Google Services
  { name: 'Google', filename: 'google', keywords: ['search'] },
  { name: 'Google Chrome', filename: 'google-chrome', keywords: ['browser', 'chrome'] },
  { name: 'Google Drive', filename: 'google-drive', keywords: ['drive', 'storage', 'cloud'] },
  { name: 'Gmail', filename: 'gmail', keywords: ['email', 'mail'] },
  { name: 'Google Calendar', filename: 'google-calendar', keywords: ['calendar'] },
  { name: 'Google Photos', filename: 'google-photos', keywords: ['photos'] },
  { name: 'YouTube', filename: 'youtube', keywords: ['video'] },
  
  // Microsoft Services
  { name: 'Microsoft', filename: 'microsoft' },
  { name: 'Outlook', filename: 'outlook', keywords: ['email', 'mail'] },
  { name: 'OneDrive', filename: 'onedrive', keywords: ['storage', 'cloud'] },
  { name: 'Teams', filename: 'microsoft-teams', keywords: ['chat', 'collaboration'] },
  
  // Media Servers
  { name: 'Plex', filename: 'plex', keywords: ['media', 'streaming'] },
  { name: 'Jellyfin', filename: 'jellyfin', keywords: ['media', 'streaming'] },
  { name: 'Emby', filename: 'emby', keywords: ['media', 'streaming'] },
  
  // *arr Stack
  { name: 'Radarr', filename: 'radarr', keywords: ['movies', 'arr'] },
  { name: 'Sonarr', filename: 'sonarr', keywords: ['tv', 'shows', 'arr'] },
  { name: 'Lidarr', filename: 'lidarr', keywords: ['music', 'arr'] },
  { name: 'Prowlarr', filename: 'prowlarr', keywords: ['indexer', 'arr'] },
  { name: 'Readarr', filename: 'readarr', keywords: ['books', 'arr'] },
  { name: 'Bazarr', filename: 'bazarr', keywords: ['subtitles', 'arr'] },
  { name: 'Overseerr', filename: 'overseerr', keywords: ['requests', 'arr'] },
  { name: 'Jellyseerr', filename: 'jellyseerr', keywords: ['requests', 'jellyfin'] },
  
  // Download Clients
  { name: 'qBittorrent', filename: 'qbittorrent', keywords: ['torrent', 'download'] },
  { name: 'Transmission', filename: 'transmission', keywords: ['torrent', 'download'] },
  { name: 'Deluge', filename: 'deluge', keywords: ['torrent', 'download'] },
  { name: 'SABnzbd', filename: 'sabnzbd', keywords: ['usenet', 'download'] },
  { name: 'NZBGet', filename: 'nzbget', keywords: ['usenet', 'download'] },
  
  // Container/DevOps
  { name: 'Docker', filename: 'docker', keywords: ['container'] },
  { name: 'Portainer', filename: 'portainer', keywords: ['docker', 'container'] },
  { name: 'Kubernetes', filename: 'kubernetes', keywords: ['k8s', 'container'] },
  
  // Home Automation
  { name: 'Home Assistant', filename: 'home-assistant', keywords: ['smart home', 'automation'] },
  { name: 'Node-RED', filename: 'node-red', keywords: ['automation', 'flow'] },
  
  // Monitoring
  { name: 'Grafana', filename: 'grafana', keywords: ['monitoring', 'dashboard'] },
  { name: 'Prometheus', filename: 'prometheus', keywords: ['monitoring', 'metrics'] },
  { name: 'Uptime Kuma', filename: 'uptime-kuma', keywords: ['uptime', 'monitoring'] },
  { name: 'Netdata', filename: 'netdata', keywords: ['monitoring', 'metrics'] },
  
  // Network/Security
  { name: 'Pi-hole', filename: 'pi-hole', keywords: ['dns', 'adblock'] },
  { name: 'AdGuard Home', filename: 'adguard-home', keywords: ['dns', 'adblock'] },
  { name: 'Nginx', filename: 'nginx', keywords: ['proxy', 'web server'] },
  { name: 'Traefik', filename: 'traefik', keywords: ['proxy', 'reverse proxy'] },
  
  // Storage/NAS
  { name: 'Nextcloud', filename: 'nextcloud', keywords: ['cloud', 'storage', 'files'] },
  { name: 'Synology', filename: 'synology', keywords: ['nas', 'storage'] },
  { name: 'TrueNAS', filename: 'truenas', keywords: ['nas', 'storage'] },
  { name: 'Unraid', filename: 'unraid', keywords: ['nas', 'storage'] },
  
  // Development
  { name: 'GitHub', filename: 'github', keywords: ['git', 'code'] },
  { name: 'GitLab', filename: 'gitlab', keywords: ['git', 'code'] },
  { name: 'VS Code', filename: 'vscode', keywords: ['editor', 'code'] },
  { name: 'Jupyter', filename: 'jupyter', keywords: ['notebook', 'python'] },
  
  // Communication
  { name: 'Discord', filename: 'discord', keywords: ['chat'] },
  { name: 'Slack', filename: 'slack', keywords: ['chat', 'team'] },
  { name: 'Telegram', filename: 'telegram', keywords: ['chat', 'messaging'] },
  
  // Social Media
  { name: 'Reddit', filename: 'reddit', keywords: ['social'] },
  { name: 'Twitter', filename: 'twitter', keywords: ['social', 'x'] },
  { name: 'Facebook', filename: 'facebook', keywords: ['social'] },
  { name: 'Instagram', filename: 'instagram', keywords: ['social'] },
  
  // Productivity
  { name: 'Notion', filename: 'notion', keywords: ['notes', 'productivity'] },
  { name: 'Trello', filename: 'trello', keywords: ['kanban', 'productivity'] },
  { name: 'Jira', filename: 'jira', keywords: ['project', 'productivity'] },
  
  // Gaming
  { name: 'Steam', filename: 'steam', keywords: ['games', 'gaming'] },
  { name: 'Twitch', filename: 'twitch', keywords: ['streaming', 'gaming'] },
  
  // Virtualization
  { name: 'Proxmox', filename: 'proxmox', keywords: ['vm', 'virtualization'] },
  { name: 'VMware', filename: 'vmware', keywords: ['vm', 'virtualization'] },
  
  // Other Popular Services
  { name: 'Spotify', filename: 'spotify', keywords: ['music', 'streaming'] },
  { name: 'Netflix', filename: 'netflix', keywords: ['video', 'streaming'] },
  { name: 'Amazon', filename: 'amazon', keywords: ['shopping'] },
  { name: 'Wikipedia', filename: 'wikipedia', keywords: ['wiki', 'encyclopedia'] },
].sort((a, b) => a.name.localeCompare(b.name));
