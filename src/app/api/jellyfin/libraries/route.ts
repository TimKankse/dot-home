import { NextRequest, NextResponse } from 'next/server';

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
      headers: {
        'X-Emby-Token': apiKey,
      },
    });

    if (!viewsResponse.ok) {
      console.error(`[Jellyfin] Failed to fetch views: ${viewsResponse.status} ${viewsResponse.statusText}`);
      const text = await viewsResponse.text();
      console.error(`[Jellyfin] Response body: ${text}`);
      throw new Error(`Failed to fetch views: ${viewsResponse.statusText}`);
    }

    const viewsData = await viewsResponse.json();
    
    interface JellyfinLibrary {
        Id: string;
        Name: string;
        CollectionType: string;
        Counts: { Series?: number; Episodes?: number; Movies?: number };
        TotalSize: number;
    }
    
    // 2. Process each library concurrently
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

      if (includeItemTypes.length > 0) {
        if (mode === 'counts') {
            // LIGHTWEIGHT PATH: Use /Items/Counts
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
        } else {
            // HEAVY PATH: Recursive Items Fetch (with Size)
            const itemsUrl = `${baseUrl}/Items?ParentId=${view.Id}&Recursive=true&IncludeItemTypes=${includeItemTypes.join(',')}&Fields=MediaSources,RunTimeTicks`;
            
            try {
              const itemsResponse = await fetch(
                itemsUrl, 
                {
                  headers: {
                    'X-Emby-Token': apiKey,
                  },
                }
              );

              if (itemsResponse.ok) {
                const itemsData = await itemsResponse.json();
                
                // Calculate counts
                if (view.CollectionType === 'tvshows') {
                  libraryInfo.Counts.Series = itemsData.Items.filter((i: { Type: string }) => i.Type === 'Series').length;
                  libraryInfo.Counts.Episodes = itemsData.Items.filter((i: { Type: string }) => i.Type === 'Episode').length;
                } else if (view.CollectionType === 'movies') {
                   libraryInfo.Counts.Movies = itemsData.Items.filter((i: { Type: string }) => i.Type === 'Movie').length;
                }

                let totalSize = 0;
                interface MediaSource { Size: number; }
                itemsData.Items.forEach((item: { MediaSources?: MediaSource[] }) => {
                   if (item.MediaSources) {
                     item.MediaSources.forEach((source: MediaSource) => {
                       if (source.Size) {
                         totalSize += source.Size;
                       }
                     });
                   }
                });
                libraryInfo.TotalSize = totalSize;
              } else {
                  console.error(`[Jellyfin] Failed to fetch items for ${view.Name}: ${itemsResponse.status}`);
              }
            } catch (err) {
              console.error(`[Jellyfin] Error fetching items for ${view.Name}:`, err);
            }
        }
      }

      return libraryInfo;
    }));

    return NextResponse.json(libraries);

  } catch (error) {
    console.error('Jellyfin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Jellyfin data' }, { status: 500 });
  }
}
