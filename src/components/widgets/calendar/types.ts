import type { CalendarWidgetConfig } from '@/types';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  source: 'google' | 'radarr' | 'sonarr';
  type: 'event' | 'movie' | 'episode';
  description?: string;
  allDay?: boolean;
}

// Re-export from centralized types for convenience
export type { CalendarWidgetConfig };

export interface CalendarWidgetProps {
  config: CalendarWidgetConfig;
}
