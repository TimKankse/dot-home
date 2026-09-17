import { AsyncCache } from '@/lib/async-cache';
import { fetchOutbound } from '@/lib/outbound-http';

export type NetdataConnection = { url: string; key: string; signal?: AbortSignal };
const cache = new AsyncCache<unknown>();

export const fetchNetdataJson = <T>(connection: NetdataConnection, path: string, ttl: number) =>
  cache.get(JSON.stringify([connection.key, path]), ttl, async (signal) => {
    const response = await fetchOutbound(`${connection.url}${path}`, { signal }, {
      policy: 'trusted-integration', timeoutMs: 10_000, maxResponseBytes: 2 * 1024 * 1024,
    });
    if (!response.ok) throw new Error(`Netdata returned ${response.status}`);
    return response.json();
  }, connection.signal) as Promise<T>;
