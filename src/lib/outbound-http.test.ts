import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchOutbound,
  isNonPublicIpAddress,
  validateOutboundUrl,
} from '@/lib/outbound-http';

describe('outbound HTTP policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://attacker.example.test/steal' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOutbound(
      'https://jellyfin.example.test/Sessions',
      { headers: { 'X-Emby-Token': 'secret' } },
      { policy: 'trusted-integration' },
    )).rejects.toMatchObject({ code: 'outbound_redirect_error' });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects credentials embedded in outbound URLs', async () => {
    await expect(validateOutboundUrl(
      'https://user:password@example.com',
      'trusted-integration',
    )).rejects.toMatchObject({ code: 'invalid_outbound_url' });
  });
});
