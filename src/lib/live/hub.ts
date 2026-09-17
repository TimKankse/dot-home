import type { LiveSource, LiveUpdate } from './types';

type Listener = (update: LiveUpdate) => void;
type Worker = {
  source: LiveSource;
  listeners: Set<Listener>;
  controller: AbortController;
  timer?: ReturnType<typeof setTimeout>;
  value?: LiveUpdate;
  serialized?: string;
  polling: boolean;
  refreshRequested: boolean;
  failures: number;
  revision: number;
};

// One worker per integration/configuration/channel in this Node process.
// Entries and their credentials disappear when their last subscriber leaves.
export class SharedLiveHub {
  private workers = new Map<string, Worker>();

  constructor(private readonly capacity = 128) {}

  subscribe(key: string, create: () => LiveSource, listener: Listener): () => void {
    let worker = this.workers.get(key);
    if (!worker) {
      if (this.workers.size >= this.capacity) throw new Error('Live worker limit reached');
      worker = {
        source: create(), listeners: new Set(), controller: new AbortController(),
        polling: false, refreshRequested: false, failures: 0, revision: 0,
      };
      this.workers.set(key, worker);
      const current = worker;
      queueMicrotask(() => {
        if (current.controller.signal.aborted) return;
        current.source.connect?.((data) => {
          current.revision++;
          this.publish(current, { data });
        }, current.controller.signal);
        void this.poll(current);
      });
    }
    worker.listeners.add(listener);
    if (worker.value) listener(worker.value);
    const current = worker;
    return () => {
      current.listeners.delete(listener);
      if (current.listeners.size) return;
      current.controller.abort();
      clearTimeout(current.timer);
      if (this.workers.get(key) === current) this.workers.delete(key);
    };
  }

  refresh(matches: (key: string) => boolean) {
    for (const [key, worker] of this.workers) {
      if (!matches(key)) continue;
      if (worker.polling) worker.refreshRequested = true;
      else {
        clearTimeout(worker.timer);
        void this.poll(worker);
      }
    }
  }

  private publish(worker: Worker, update: LiveUpdate) {
    if (worker.controller.signal.aborted) return;
    const serialized = JSON.stringify(update);
    if (Buffer.byteLength(serialized) > 2 * 1024 * 1024) {
      this.publish(worker, { error: 'Live response is too large' });
      return;
    }
    if (worker.serialized === serialized) return;
    worker.serialized = serialized;
    worker.value = update;
    for (const listener of worker.listeners) listener(update);
  }

  private async poll(worker: Worker) {
    if (worker.polling || worker.controller.signal.aborted) return;
    worker.polling = true;
    const revision = worker.revision;
    let delay = 2000;
    try {
      const result = await worker.source.poll(worker.controller.signal);
      worker.failures = 0;
      delay = Math.max(1000, result.intervalMs);
      if (revision === worker.revision) this.publish(worker, { data: result.data });
    } catch {
      delay = Math.min(60_000, 2000 * 2 ** Math.min(++worker.failures, 5));
      this.publish(worker, { error: 'Unable to refresh integration; retrying' });
    } finally {
      worker.polling = false;
      if (!worker.controller.signal.aborted) {
        if (worker.refreshRequested) delay = 0;
        worker.refreshRequested = false;
        worker.timer = setTimeout(() => void this.poll(worker), delay);
      }
    }
  }
}
