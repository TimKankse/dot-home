import { Readable } from 'node:stream';
import { gzipSync } from 'node:zlib';

import { describe, expect, it, vi } from 'vitest';

import {
  decodedResponseBody,
  fetchOutbound,
  isNonPublicIpAddress,
  validateOutboundUrl,
} from '@/lib/outbound-http';

describe('outbound HTTP policy', () => {

  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.19',
    '169.254.169.254',
    '192.0.2.10',
    '198.51.100.10',
    '203.0.113.10',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('identifies %s as non-public', (address) => {
    expect(isNonPublicIpAddress(address)).toBe(true);
  });

  it('allows private addresses only for stored integrations', async () => {
    await expect(validateOutboundUrl(
      'http://192.168.1.19:8096',
      'trusted-integration',
    )).resolves.toMatchObject({ hostname: '192.168.1.19' });

    await expect(validateOutboundUrl(
      'http://192.168.1.19:8096',
      'public-internet',
    )).rejects.toMatchObject({ code: 'private_network_url' });
  });

  it('rejects hostnames resolving to a private address', async () => {
    const dnsLookup = vi.fn().mockResolvedValue([
      { address: '10.0.0.20', family: 4 },
    ]);

    await expect(validateOutboundUrl(
      'https://internal.example.test/feed',
      'public-internet',
      { dnsLookup },
    )).rejects.toMatchObject({ code: 'private_network_url' });
  });

  it('accepts a hostname only when every resolved address is public', async () => {
    const dnsLookup = vi.fn().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
    ]);

    await expect(validateOutboundUrl(
      'https://example.com/feed',
      'public-internet',
      { dnsLookup },
    )).resolves.toMatchObject({ hostname: 'example.com' });
  });

  it('does not forward integration credentials across origins', async () => {
    const transport = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://attacker.example.test/steal' },
    }));

    await expect(fetchOutbound(
      'http://127.0.0.1:8096/Sessions',
      { headers: { 'X-Emby-Token': 'secret' } },
      { policy: 'trusted-integration', transport },
    )).rejects.toMatchObject({ code: 'outbound_redirect_error' });

    expect(transport).toHaveBeenCalledOnce();
  });

  it('allows credential-free public feeds to follow a separately vetted redirect', async () => {
    const dnsLookup = vi.fn().mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);
    const transport = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { location: 'https://cdn.example.test/feed.xml' },
      }))
      .mockResolvedValueOnce(new Response('<rss />'));

    const response = await fetchOutbound(
      'https://feeds.example.test/rss',
      {},
      {
        policy: 'public-internet',
        allowCrossOriginRedirects: true,
        dnsLookup,
        transport,
      },
    );

    await expect(response.text()).resolves.toBe('<rss />');
    expect(dnsLookup).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls.map(([target]) => target.url.hostname)).toEqual([
      'feeds.example.test',
      'cdn.example.test',
    ]);
  });

  it('passes the security lookup result directly to the outbound transport', async () => {
    const dnsLookup = vi.fn().mockResolvedValue([
      { address: '127.0.0.1', family: 4 },
    ]);
    const transport = vi.fn().mockResolvedValue(new Response('pinned'));

    const response = await fetchOutbound(
      'http://rebind.test:8096/health',
      {},
      { policy: 'trusted-integration', dnsLookup, transport },
    );

    await expect(response.text()).resolves.toBe('pinned');
    expect(dnsLookup).toHaveBeenCalledOnce();
    expect(dnsLookup).toHaveBeenCalledWith('rebind.test', { all: true, verbatim: true });
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.objectContaining({ hostname: 'rebind.test' }),
        addresses: [{ address: '127.0.0.1', family: 4 }],
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('decodes compressed responses returned by the pinned transport', async () => {
    const headers = new Headers({
      'Content-Encoding': 'gzip',
      'Content-Length': '42',
    });
    const encoded = gzipSync('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');
    const body = decodedResponseBody(Readable.from(encoded), headers);
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));

    expect(Buffer.concat(chunks).toString()).toBe('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');
    expect(headers.has('content-encoding')).toBe(false);
    expect(headers.has('content-length')).toBe(false);
  });

  it('rejects credentials embedded in outbound URLs', async () => {
    await expect(validateOutboundUrl(
      'https://user:password@example.com',
      'trusted-integration',
    )).rejects.toMatchObject({ code: 'invalid_outbound_url' });
  });
});
