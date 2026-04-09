import { NextRequest, NextResponse } from 'next/server';

interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType: string;
  Counts: { Series?: number; Episodes?: number; Movies?: number };
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

      return libraryInfo;
    }));

    return NextResponse.json(libraries);

  } catch (error) {
    console.error('Jellyfin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Jellyfin data' }, { status: 500 });
  }
}
