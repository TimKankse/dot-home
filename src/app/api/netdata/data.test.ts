// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const fetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/outbound-http', () => ({ fetchOutbound: fetch }));
import { fetchNetdataData } from './data';

beforeEach(() => {
  vi.clearAllMocks();
  fetch.mockImplementation(async (target: string) => {
    const url = new URL(target);
    let data: unknown = {};
    if (url.pathname.endsWith('/functions')) data = { functions: { processes: {}, 'mount-points': {} } };
    if (url.searchParams.get('function') === 'processes') data = {
      columns: ['pid', 'name', 'cpu', 'mem', 'user'],
      data: [[1, 'idle', 1, 0, 'user'], [2, 'busy', 99, 0, 'user']],
    };
    if (url.pathname.endsWith('/allmetrics')) data = { 'system.cpu': {
      last_updated: 123, dimensions: { user: { value: 20 }, idle: { value: 80 } },
    } };
    return new Response(JSON.stringify(data));
  });
});
it('coalesces all upstream endpoints for 20 simultaneous views and respects requested process limits', async () => {
  const connection = { url: 'http://netdata.local', key: 'batch' };
  const snapshots = await Promise.all(Array.from({ length: 20 }, (_, index) =>
    fetchNetdataData(connection, ['cpu', 'processes', 'storage'], index % 2 ? 2 : 1)));
  expect(fetch).toHaveBeenCalledTimes(5); // allmetrics, info, function list, processes, mounts
  expect(snapshots[0].processList).toHaveLength(1);
  expect(snapshots[0].processList![0].name).toBe('busy');
  expect(snapshots[1].processList).toHaveLength(2);
  await fetchNetdataData(connection, ['cpu', 'processes', 'storage'], 1);
  expect(fetch).toHaveBeenCalledTimes(5);
});
it('separates configurations and does not fetch process or storage functions for CPU-only views', async () => {
  for (const key of ['before-change', 'after-change']) {
    await fetchNetdataData({ url: 'http://netdata.local', key }, ['cpu'], 10);
  }
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(fetch.mock.calls.every(([url]) => !url.includes('/function'))).toBe(true);
});
