import type { CalendarEvent } from '@/components/widgets/calendar/types';
import type { CalendarWidgetConfig } from '@/types';

export interface CalendarFetchParams {
  config: CalendarWidgetConfig;
  integrationId?: string;
}

export async function fetchCalendarEvents(params: CalendarFetchParams): Promise<CalendarEvent[]> {
  const { config, integrationId } = params;
  
  const urlParams = new URLSearchParams();

  if (config.icalUrls) {
    config.icalUrls.forEach(url => urlParams.append('icalUrl', url));
  } else if (config.icalUrl) {
    urlParams.append('icalUrl', config.icalUrl);
  }

  const headers: Record<string, string> = {};

  if (integrationId) {
    headers['x-integration-id'] = integrationId;
  }
  
  if (config.radarrUrl) headers['x-radarr-url'] = config.radarrUrl;
  if (config.radarrApiKey) headers['x-radarr-apikey'] = config.radarrApiKey;
  if (config.sonarrUrl) headers['x-sonarr-url'] = config.sonarrUrl;
  if (config.sonarrApiKey) headers['x-sonarr-apikey'] = config.sonarrApiKey;

  const response = await fetch(`/api/calendar?${urlParams.toString()}`, { headers });
  
  if (!response.ok) {
    throw new Error('Failed to fetch calendar data');
  }
  
  return response.json();
}
