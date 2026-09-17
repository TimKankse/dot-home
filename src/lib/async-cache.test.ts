// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsyncCache } from './async-cache';

afterEach(() => vi.useRealTimers());
describe('bounded shared requests', () => {
  it('coalesces 50 simultaneous readers and starts TTL after a slow response finishes', async () => {
    vi.useFakeTimers();
    const cache = new AsyncCache<number>();
    const load = vi.fn(async () => { await new Promise(resolve => setTimeout(resolve, 3000)); return 42; });
    const readers = Array.from({ length: 50 }, () => cache.get('metrics', 1500, load));
    await vi.advanceTimersByTimeAsync(3000);
    expect(await Promise.all(readers)).toEqual(Array(50).fill(42));
    expect(load).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1499);
    expect(await cache.get('metrics', 1500, load)).toBe(42);
    expect(load).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    const next = cache.get('metrics', 1500, load);
    await vi.advanceTimersByTimeAsync(3000);
    await next;
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('cancels upstream only after the final reader disconnects', async () => {
    const cache = new AsyncCache<number>();
    let upstream: AbortSignal;
    const load = vi.fn((signal: AbortSignal) => {
      upstream = signal;
      return new Promise<number>((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    });
    const a = new AbortController(); const b = new AbortController();
    const first = cache.get('metrics', 1500, load, a.signal).catch(() => 'aborted');
    const second = cache.get('metrics', 1500, load, b.signal).catch(() => 'aborted');
    await Promise.resolve();
    a.abort();
    expect(await first).toBe('aborted');
    expect(upstream!.aborted).toBe(false);
    b.abort();
    expect(await second).toBe('aborted');
    expect(upstream!.aborted).toBe(true);
    expect(await cache.get('metrics', 1500, async () => 10)).toBe(10);
  });
  it('evicts by memory and entry limits instead of retaining every historical URL', async () => {
    const cache = new AsyncCache<string>(2, 10);
    const load = vi.fn(async () => '1234'); // six encoded bytes
    await cache.get('a', 1000, load);
    await cache.get('b', 1000, load);
    await cache.get('a', 1000, load);
    expect(load).toHaveBeenCalledTimes(3);
    const entries = new AsyncCache<number>(1);
    const number = vi.fn(async () => 1);
    await entries.get('a', 1000, number);
    await entries.get('b', 1000, number);
    await entries.get('a', 1000, number);
    expect(number).toHaveBeenCalledTimes(3);
  });
  it('does not retain failures or oversized responses', async () => {
    const cache = new AsyncCache<string>(2, 2);
    await expect(cache.get('a', 1000, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    const load = vi.fn(async () => 'large');
    await cache.get('a', 1000, load);
    await cache.get('a', 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
