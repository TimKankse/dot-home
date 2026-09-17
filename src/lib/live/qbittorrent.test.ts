// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthorizedIntegration } from '@/lib/integration-access';
const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/outbound-http', () => ({
  fetchOutbound: fetchMock, validateOutboundUrl: async (url: string) => new URL(url),
}));
import { createQbittorrentReader } from './qbittorrent';
const integration: AuthorizedIntegration = {
  id: 'queue-1', ownerId: 'owner', name: 'Downloads', type: 'qbittorrent', permission: 'view', config: { url: 'http://queue.test' },
};
const torrent = { name: 'Test', state: 'downloading', size: 100, completed: 10, progress: 0.1, eta: 10, dlspeed: 10 };
beforeEach(() => vi.clearAllMocks());
describe('incremental download updates', () => {
  it('merges deltas, removes deleted torrents, and resets on full updates', async () => {
    const replies = [
      { rid: 1, full_update: true, torrents: { a: torrent }, server_state: { dl_info_speed: 10 } },
      { rid: 2, torrents: { a: { progress: 0.5 } } },
      { rid: 3, torrents_removed: ['a'] },
      { rid: 4, torrents: { b: torrent } },
      { rid: 5, full_update: true, torrents: {} },
    ];
    fetchMock.mockImplementation(async () => Response.json(replies.shift()));
    const read = createQbittorrentReader(integration);
    expect((await read()).queue.slots[0].percentage).toBe('10.0');
    const delta = (await read()).queue;
    expect(delta.slots[0]).toMatchObject({ filename: 'Test', percentage: '50.0' });
    expect(delta.speed).toBe('10 B/s');
    expect((await read()).queue.slots).toEqual([]);
    expect((await read()).queue.slots).toHaveLength(1);
    expect((await read()).queue.slots).toEqual([]);
    expect(fetchMock.mock.calls.map(([url]) => url.searchParams.get('rid'))).toEqual(['0', '1', '2', '3', '4']);
    expect(fetchMock.mock.calls.every(([url]) => url.pathname === '/api/v2/sync/maindata')).toBe(true);
  });
});
