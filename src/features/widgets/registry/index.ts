'use client';

import type { WidgetDefinition, WidgetTypeKey } from './types';

import { ClockWidget } from '@/components/widgets/clock/ClockWidget';
import { WeatherWidget } from '@/components/widgets/weather/WeatherWidget';
import { CalendarWidget } from '@/components/widgets/calendar/CalendarWidget';
import { JellyfinWidget } from '@/components/widgets/jellyfin/JellyfinWidget';
import JellyseerrWidget from '@/components/widgets/jellyseerr/JellyseerrWidget';
import { NetdataWidget } from '@/components/widgets/netdata/NetdataWidget';
import { TwitchWidget } from '@/components/widgets/twitch/TwitchWidget';
import { PortainerWidget } from '@/components/widgets/portainer/PortainerWidget';
import { SabnzbdWidget } from '@/components/widgets/sabnzbd/SabnzbdWidget';
import { QBittorrentWidget } from '@/components/widgets/qbittorrent/QBittorrentWidget';
import { RssWidget } from '@/components/widgets/rss/RssWidget';
import { SearchWidget } from '@/components/widgets/search/SearchWidget';
import { ImageWidget } from '@/components/widgets/image/ImageWidget';
import { AppShortcutWidget } from '@/components/widgets/shortcut/AppShortcutWidget';
import { SpacerWidget } from '@/components/widgets/spacer/SpacerWidget';
import { SectionWidget } from '@/components/widgets/section/SectionWidget';


export const WIDGET_REGISTRY: Record<WidgetTypeKey, WidgetDefinition> = {
  clock: {
    component: ClockWidget as WidgetDefinition['component'],
    displayName: 'Clock',
    defaultSize: { w: 2, h: 2 },
  },
  weather: {
    component: WeatherWidget as WidgetDefinition['component'],
    displayName: 'Weather',
    defaultSize: { w: 2, h: 2 },
  },
  calendar: {
    component: CalendarWidget as WidgetDefinition['component'],
    displayName: 'Calendar',
    defaultSize: { w: 3, h: 3 },
  },
  jellyfin: {
    component: JellyfinWidget as WidgetDefinition['component'],
    displayName: 'Jellyfin',
    defaultSize: { w: 2, h: 2 },
    requiresIntegration: true,
  },
  jellyseerr: {
    component: JellyseerrWidget as WidgetDefinition['component'],
    displayName: 'Jellyseerr',
    defaultSize: { w: 2, h: 2 },
    requiresIntegration: true,
  },
  netdata: {
    component: NetdataWidget as WidgetDefinition['component'],
    displayName: 'Netdata',
    defaultSize: { w: 2, h: 2 },
    requiresIntegration: true,
  },
  twitch: {
    component: TwitchWidget as WidgetDefinition['component'],
    displayName: 'Twitch',
    defaultSize: { w: 2, h: 2 },
    requiresIntegration: true,
  },
  portainer: {
    component: PortainerWidget as WidgetDefinition['component'],
    displayName: 'Portainer',
    defaultSize: { w: 2, h: 2 },
  },
  sabnzbd: {
    component: SabnzbdWidget as WidgetDefinition['component'],
    displayName: 'SABnzbd',
    defaultSize: { w: 2, h: 2 },
    requiresIntegration: true,
  },
  qbittorrent: {
    component: QBittorrentWidget as WidgetDefinition['component'],
    displayName: 'qBittorrent',
    defaultSize: { w: 2, h: 2 },
    requiresIntegration: true,
  },
  rss: {
    component: RssWidget as WidgetDefinition['component'],
    displayName: 'RSS',
    defaultSize: { w: 2, h: 3 },
  },
  search: {
    component: SearchWidget as WidgetDefinition['component'],
    displayName: 'Search',
    defaultSize: { w: 3, h: 1 },
  },
  image: {
    component: ImageWidget as WidgetDefinition['component'],
    displayName: 'Image',
    defaultSize: { w: 2, h: 2 },
  },
  shortcut: {
    component: AppShortcutWidget as WidgetDefinition['component'],
    displayName: 'Shortcut',
    defaultSize: { w: 1, h: 1 },
  },
  spacer: {
    component: SpacerWidget as WidgetDefinition['component'],
    displayName: 'Spacer',
    defaultSize: { w: 1, h: 1 },
  },
  section: {
    component: SectionWidget as WidgetDefinition['component'],
    displayName: 'Section',
    defaultSize: { w: 4, h: 2 },
  },
};

export function getWidgetDefinition(type: WidgetTypeKey): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[type];
}
