// Bounds are process-local, matching the single-process container deployment.
// Fail closed at capacity rather than evicting active limits under attack.
export class RequestLimiter {
  private entries = new Map<string, { count: number; expires: number }>();
  constructor(private limit: number, private windowMs: number, private capacity = 10_000) {}
  allow(key: string, now = Date.now()): boolean {
    for (const [id, entry] of this.entries) if (entry.expires <= now) this.entries.delete(id);
    const entry = this.entries.get(key);
    if (entry) {
      if (entry.count >= this.limit) return false;
      entry.count++;
      return true;
    }
    if (this.entries.size >= this.capacity) return false;
    this.entries.set(key, { count: 1, expires: now + this.windowMs });
    return true;
  }
}

export class ConcurrencyLimiter {
  private total = 0;
  private counts = new Map<string, number>();
  constructor(private perKey: number, private maxTotal: number) {}
  acquire(key: string): (() => void) | undefined {
    const count = this.counts.get(key) || 0;
    if (count >= this.perKey || this.total >= this.maxTotal) return;
    this.counts.set(key, count + 1);
    this.total++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.total--;
      const remaining = (this.counts.get(key) || 1) - 1;
      if (remaining) this.counts.set(key, remaining);
      else this.counts.delete(key);
    };
  }
}

export const feedRateLimit = new RequestLimiter(30, 60_000);
export const feedConcurrency = new ConcurrencyLimiter(2, 16);
export const loginAccountLimit = new RequestLimiter(10, 15 * 60_000);
export const loginGlobalLimit = new RequestLimiter(100, 60_000, 1);
export const loginConcurrency = new ConcurrencyLimiter(1, 4);
