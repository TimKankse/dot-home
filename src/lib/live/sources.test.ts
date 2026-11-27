// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorizedIntegration } from '@/lib/integration-access';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), watch: vi.fn() }));
vi.mock('@/lib/outbound-http', () => ({
  fetchOutbound: mocks.fetch, validateOutboundUrl: async (url: string) => new URL(url),
}));
vi.mock('./jellyfin-socket', () => ({ watchJellyfinSessions: mocks.watch }));
import { createLiveSource } from './sources';
import { sanitizeSabnzbdQueue } from './sabnzbd';
const integration: AuthorizedIntegration = {
  id: 'j', type: 'jellyfin', name: 'Movies', ownerId: 'owner', permission: 'view', config: { url: 'http://jellyfin.test', apiKey: 'test-key' },
};
beforeEach(() => vi.clearAllMocks());
describe('live integration sources', () => {
  it('uses HTTP until socket data arrives and falls back after the socket stops delivering', async () => {
    const sessions = [{ Id: 'a', NowPlayingItem: { Id: 'film' } }, { Id: 'b', NowPlayingItem: { Id: 'film' } }];
    mocks.fetch.mockImplementation(async () => Response.json(sessions));
    let receiving = false;
    let publish!: (data: unknown[]) => void;
    mocks.watch.mockImplementation((_connection, callback) => {
      publish = callback;
      return { isReceiving: () => receiving };
    });
    const source = createLiveSource(integration, 'sessions');
    const abort = new AbortController();
    source.connect!(vi.fn(), abort.signal);
    await source.poll(abort.signal);
    expect(mocks.fetch).toHaveBeenCalledOnce();
    receiving = true;
    publish([...sessions].reverse());
    expect((await source.poll(abort.signal)).data).toMatchObject([{ Id: 'a' }, { Id: 'b' }]);
    expect(mocks.fetch).toHaveBeenCalledOnce();
    receiving = false;
    await source.poll(abort.signal);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls.every(([url]) => url.pathname === '/Sessions')).toBe(true);
    for (const [, init] of mocks.fetch.mock.calls) {
      expect(init.headers).toEqual({ Authorization: 'MediaBrowser Token="test-key"' });
    }
    abort.abort();
  });

  it('authenticates both requests used to load Jellyfin library stats', async () => {
    mocks.fetch.mockImplementation(async (url, init) => {
      if (new Headers(init.headers).get('Authorization') !== 'MediaBrowser Token="test-key"') {
        return new Response(null, { status: 401 });
      }
      return String(url).endsWith('/Views')
        ? Response.json({ Items: [{ Id: 'movies', Name: 'Movies', CollectionType: 'movies' }] })
        : Response.json({ MovieCount: 2 });
    });
    const source = createLiveSource({
      ...integration,
      config: { ...integration.config, userId: 'jellyfin-user' },
    }, 'libraries');

    expect((await source.poll(new AbortController().signal)).data).toEqual([
      { Id: 'movies', Name: 'Movies', CollectionType: 'movies', Counts: { Movies: 2 } },
    ]);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it('removes archive passwords and unrelated queue fields from both API and live responses', () => {
    const queue = {
      status: 'Downloading', speed: '1', timeleft: '1', paused: false, apiKey: 'secret',
      slots: [{ filename: 'File', percentage: '1', mbleft: '1', mb: '2', status: 'Downloading', timeleft: '1', index: 0, password: 'archive-secret' }],
    };
    const safe = sanitizeSabnzbdQueue(queue);
    expect(safe.slots[0].filename).toBe('File');
    expect(JSON.stringify(safe)).not.toContain('secret');
  });
});
