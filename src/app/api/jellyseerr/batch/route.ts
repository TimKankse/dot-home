import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptSensitiveFields } from '@/utils/crypto';

const CACHE_TTL_HOURS = 24;

interface MediaDetails {
  title?: string;
  name?: string;
  posterPath?: string;
}

interface BatchRequest {
  movies: number[];
  tvShows: number[];
}

interface BatchResponse {
  movies: Record<string, MediaDetails>;
  tvShows: Record<string, MediaDetails>;
}

async function getCredentials(req: Request) {
  const integrationId = req.headers.get('x-integration-id');
  let url = req.headers.get('x-jellyseerr-url');
  let apiKey = req.headers.get('x-jellyseerr-apikey');

  if (integrationId) {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    });
    
    if (integration) {
      const config = decryptSensitiveFields(JSON.parse(integration.config));
      url = (config.externalUrl || config.url) as string;
      apiKey = config.apiKey as string;
    }
  }
  return { url, apiKey };
}

async function fetchMediaDetails(
  jellyseerrUrl: string, 
  apiKey: string, 
  mediaType: 'movie' | 'tv', 
  id: number
): Promise<MediaDetails | null> {
  try {
    const response = await fetch(`${jellyseerrUrl}/api/v1/${mediaType}/${id}`, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      title: data.title,
      name: data.name,
      posterPath: data.posterPath,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { url: jellyseerrUrl, apiKey } = await getCredentials(request);

  if (!jellyseerrUrl || !apiKey) {
    return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
  }

  try {
    const body: BatchRequest = await request.json();
    const { movies = [], tvShows = [] } = body;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);

    const result: BatchResponse = {
      movies: {},
      tvShows: {},
    };

    // Check cache for all IDs
    const allCacheIds = [
      ...movies.map(id => `movie-${id}`),
      ...tvShows.map(id => `tv-${id}`)
    ];

    const cachedItems = await prisma.mediaCache.findMany({
      where: {
        id: { in: allCacheIds },
        expiresAt: { gt: now }
      }
    });

    const cachedMap = new Map(cachedItems.map(item => [item.id, JSON.parse(item.details)]));

    // Collect IDs that need fetching
    const movieIdsToFetch: number[] = [];
    const tvIdsToFetch: number[] = [];

    for (const id of movies) {
      const cached = cachedMap.get(`movie-${id}`);
      if (cached) {
        result.movies[id] = cached;
      } else {
        movieIdsToFetch.push(id);
      }
    }

    for (const id of tvShows) {
      const cached = cachedMap.get(`tv-${id}`);
      if (cached) {
        result.tvShows[id] = cached;
      } else {
        tvIdsToFetch.push(id);
      }
    }

    // Fetch missing items in parallel
    const fetchPromises: Promise<void>[] = [];

    for (const id of movieIdsToFetch) {
      fetchPromises.push(
        fetchMediaDetails(jellyseerrUrl, apiKey, 'movie', id).then(async (details) => {
          if (details) {
            result.movies[id] = details;
            // Cache the result
            await prisma.mediaCache.upsert({
              where: { id: `movie-${id}` },
              update: { details: JSON.stringify(details), expiresAt },
              create: { id: `movie-${id}`, details: JSON.stringify(details), expiresAt }
            }).catch(() => {}); // Ignore cache write errors
          }
        })
      );
    }

    for (const id of tvIdsToFetch) {
      fetchPromises.push(
        fetchMediaDetails(jellyseerrUrl, apiKey, 'tv', id).then(async (details) => {
          if (details) {
            result.tvShows[id] = details;
            // Cache the result
            await prisma.mediaCache.upsert({
              where: { id: `tv-${id}` },
              update: { details: JSON.stringify(details), expiresAt },
              create: { id: `tv-${id}`, details: JSON.stringify(details), expiresAt }
            }).catch(() => {}); // Ignore cache write errors
          }
        })
      );
    }

    await Promise.all(fetchPromises);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in Jellyseerr batch:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
