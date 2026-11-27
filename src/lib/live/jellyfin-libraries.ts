import { ApiSecurityError } from '@/lib/api-security';
import { jellyfinAuthHeaders, type JellyfinConnection } from '@/lib/jellyfin-connection';
import { fetchOutbound } from '@/lib/outbound-http';

interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType: string;
  Counts: { Series?: number; Episodes?: number; Movies?: number };
}

interface JellyfinView {
  Id: string;
  Name: string;
  CollectionType: string;
}

export async function readJellyfinLibraries(connection: JellyfinConnection, signal?: AbortSignal) {
  const userId = connection.userId;
  if (!userId) {
    throw new ApiSecurityError(
      'Jellyfin user ID is required',
      400,
      'invalid_integration_config',
    );
  }
  const baseUrl = connection.url.toString().replace(/\/$/, '');

  const viewsResponse = await fetchOutbound(
    `${baseUrl}/Users/${encodeURIComponent(userId)}/Views`,
    {
      headers: jellyfinAuthHeaders(connection.apiKey),
      signal,
      cache: 'no-store',
    },
    { policy: 'trusted-integration', timeoutMs: 10_000 },
  );

  if (!viewsResponse.ok) {
    console.error(`[Jellyfin] Failed to fetch views: ${viewsResponse.status} ${viewsResponse.statusText}`);
    throw new Error(`Failed to fetch views: ${viewsResponse.statusText}`);
  }

  const viewsData = await viewsResponse.json() as { Items?: JellyfinView[] };

  const libraries = await Promise.all((viewsData.Items || []).map(async (view) => {
    const libraryInfo: JellyfinLibrary = {
      Id: view.Id,
      Name: view.Name,
      CollectionType: view.CollectionType,
      Counts: {},
    };

    const includeItemTypes = view.CollectionType === 'tvshows'
      ? ['Series', 'Episode']
      : view.CollectionType === 'movies'
        ? ['Movie']
        : [];

    if (includeItemTypes.length === 0) {
      return libraryInfo;
    }

    // Counts refresh independently of session updates.
    const countsUrl = `${baseUrl}/Items/Counts?ParentId=${encodeURIComponent(view.Id)}&Recursive=true&IncludeItemTypes=${includeItemTypes.join(',')}`;
    try {
      const countsResponse = await fetchOutbound(
        countsUrl,
        {
          headers: jellyfinAuthHeaders(connection.apiKey),
          signal,
          cache: 'no-store',
        },
        { policy: 'trusted-integration', timeoutMs: 10_000 },
      );

      if (countsResponse.ok) {
        const countsData = await countsResponse.json();
        if (view.CollectionType === 'tvshows') {
          libraryInfo.Counts.Series = countsData.SeriesCount;
          libraryInfo.Counts.Episodes = countsData.EpisodeCount;
        } else if (view.CollectionType === 'movies') {
          libraryInfo.Counts.Movies = countsData.MovieCount;
        }
      }
    } catch (err) {
      console.error(`[Jellyfin] Error fetching counts for ${view.Name}:`, err);
    }

    return libraryInfo;
  }));

  return libraries;
}
