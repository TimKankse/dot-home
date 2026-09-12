import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import {
  ApiSecurityError,
  apiSecurityErrorResponse,
  requireApiUser,
} from '@/lib/api-security';
import { resolveAuthorizedIntegration } from '@/lib/integration-access';
import { requireIntegrationConfigString } from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';
import { ValidationError, assertRecord } from '@/lib/validation';

const parseOptionalIntegrationId = (value: unknown): string | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > 128) {
    throw new ValidationError('integrationId must be a valid integration ID');
  }
  return value.trim();
};

const prepareStoredFeedRequest = (value: string) => {
  const url = new URL(value);
  const headers = new Headers({
    'User-Agent': 'dot-home RSS reader',
    Accept: 'application/rss+xml, application/xml, text/xml, */*;q=0.8',
  });

  if (url.username || url.password) {
    const username = decodeURIComponent(url.username);
    const password = decodeURIComponent(url.password);
    url.username = '';
    url.password = '';
    headers.set(
      'Authorization',
      `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    );
  }

  return { url, headers };
};

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = assertRecord(await request.json(), 'RSS request');
    const rawUrls = body.urls ?? [];
    if (!Array.isArray(rawUrls) || rawUrls.length > 10) {
      throw new ValidationError('At most 10 public feed URLs are allowed');
    }
    const urls = rawUrls.map((value) => {
      if (typeof value !== 'string' || !value.trim() || value.length > 2048) {
        throw new ValidationError('Each feed URL must be a valid string');
      }
      return value.trim();
    });
    const integrationId = parseOptionalIntegrationId(body.integrationId);
    if (urls.length === 0 && !integrationId) {
      throw new ValidationError('At least one RSS source is required');
    }
    const storedIntegration = integrationId
      ? await resolveAuthorizedIntegration({
          integrationId,
          user,
          expectedTypes: ['rss'],
          requiredPermission: 'view',
        })
      : undefined;
    const parser = new Parser({
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
    const fetchFeed = async (
      url: string | URL,
      options: { stored?: boolean; headers?: Headers } = {},
    ) => {
      try {
        const response = await fetchOutbound(
          url,
          {
            headers: options.headers || {
              'User-Agent': 'dot-home RSS reader',
              Accept: 'application/rss+xml, application/xml, text/xml, */*;q=0.8',
            },
            cache: 'no-store',
          },
          {
            policy: options.stored ? 'trusted-integration' : 'public-internet',
            timeoutMs: 10_000,
            allowCrossOriginRedirects: !options.stored,
          },
        );
        if (!response.ok) return { ok: false as const, items: [] };
        const feed = await parser.parseString(await response.text());
        const items = feed.items.map(item => {
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
        return { ok: true as const, items };
      } catch {
        return { ok: false as const, items: [] };
      }
    };

    const requests = urls.map((url) => fetchFeed(url));
    if (storedIntegration) {
      const storedUrlField = typeof storedIntegration.config.secretUrl === 'string'
        ? 'secretUrl'
        : 'feedUrl';
      const storedFeed = prepareStoredFeedRequest(
        requireIntegrationConfigString(storedIntegration, storedUrlField),
      );
      requests.push(fetchFeed(storedFeed.url, {
        stored: true,
        headers: storedFeed.headers,
      }));
    }
    const feedResults = await Promise.all(requests);
    if (feedResults.every((result) => !result.ok)) {
      throw new ApiSecurityError(
        'Unable to fetch the configured RSS feeds',
        502,
        'upstream_request_failed',
      );
    }
    const flatItems = feedResults.flatMap((result) => result.items);

    // Sort by date (newest first)
    flatItems.sort((a, b) => {
      const dateA = new Date(a.isoDate || a.pubDate || 0);
      const dateB = new Date(b.isoDate || b.pubDate || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({
      title: requests.length > 1 ? 'Combined Feed' : (flatItems[0]?._feedTitle || 'RSS Feed'),
      description: 'Aggregated feeds',
      items: flatItems,
    });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch RSS feed');
  }
}
