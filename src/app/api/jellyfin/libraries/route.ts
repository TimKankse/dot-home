import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType: string;
  Counts: { Series?: number; Episodes?: number; Movies?: number };
  TotalSize: number;
}

async function getItemCount(baseUrl: string, apiKey: string, viewId: string, includeItemTypes: string[]): Promise<number> {
  const countsUrl = `${baseUrl}/Items/Counts?ParentId=${viewId}&Recursive=true&IncludeItemTypes=${includeItemTypes.join(',')}`;
  const response = await fetch(countsUrl, {
    headers: { 'X-Emby-Token': apiKey }
  });
  
  if (!response.ok) return 0;
  
  const data = await response.json();
  return (data.MovieCount || 0) + (data.SeriesCount || 0) + (data.EpisodeCount || 0);
}

async function calculateTotalSize(baseUrl: string, apiKey: string, viewId: string, includeItemTypes: string[]): Promise<number> {
  const itemsUrl = `${baseUrl}/Items?ParentId=${viewId}&Recursive=true&IncludeItemTypes=${includeItemTypes.join(',')}&Fields=MediaSources`;
  
  const response = await fetch(itemsUrl, {
    headers: { 'X-Emby-Token': apiKey }
  });
  
  if (!response.ok) return 0;
  
  const data = await response.json();
  let totalSize = 0;
  
  interface MediaSource { Size: number; }
  data.Items.forEach((item: { MediaSources?: MediaSource[] }) => {
    if (item.MediaSources) {
      item.MediaSources.forEach((source: MediaSource) => {
        if (source.Size) {
          totalSize += source.Size;
        }
      });
    }
  });
  
  return totalSize;
}

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-jellyfin-url');
  const apiKey = request.headers.get('x-jellyfin-apikey');
  const userId = request.headers.get('x-jellyfin-userid');
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (!url || !apiKey || !userId) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  try {
    const baseUrl = url.replace(/\/$/, '');
    
    const viewsResponse = await fetch(`${baseUrl}/Users/${userId}/Views`, {
      headers: { 'X-Emby-Token': apiKey },
    });

    if (!viewsResponse.ok) {
      console.error(`[Jellyfin] Failed to fetch views: ${viewsResponse.status} ${viewsResponse.statusText}`);
      throw new Error(`Failed to fetch views: ${viewsResponse.statusText}`);
    }

    const viewsData = await viewsResponse.json();
    
    const libraries = await Promise.all(viewsData.Items.map(async (view: any) => {
      const libraryInfo: JellyfinLibrary = {
        Id: view.Id,
        Name: view.Name,
        CollectionType: view.CollectionType,
        Counts: {},
        TotalSize: 0,
      };

      const includeItemTypes = view.CollectionType === 'tvshows' 
        ? ['Series', 'Episode'] 
        : view.CollectionType === 'movies' 
          ? ['Movie'] 
          : [];

      if (includeItemTypes.length === 0) {
        return libraryInfo;
      }

      // Always fetch counts (lightweight)
      const countsUrl = `${baseUrl}/Items/Counts?ParentId=${view.Id}&Recursive=true&IncludeItemTypes=${includeItemTypes.join(',')}`;
      try {
        const countsResponse = await fetch(countsUrl, {
          headers: { 'X-Emby-Token': apiKey }
        });
        
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

      // If mode is counts-only, skip size calculation
      if (mode === 'counts') {
        return libraryInfo;
      }

      // Calculate current item count for cache key
      const currentItemCount = (libraryInfo.Counts.Movies || 0) 
        + (libraryInfo.Counts.Series || 0) 
        + (libraryInfo.Counts.Episodes || 0);

      // Check cache
      try {
        const cached = await prisma.libraryCache.findUnique({
          where: { id: view.Id }
        });

        if (cached && cached.itemCount === currentItemCount) {
          // Cache hit - use cached size
          libraryInfo.TotalSize = Number(cached.totalSize);
          return libraryInfo;
        }

        // Cache miss or stale - calculate size
        const totalSize = await calculateTotalSize(baseUrl, apiKey, view.Id, includeItemTypes);
        libraryInfo.TotalSize = totalSize;

        // Update cache
        await prisma.libraryCache.upsert({
          where: { id: view.Id },
          update: {
            itemCount: currentItemCount,
            totalSize: BigInt(totalSize),
          },
          create: {
            id: view.Id,
            itemCount: currentItemCount,
            totalSize: BigInt(totalSize),
          }
        });
      } catch (cacheError) {
        console.error(`[Jellyfin] Cache error for ${view.Name}:`, cacheError);
        // Fallback: calculate size without caching
        libraryInfo.TotalSize = await calculateTotalSize(baseUrl, apiKey, view.Id, includeItemTypes);
      }

      return libraryInfo;
    }));

    return NextResponse.json(libraries);

  } catch (error) {
    console.error('Jellyfin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Jellyfin data' }, { status: 500 });
  }
}
