import { NextResponse } from 'next/server';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO string
  endDate?: string; // ISO string
  source: 'google' | 'radarr' | 'sonarr';
  type: 'event' | 'movie' | 'episode';
  description?: string;
  allDay?: boolean;
}

interface IcalEvent {
  uid: string;
  summary: string;
  startDate: { toJSDate: () => Date; isDate: boolean };
  endDate?: { toJSDate: () => Date };
}

interface IcalOccurrence {
  item: { uid: string; summary: string };
  startDate: { toJSDate: () => Date; isDate: boolean };
  endDate?: { toJSDate: () => Date };
}

interface RadarrMovie {
  id: number;
  title: string;
  inCinemas?: string;
  physicalRelease?: string;
  digitalRelease?: string;
  overview?: string;
}

interface SonarrEpisode {
  id: number;
  series?: { title: string };
  seasonNumber: number;
  episodeNumber: number;
  airDateUtc: string;
  title: string;
}

import IcalExpander from 'ical-expander';

async function fetchICalEvents(url: string): Promise<CalendarEvent[]> {
  if (!url) return [];
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch iCal: ${response.statusText}`);
    const text = await response.text();
    
    const icalExpander = new IcalExpander({ ics: text, maxIterations: 100 });
    const now = new Date();
    const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days out
    
    const { events, occurrences } = icalExpander.between(now, end);
    
    const mappedEvents: CalendarEvent[] = [
      ...events.map((e: IcalEvent) => ({
        id: `ical-${e.uid}`,
        title: e.summary,
        date: e.startDate.toJSDate().toISOString(),
        endDate: e.endDate ? e.endDate.toJSDate().toISOString() : undefined,
        source: 'google' as const,
        type: 'event' as const,
        allDay: e.startDate.isDate, // isDate is true for all-day events in ical.js
      })),
      ...occurrences.map((o: IcalOccurrence) => ({
        id: `ical-${o.item.uid}-${o.startDate.toJSDate().toISOString()}`,
        title: o.item.summary,
        date: o.startDate.toJSDate().toISOString(),
        endDate: o.endDate ? o.endDate.toJSDate().toISOString() : undefined,
        source: 'google' as const,
        type: 'event' as const,
        allDay: o.startDate.isDate,
      }))
    ];
    
    return mappedEvents;
    
  } catch (error) {
    console.error('Error fetching iCal:', error);
    return [];
  }
}

async function fetchRadarrEvents(url: string, apiKey: string): Promise<CalendarEvent[]> {
  if (!url || !apiKey) return [];
  try {
    // Get calendar for next 30 days
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Ensure URL doesn't end with slash
    const baseUrl = url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/v3/calendar?start=${start}&end=${end}&apiKey=${apiKey}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Radarr API error: ${response.status}`);
    const data = await response.json();
    
    return data.map((movie: RadarrMovie) => ({
      id: `radarr-${movie.id}`,
      title: movie.title,
      date: movie.inCinemas || movie.physicalRelease || movie.digitalRelease || start, // Fallback
      source: 'radarr',
      type: 'movie',
      description: movie.overview,
      allDay: true
    }));
  } catch (error) {
    console.error('Error fetching Radarr:', error);
    return [];
  }
}

async function fetchSonarrEvents(url: string, apiKey: string): Promise<CalendarEvent[]> {
  if (!url || !apiKey) return [];
  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const baseUrl = url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/v3/calendar?start=${start}&end=${end}&apiKey=${apiKey}&includeSeries=true`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Sonarr API error: ${response.status}`);
    const data = await response.json();
    
    return data.map((episode: SonarrEpisode) => ({
      id: `sonarr-${episode.id}`,
      title: `${episode.series?.title || 'Unknown Series'} - S${episode.seasonNumber}E${episode.episodeNumber}`,
      date: episode.airDateUtc,
      source: 'sonarr',
      type: 'episode',
      description: episode.title, // Episode title
      allDay: false
    }));
  } catch (error) {
    console.error('Error fetching Sonarr:', error);
    return [];
  }
}

import { prisma } from '@/lib/db';
import { decryptSensitiveFields } from '@/utils/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const icalUrls = searchParams.getAll('icalUrl');
  
  // Headers for security
  let radarrUrl = request.headers.get('x-radarr-url');
  let radarrApiKey = request.headers.get('x-radarr-apikey');
  let sonarrUrl = request.headers.get('x-sonarr-url');
  let sonarrApiKey = request.headers.get('x-sonarr-apikey');

  // Query params as fallback (legacy) - but we prefer headers
  if (!radarrUrl) radarrUrl = searchParams.get('radarrUrl');
  if (!radarrApiKey) radarrApiKey = searchParams.get('radarrApiKey');
  if (!sonarrUrl) sonarrUrl = searchParams.get('sonarrUrl');
  if (!sonarrApiKey) sonarrApiKey = searchParams.get('sonarrApiKey');

  // Integration ID support
  const integrationId = request.headers.get('x-integration-id');
  if (integrationId) {
      const integration = await prisma.integration.findUnique({
          where: { id: integrationId }
      });
      if (integration) {
          const config = decryptSensitiveFields(JSON.parse(integration.config));
          if (integration.type === 'radarr') {
              radarrUrl = (config.externalUrl || config.url) as string;
              radarrApiKey = config.apiKey as string;
          } else if (integration.type === 'sonarr') {
              sonarrUrl = (config.externalUrl || config.url) as string;
              sonarrApiKey = config.apiKey as string;
          }
      }
  }

  const promises: Promise<CalendarEvent[]>[] = [];

  // Fetch from all iCal URLs
  if (icalUrls.length > 0) {
    icalUrls.forEach(url => promises.push(fetchICalEvents(url)));
  }

  // Fetch from Radarr/Sonarr
  if (radarrUrl && radarrApiKey) {
    promises.push(fetchRadarrEvents(radarrUrl, radarrApiKey));
  }
  if (sonarrUrl && sonarrApiKey) {
    promises.push(fetchSonarrEvents(sonarrUrl, sonarrApiKey));
  }

  const results = await Promise.all(promises);
  const allEvents = results.flat();
  
  // Sort by date
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json(allEvents);
}
