import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-jellyfin-url');
  const apiKey = request.headers.get('x-jellyfin-apikey');
  const userId = request.headers.get('x-jellyfin-userid');

  if (!url || !apiKey || !userId) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  try {
    const baseUrl = url.replace(/\/$/, '');
    
    // 1. Fetch User Views (Libraries)
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
    
    const libraries: JellyfinLibrary[] = [];

    // 2. Process each library
    for (const view of viewsData.Items) {
      const libraryInfo: JellyfinLibrary = {
        Id: view.Id,
        Name: view.Name,
        CollectionType: view.CollectionType,
        Counts: {},
        TotalSize: 0,
      };

      // Determine what to count based on collection type
      const includeItemTypes = view.CollectionType === 'tvshows' 
        ? ['Series', 'Episode'] 
        : view.CollectionType === 'movies' 
          ? ['Movie'] 
          : [];

      if (includeItemTypes.length > 0) {
        // Fetch items recursively to get counts and size
        // We need MediaSources to get the size
        const itemsUrl = `${baseUrl}/Items?ParentId=${view.Id}&Recursive=true&IncludeItemTypes=${includeItemTypes.join(',')}&Fields=MediaSources,RunTimeTicks`;
        // console.log(`[Jellyfin] Fetching items for ${view.Name}`);
        
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
          // console.log(`[Jellyfin] Found ${itemsData.Items?.length} items in ${view.Name}`);
          
          // Calculate counts
          if (view.CollectionType === 'tvshows') {
            libraryInfo.Counts.Series = itemsData.Items.filter((i: { Type: string }) => i.Type === 'Series').length;
            libraryInfo.Counts.Episodes = itemsData.Items.filter((i: { Type: string }) => i.Type === 'Episode').length;
          } else if (view.CollectionType === 'movies') {
             libraryInfo.Counts.Movies = itemsData.Items.filter((i: { Type: string }) => i.Type === 'Movie').length;
          }

          // Calculate total size
          // Size is usually in MediaSources[0].Size
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
      }

      libraries.push(libraryInfo);
    }

    return NextResponse.json(libraries);

  } catch (error) {
    console.error('Jellyfin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Jellyfin data' }, { status: 500 });
  }
}
