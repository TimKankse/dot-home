import type { CalendarEvent } from '@/components/widgets/calendar/types';
import type { CalendarWidgetConfig } from '@/types';
import { apiFetch } from '@/lib/api-client';

export interface CalendarFetchParams {
  config: CalendarWidgetConfig;
}

export async function fetchCalendarEvents(params: CalendarFetchParams): Promise<CalendarEvent[]> {
  const { config } = params;
  const icalUrls = config.icalUrls || (config.icalUrl ? [config.icalUrl] : []);
  const response = await apiFetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      icalUrls,
      radarrIntegrationId: config.radarrIntegrationId,
      sonarrIntegrationId: config.sonarrIntegrationId,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch calendar data');
  }
  
  return response.json();
}
