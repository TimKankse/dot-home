import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import { prisma } from '@/lib/db';
import {
  buildIntegrationUrl,
  requireIntegrationConfigString,
  resolveIntegrationBaseUrl,
  resolveRequestIntegration,
} from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';

const CACHE_TTL_HOURS = 24;
const MAX_IDS_PER_TYPE = 50;

interface MediaDetails {
  title?: string;
  name?: string;
  posterPath?: string;
}

const parseIds = (value: unknown): number[] => {
  if (!Array.isArray(value) || value.length > MAX_IDS_PER_TYPE) {
    throw new ApiSecurityError('Invalid media ID list', 400, 'invalid_media_ids');
  }
  const ids = [...new Set(value)];
  if (ids.some((id) => !Number.isSafeInteger(id) || Number(id) <= 0)) {
    throw new ApiSecurityError('Invalid media ID list', 400, 'invalid_media_ids');
  }
  return ids.map(Number);
};

async function fetchMediaDetails(
  baseUrl: URL,
  apiKey: string,
  mediaType: 'movie' | 'tv',
  id: number,
): Promise<MediaDetails | null> {
  const response = await fetchOutbound(
    buildIntegrationUrl(baseUrl, `/api/v1/${mediaType}/${id}`),
    {
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      cache: 'no-store',
    },
    { policy: 'trusted-integration' },
  );
  if (!response.ok) return null;
  const data = await response.json() as MediaDetails;
  return {
    title: data.title,
    name: data.name,
    posterPath: data.posterPath,
  };
}

export async function POST(request: Request) {
  try {
    const integration = await resolveRequestIntegration(request, 'jellyseerr');
    const baseUrl = await resolveIntegrationBaseUrl(integration);
    const apiKey = requireIntegrationConfigString(integration, 'apiKey');
    const body = await request.json() as { movies?: unknown; tvShows?: unknown };
    const movies = parseIds(body.movies ?? []);
    const tvShows = parseIds(body.tvShows ?? []);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);
    const result: {
      movies: Record<string, MediaDetails>;
      tvShows: Record<string, MediaDetails>;
    } = { movies: {}, tvShows: {} };

    // Include the integration ID to avoid one upstream instance populating
    // another instance's cache entries.
    const cacheId = (type: 'movie' | 'tv', id: number) =>
      `${integration.id}:${type}-${id}`;
    const allCacheIds = [
      ...movies.map((id) => cacheId('movie', id)),
      ...tvShows.map((id) => cacheId('tv', id)),
    ];
    const cachedItems = allCacheIds.length
      ? await prisma.mediaCache.findMany({
          where: { id: { in: allCacheIds }, expiresAt: { gt: now } },
        })
      : [];
    const cached = new Map(
      cachedItems.map((item) => [item.id, JSON.parse(item.details) as MediaDetails]),
    );

    const fetchOne = async (type: 'movie' | 'tv', id: number) => {
      const key = cacheId(type, id);
      const existing = cached.get(key);
      const target = type === 'movie' ? result.movies : result.tvShows;
      if (existing) {
        target[id] = existing;
        return;
      }
      const details = await fetchMediaDetails(baseUrl, apiKey, type, id);
      if (!details) return;
      target[id] = details;
      await prisma.mediaCache.upsert({
        where: { id: key },
        update: { details: JSON.stringify(details), expiresAt },
        create: { id: key, details: JSON.stringify(details), expiresAt },
      }).catch(() => undefined);
    };

    await Promise.all([
      ...movies.map((id) => fetchOne('movie', id)),
      ...tvShows.map((id) => fetchOne('tv', id)),
    ]);
    return NextResponse.json(result);
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch Jellyseerr media details');
  }
}
