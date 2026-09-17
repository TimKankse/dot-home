type Cached<T> = { value: T; bytes: number; expires: number };
type Pending<T> = { promise: Promise<T>; controller: AbortController; users: number };

// Bounded TTL/LRU cache with single-flight loading. A disconnected subscriber
// cannot cancel a request another subscriber still needs.
export class AsyncCache<T> {
  private values = new Map<string, Cached<T>>();
  private pending = new Map<string, Pending<T>>();
  private bytes = 0;

  constructor(private capacity = 128, private maxBytes = 32 * 1024 * 1024) {}

  async get(key: string, ttl: number, load: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    signal?.throwIfAborted();
    const now = Date.now();
    for (const [id, value] of this.values) if (value.expires <= now) this.remove(id);
    const cached = this.values.get(key);
    if (cached) {
      this.values.delete(key);
      this.values.set(key, cached);
      return cached.value;
    }
    let pending = this.pending.get(key);
    if (!pending) {
      if (this.pending.size >= this.capacity) throw new Error('Too many pending requests');
      const controller = new AbortController();
      pending = { controller, users: 0, promise: Promise.resolve(undefined as T) };
      const current = pending;
      current.promise = Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return load(controller.signal);
      }).then((value) => {
        if (!controller.signal.aborted && ttl > 0) {
          const bytes = Buffer.byteLength(JSON.stringify(value));
          if (bytes <= this.maxBytes) {
            while (this.values.size >= this.capacity || this.bytes + bytes > this.maxBytes) {
              this.remove(this.values.keys().next().value!);
            }
            this.values.set(key, { value, bytes, expires: Date.now() + ttl });
            this.bytes += bytes;
          }
        }
        return value;
      }).finally(() => {
        if (this.pending.get(key) === current) this.pending.delete(key);
      });
      this.pending.set(key, current);
    }
    const current = pending;
    current.users++;
    return new Promise<T>((resolve, reject) => {
      let done = false;
      const finish = (complete: () => void) => {
        if (done) return;
        done = true;
        signal?.removeEventListener('abort', abort);
        if (--current.users === 0 && this.pending.get(key) === current) {
          this.pending.delete(key);
          current.controller.abort();
        }
        complete();
      };
      const abort = () => finish(() => reject(signal?.reason));
      signal?.addEventListener('abort', abort, { once: true });
      current.promise.then(
        (value) => finish(() => resolve(value)),
        (error) => finish(() => reject(error)),
      );
      if (signal?.aborted) abort();
    });
  }

  private remove(key: string) {
    const value = this.values.get(key);
    if (value) this.bytes -= value.bytes;
    this.values.delete(key);
  }
}
