import type { ResponsiveBreakpointKey } from '@/constants/grid';

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutItem extends GridPosition {
  i: string;
}

export type ResponsiveLayouts = Partial<Record<ResponsiveBreakpointKey, Record<string, LayoutItem[]>>>;

export type WidgetType = 'widget' | 'shortcut';

export interface WidgetConfig extends Record<string, unknown> {
  url?: string;
  externalUrl?: string; // shortcut fallback
  apiKey?: string;
  feedUrl?: string; // RSS
  
  refreshInterval?: number; // ms
}

export interface Widget {
  id: string;
  type: string; // 'widget' or 'shortcut' generally, or specific widget type like 'clock'
  grid: GridPosition;
  name?: string;
  url?: string;
  iconUrl?: string;
  widgetType?: string; // specific type if type is 'widget', e.g. 'clock', 'weather'
  pageId: string;
  config?: WidgetConfig;
  integrationId?: string;
  syncConfig?: boolean; // Default: true. If false, each user has their own config
}

export interface NewWidgetInput {
  id: string;
  type: WidgetType;
  x?: number;
  y?: number;
  w: number;
  h: number;
  name?: string;
  url?: string;
  iconUrl?: string;
  widgetType?: string;
  pageId: string;
  config?: WidgetConfig;
  integrationId?: string;
}
