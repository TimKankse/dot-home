export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WidgetType = 'widget' | 'shortcut';

export interface WidgetMapping {
  field: string; // lodash path to value
  label?: string;
  format?: 'text' | 'number' | 'percent' | 'date' | 'currency';
  remap?: Array<{ value: string | number | boolean; to: string | number | boolean } | { any: true; to: string | number | boolean }>;
  scale?: number | string; // e.g., 0.001 or "1/16"
  prefix?: string;
  suffix?: string;
}

export interface DataTransform {
  // For transforming array responses to chart data
  arrayToChart?: {
    xField: string; // field in each array item for x-axis
    yField: string; // field in each array item for y-axis
    timestampField?: string; // if dates need conversion
    timestampFormat?: 'unix' | 'iso' | number; // unix milliseconds, ISO string, or divisor
  };
  
  // For flattening nested objects
  flatten?: {
    arrayPath?: string; // path to array to flatten
    itemName?: string; // field in each item to use as name
    itemValue?: string; // field in each item to use as value
  };
}

export interface WidgetConfig extends Record<string, unknown> {
  url?: string;
  externalUrl?: string; // shortcut fallback
  apiKey?: string;
  feedUrl?: string; // RSS
  
  // Custom Widget Specifics
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string; // POST body
  refreshInterval?: number; // ms
  
  // Data Processing
  dataExtractor?: string; // JSON path, e.g. "data.results"
  transform?: DataTransform;
  mappings?: WidgetMapping[];
  
  // Visualization
  visualizationType?: 'table' | 'list' | 'chart' | 'metric' | 'json';
  
  // Chart mapping
  chartType?: 'line' | 'bar' | 'area' | 'pie';
  xAxisKey?: string;
  yAxisKey?: string;
  
  // Mappings (Legacy / Specific)
  tableColumns?: Array<{ header: string; key: string }>;
  listTitleKey?: string;
  listSubtitleKey?: string;
  metricLabel?: string;
  metricValueKey?: string;
  metricUnit?: string;
}

export interface Widget {
  id: string;
  type: string; // 'widget' or 'shortcut' generally, or specific widget type like 'clock'
  grid: GridPosition;
  name?: string;
  url?: string;
  iconUrl?: string;
  isSelfHosted?: boolean;
  internalUrl?: string;
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
  internalUrl?: string;
  isSelfHosted?: boolean;
  widgetType?: string;
  pageId: string;
  config?: WidgetConfig;
  integrationId?: string;
}
