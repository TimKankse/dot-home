import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urls = searchParams.getAll('url');

  if (!urls || urls.length === 0) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const parser = new Parser({
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*;q=0.8',
        },
      },
      customFields: {
        item: [
          'source', 
          'dc:source',
          ['media:content', 'media:content', {keepArray: true}],
          ['media:thumbnail', 'media:thumbnail', {keepArray: true}],
          'itunes:image', 
          'image'
        ],
      },
    });

    // Helper function to process a single feed
    const fetchFeed = async (url: string) => {
      try {
        const feed = await parser.parseURL(url);
        return feed.items.map(item => {
          // Thumbnail extraction logic remains same
          let thumbnail = item.enclosure?.url;
          if (!thumbnail && item['media:content']) {
            const mediaContent = item['media:content'];
            if (Array.isArray(mediaContent)) {
              interface MediaObject { $: { type?: string; medium?: string; url?: string } }
              const image = mediaContent.find((m: MediaObject) => m.$?.type?.startsWith('image') || m.$?.medium === 'image');
              thumbnail = image?.$?.url;
            } else {
              thumbnail = mediaContent.$?.url;
            }
          }
          if (!thumbnail && item['media:thumbnail']) {
            const mediaThumbnail = item['media:thumbnail'];
            if (Array.isArray(mediaThumbnail)) {
               thumbnail = mediaThumbnail[0]?.$?.url;
            } else {
               thumbnail = mediaThumbnail.$?.url;
            }
          }
          if (!thumbnail && item['itunes:image']) {
             thumbnail = item['itunes:image'].$?.href;
          }
          if (!thumbnail && item.image) {
            thumbnail = item.image.url || item.image; 
          }
          if (!thumbnail) {
            const content = item.content || item.contentSnippet || '';
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
              thumbnail = imgMatch[1];
            }
          }

          // Publisher logic
          const source = item.source || item['dc:source'];
          let sourceName = typeof source === 'object' ? (source.content || source.title) : source;

          if (!sourceName && item.categories && Array.isArray(item.categories)) {
            const providerCategory = item.categories.find(c => 
              typeof c === 'string' && (c.startsWith('provider_name|') || c.startsWith('site|'))
            );
            if (providerCategory && typeof providerCategory === 'string') {
              sourceName = providerCategory.split('|')[1];
            }
          }

          if (!sourceName && item.link) {
            try {
              const urlObj = new URL(item.link);
              let hostname = urlObj.hostname;
              if (hostname.startsWith('www.')) hostname = hostname.slice(4);
              sourceName = hostname.charAt(0).toUpperCase() + hostname.slice(1);
            } catch {
              // Invalid URL
            }
          }
          
          const publisher = sourceName || feed.title || '';
          const summary = item.contentSnippet || item.content;

          return {
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            contentSnippet: summary,
            isoDate: item.isoDate,
            thumbnail,
            publisher,
            _feedTitle: feed.title // internal usage if needed later
          };
        });
      } catch (e) {
        console.error(`Error fetching feed ${url}:`, e);
        return []; // Return empty array on failure
      }
    };

    const allFeedItems = await Promise.all(urls.map(url => fetchFeed(url)));
    const flatItems = allFeedItems.flat();

    // Sort by date (newest first)
    flatItems.sort((a, b) => {
      const dateA = new Date(a.isoDate || a.pubDate || 0);
      const dateB = new Date(b.isoDate || b.pubDate || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      title: urls.length > 1 ? 'Combined Feed' : (flatItems[0]?._feedTitle || 'RSS Feed'),
      description: 'Aggregated feeds',
      items: flatItems,
    });
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return NextResponse.json({ error: 'Failed to fetch RSS feed. See logs for details.' }, { status: 500 });
  }
}
