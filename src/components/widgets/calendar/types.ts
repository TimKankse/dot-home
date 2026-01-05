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

export interface CalendarWidgetProps {
  config: {
    icalUrl?: string; // Legacy support
    icalUrls?: string[];
    radarrUrl?: string;
    radarrApiKey?: string;
    sonarrUrl?: string;
    sonarrApiKey?: string;
    weekStart?: 'monday' | 'sunday';
    defaultView?: 'daily' | 'monthly';
  };
}
