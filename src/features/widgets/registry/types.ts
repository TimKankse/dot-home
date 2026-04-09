import React from 'react';
import type { Widget } from '@/types/widget';

export interface WidgetDefinition {
  component: React.ComponentType<WidgetComponentProps>;
  displayName: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  requiresIntegration?: boolean;
}

export interface WidgetComponentProps {
  config?: Record<string, unknown>;
  integrationId?: string;
  isEditing?: boolean;
  id?: string;
  title?: string;
}

export type WidgetTypeKey = 
  | 'clock'
  | 'weather'
  | 'calendar'
  | 'jellyfin'
  | 'jellyseerr'
  | 'netdata'
  | 'twitch'
  | 'portainer'
  | 'sabnzbd'
  | 'qbittorrent'
  | 'rss'
  | 'search'
  | 'image'
  | 'shortcut'
  | 'spacer'
  | 'section';

export const isValidWidgetType = (type: string): type is WidgetTypeKey => {
  return [
    'clock', 'weather', 'calendar', 'jellyfin', 'jellyseerr',
    'netdata', 'twitch', 'portainer', 'sabnzbd', 'qbittorrent',
    'rss', 'search', 'image', 'shortcut', 'spacer', 'section'
  ].includes(type);
};

export function getWidgetTypeFromWidget(widget: Widget): WidgetTypeKey | null {
  if (isValidWidgetType(widget.type)) {
    return widget.type;
  }
  if (widget.widgetType && isValidWidgetType(widget.widgetType)) {
    return widget.widgetType;
  }
  return null;
}
