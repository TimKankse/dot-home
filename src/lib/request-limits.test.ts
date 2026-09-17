import { describe, expect, it } from 'vitest';
import { RequestLimiter, ConcurrencyLimiter } from './request-limits';

describe('request resource limits', () => {
  it('limits each account and resets only after its window expires', () => {
    const limiter = new RequestLimiter(2, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 100)).toBe(true);
    expect(limiter.allow('a', 999)).toBe(false);
    expect(limiter.allow('b', 999)).toBe(true);
    expect(limiter.allow('a', 1000)).toBe(true);
  });
  it('cannot evict active limits by supplying many different accounts', () => {
    const limiter = new RequestLimiter(1, 1000, 1);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('b', 0)).toBe(false);
    expect(limiter.allow('a', 1)).toBe(false);
    expect(limiter.allow('b', 1000)).toBe(true);
  });
  it('bounds total and per-user work and releases a slot only once', () => {
    const limiter = new ConcurrencyLimiter(1, 2);
    const a = limiter.acquire('a')!;
    const b = limiter.acquire('b')!;
    expect(limiter.acquire('a')).toBeUndefined();
    expect(limiter.acquire('c')).toBeUndefined();
    a(); a();
    const c = limiter.acquire('c')!;
    expect(limiter.acquire('d')).toBeUndefined();
    b(); c();
  });
});
