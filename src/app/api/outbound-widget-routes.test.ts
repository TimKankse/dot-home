import { beforeEach, describe, expect, it, vi } from 'vitest';

const securityMock = vi.hoisted(() => ({ requireApiUser: vi.fn() }));
const accessMock = vi.hoisted(() => ({ resolveAuthorizedIntegration: vi.fn() }));
const connectionMock = vi.hoisted(() => ({
  resolveIntegrationBaseUrl: vi.fn(),
  requireIntegrationConfigString: vi.fn(),
  buildIntegrationUrl: vi.fn(),
}));
const fetchOutboundMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-security')>('@/lib/api-security');
  return { ...actual, requireApiUser: securityMock.requireApiUser };
});
vi.mock('@/lib/integration-access', () => accessMock);
vi.mock('@/lib/integration-connection', () => connectionMock);
vi.mock('@/lib/outbound-http', () => ({ fetchOutbound: fetchOutboundMock }));

import { POST as fetchCalendar } from './calendar/route';
import { POST as fetchRss } from './rss/route';

describe('dedicated outbound widget routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    securityMock.requireApiUser.mockResolvedValue({ id: 'user-1', role: 'member' });
    accessMock.resolveAuthorizedIntegration.mockImplementation(({ integrationId, expectedTypes }) =>
      Promise.resolve({
        id: integrationId,
        ownerId: 'user-1',
        name: expectedTypes[0],
        type: expectedTypes[0],
        permission: 'view',
        config: { url: `http://${expectedTypes[0]}:8000`, apiKey: `${expectedTypes[0]}-secret` },
      }),
    );
    connectionMock.resolveIntegrationBaseUrl.mockImplementation((integration) =>
      Promise.resolve(new URL(integration.config.url)),
    );
    connectionMock.requireIntegrationConfigString.mockImplementation(
      (integration, field) => integration.config[field],
    );
    connectionMock.buildIntegrationUrl.mockImplementation(
      (baseUrl: URL, pathname: string) => new URL(pathname, baseUrl),
    );
  });

  it('resolves calendar service IDs and keeps API keys in upstream headers', async () => {
    fetchOutboundMock.mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const response = await fetchCalendar(new Request('https://home.example.test/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        radarrIntegrationId: 'radarr-1',
        sonarrIntegrationId: 'sonarr-1',
        radarrUrl: 'http://attacker.invalid',
        radarrApiKey: 'attacker-secret',
      }),
    }));

    expect(response.status).toBe(200);
    expect(accessMock.resolveAuthorizedIntegration).toHaveBeenCalledWith(expect.objectContaining({
      integrationId: 'radarr-1',
      expectedTypes: ['radarr'],
      requiredPermission: 'view',
    }));
    expect(accessMock.resolveAuthorizedIntegration).toHaveBeenCalledWith(expect.objectContaining({
      integrationId: 'sonarr-1',
      expectedTypes: ['sonarr'],
      requiredPermission: 'view',
    }));
    const [radarrTarget, radarrInit, radarrOptions] = fetchOutboundMock.mock.calls[0];
    expect((radarrTarget as URL).hostname).toBe('radarr');
    expect((radarrInit as RequestInit).headers).toEqual({ 'X-Api-Key': 'radarr-secret' });
    expect(radarrOptions).toMatchObject({ policy: 'trusted-integration' });
    expect((radarrTarget as URL).search).not.toContain('secret');
  });

  it('fetches RSS XML through the public-internet pinned transport', async () => {
    fetchOutboundMock.mockResolvedValue(new Response(
      '<?xml version="1.0"?><rss version="2.0"><channel><title>Test Feed</title><item><title>Item</title><link>https://example.test/item</link></item></channel></rss>',
      { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
    ));

    const response = await fetchRss(new Request('https://home.example.test/api/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: ['https://feeds.example.test/rss'] }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      title: 'Test Feed',
      items: [expect.objectContaining({ title: 'Item' })],
    });
    expect(fetchOutboundMock).toHaveBeenCalledWith(
      'https://feeds.example.test/rss',
      expect.any(Object),
      expect.objectContaining({
        policy: 'public-internet',
        allowCrossOriginRedirects: true,
      }),
    );
  });

  it('fetches a private RSS feed only through an authorized stored integration', async () => {
    accessMock.resolveAuthorizedIntegration.mockResolvedValueOnce({
      id: 'rss-1',
      ownerId: 'user-1',
      name: 'FreshRSS',
      type: 'rss',
      permission: 'view',
      config: {
        secretUrl: 'http://192.168.1.19:3033/i/?a=rss&token=stored-secret',
      },
    });
    fetchOutboundMock.mockResolvedValue(new Response(
      '<?xml version="1.0"?><rss version="2.0"><channel><title>Private Feed</title><item><title>Private Item</title></item></channel></rss>',
      { status: 200, headers: { 'Content-Type': 'application/rss+xml' } },
    ));

    const response = await fetchRss(new Request('https://home.example.test/api/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [], integrationId: 'rss-1' }),
    }));

    expect(response.status).toBe(200);
    expect(accessMock.resolveAuthorizedIntegration).toHaveBeenCalledWith({
      integrationId: 'rss-1',
      user: { id: 'user-1', role: 'member' },
      expectedTypes: ['rss'],
      requiredPermission: 'view',
    });
    const [target, , options] = fetchOutboundMock.mock.calls[0];
    expect(target).toMatchObject({ hostname: '192.168.1.19', port: '3033' });
    expect(options).toMatchObject({
      policy: 'trusted-integration',
      allowCrossOriginRedirects: false,
    });
  });

  it('reports an upstream error instead of a misleading empty feed', async () => {
    fetchOutboundMock.mockRejectedValue(new Error('connection failed'));

    const rssResponse = await fetchRss(new Request('https://home.example.test/api/rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: ['https://feeds.example.test/rss'] }),
    }));
    const calendarResponse = await fetchCalendar(new Request(
      'https://home.example.test/api/calendar',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icalUrls: ['https://calendar.example.test/feed.ics'] }),
      },
    ));

    expect(rssResponse.status).toBe(502);
    expect(calendarResponse.status).toBe(502);
    await expect(rssResponse.json()).resolves.toMatchObject({ code: 'upstream_request_failed' });
    await expect(calendarResponse.json()).resolves.toMatchObject({ code: 'upstream_request_failed' });
  });
});
