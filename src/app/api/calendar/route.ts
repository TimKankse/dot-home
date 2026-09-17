import { readBoundedJson } from '@/lib/bounded-json';
import { feedRateLimit, feedConcurrency } from '@/lib/request-limits';
import IcalExpander from 'ical-expander';
import { NextResponse } from 'next/server';

import {
  ApiSecurityError,
  apiSecurityErrorResponse,
  requireApiUser,
  type ApiUser,
} from '@/lib/api-security';
import { resolveAuthorizedIntegration, type AuthorizedIntegration } from '@/lib/integration-access';
import {
  buildIntegrationUrl,
  requireIntegrationConfigString,
  resolveIntegrationBaseUrl,
} from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';
import { ValidationError, assertRecord } from '@/lib/validation';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
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

type ArrConnection = {
  integration: AuthorizedIntegration;
  baseUrl: URL;
  apiKey: string;
};

type CalendarFetchResult = {
  events: CalendarEvent[];
  ok: boolean;
};

const parseOptionalIntegrationId = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 128) {
    throw new ValidationError(`${label} must be a valid integration ID`);
  }
  return value;
};

const resolveArrConnection = async (
  integrationId: string | undefined,
  type: 'radarr' | 'sonarr',
  user: ApiUser,
): Promise<ArrConnection | undefined> => {
  if (!integrationId) return undefined;
  const integration = await resolveAuthorizedIntegration({
    integrationId,
    user,
    expectedTypes: [type],
    requiredPermission: 'view',
  });
  return {
    integration,
    baseUrl: await resolveIntegrationBaseUrl(integration),
    apiKey: requireIntegrationConfigString(integration, 'apiKey'),
  };
};

async function fetchICalEvents(url: string): Promise<CalendarFetchResult> {
  try {
    const response = await fetchOutbound(
      url,
      { cache: 'no-store' },
      {
        policy: 'public-internet',
        timeoutMs: 10_000,
            maxResponseBytes: 2 * 1024 * 1024,
        allowCrossOriginRedirects: true,
      },
    );
    if (!response.ok) return { events: [], ok: false };
    const icalExpander = new IcalExpander({
      ics: await response.text(),
      maxIterations: 100,
    });
    const now = new Date();
    const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const { events, occurrences } = icalExpander.between(now, end);

    return { ok: true, events: [
      ...events.map((event: IcalEvent) => ({
        id: `ical-${event.uid}`,
        title: event.summary,
        date: event.startDate.toJSDate().toISOString(),
        endDate: event.endDate?.toJSDate().toISOString(),
        source: 'google' as const,
        type: 'event' as const,
        allDay: event.startDate.isDate,
      })),
      ...occurrences.map((occurrence: IcalOccurrence) => ({
        id: `ical-${occurrence.item.uid}-${occurrence.startDate.toJSDate().toISOString()}`,
        title: occurrence.item.summary,
        date: occurrence.startDate.toJSDate().toISOString(),
        endDate: occurrence.endDate?.toJSDate().toISOString(),
        source: 'google' as const,
        type: 'event' as const,
        allDay: occurrence.startDate.isDate,
      })),
    ] };
  } catch {
    return { events: [], ok: false };
  }
}

async function fetchRadarrEvents(connection: ArrConnection): Promise<CalendarFetchResult> {
  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const apiUrl = buildIntegrationUrl(connection.baseUrl, '/api/v3/calendar');
    apiUrl.searchParams.set('start', start);
    apiUrl.searchParams.set('end', end);
    const response = await fetchOutbound(
      apiUrl,
      {
        headers: { 'X-Api-Key': connection.apiKey },
        cache: 'no-store',
      },
      { policy: 'trusted-integration', timeoutMs: 10_000 },
    );
    if (!response.ok) return { events: [], ok: false };
    const data = await response.json() as RadarrMovie[];

    return { ok: true, events: data.map((movie) => ({
      id: `radarr-${movie.id}`,
      title: movie.title,
      date: movie.inCinemas || movie.physicalRelease || movie.digitalRelease || start,
      source: 'radarr',
      type: 'movie',
      description: movie.overview,
      allDay: true,
    })) };
  } catch {
    return { events: [], ok: false };
  }
}

async function fetchSonarrEvents(connection: ArrConnection): Promise<CalendarFetchResult> {
  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const apiUrl = buildIntegrationUrl(connection.baseUrl, '/api/v3/calendar');
    apiUrl.searchParams.set('start', start);
    apiUrl.searchParams.set('end', end);
    apiUrl.searchParams.set('includeSeries', 'true');
    const response = await fetchOutbound(
      apiUrl,
      {
        headers: { 'X-Api-Key': connection.apiKey },
        cache: 'no-store',
      },
      { policy: 'trusted-integration', timeoutMs: 10_000 },
    );
    if (!response.ok) return { events: [], ok: false };
    const data = await response.json() as SonarrEpisode[];

    return { ok: true, events: data.map((episode) => ({
      id: `sonarr-${episode.id}`,
      title: `${episode.series?.title || 'Unknown Series'} - S${episode.seasonNumber}E${episode.episodeNumber}`,
      date: episode.airDateUtc,
      source: 'sonarr',
      type: 'episode',
      description: episode.title,
      allDay: false,
    })) };
  } catch {
    return { events: [], ok: false };
  }
}

export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    const user = await requireApiUser(request);
    if (!feedRateLimit.allow(user.id) || !(release = feedConcurrency.acquire(user.id))) {
      throw new ApiSecurityError('Too many feed requests', 429, 'rate_limit_exceeded');
    }
    const body = assertRecord(await readBoundedJson(request), 'Calendar request');
    const rawIcalUrls = body.icalUrls ?? [];
    if (!Array.isArray(rawIcalUrls) || rawIcalUrls.length > 10) {
      throw new ValidationError('icalUrls must contain at most 10 URLs');
    }
    const icalUrls = rawIcalUrls.map((value) => {
      if (typeof value !== 'string' || !value.trim() || value.length > 2048) {
        throw new ValidationError('Each iCal URL must be a valid string');
      }
      return value.trim();
    });
    const [radarr, sonarr] = await Promise.all([
      resolveArrConnection(
        parseOptionalIntegrationId(body.radarrIntegrationId, 'radarrIntegrationId'),
        'radarr',
        user,
      ),
      resolveArrConnection(
        parseOptionalIntegrationId(body.sonarrIntegrationId, 'sonarrIntegrationId'),
        'sonarr',
        user,
      ),
    ]);
    const requests: Promise<CalendarFetchResult>[] = icalUrls.map(fetchICalEvents);
    if (radarr) requests.push(fetchRadarrEvents(radarr));
    if (sonarr) requests.push(fetchSonarrEvents(sonarr));
    const results = await Promise.all(requests);
    if (results.length > 0 && results.every((result) => !result.ok)) {
      throw new ApiSecurityError(
        'Unable to fetch the configured calendar sources',
        502,
        'upstream_request_failed',
      );
    }
    const allEvents = results.flatMap((result) => result.events);
    allEvents.sort((left, right) =>
      new Date(left.date).getTime() - new Date(right.date).getTime(),
    );

    return NextResponse.json(allEvents);
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch calendar data');
  } finally { release?.(); }
}
