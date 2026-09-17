import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNetdataStore } from './useNetdataStore';
class Events extends EventTarget {
  static all: Events[] = [];
  close = vi.fn();
  onmessage?: (event: MessageEvent) => void;
  onerror?: () => void;
  constructor(public url: string) { super(); Events.all.push(this); }
}
beforeEach(() => { vi.useFakeTimers(); Events.all = []; vi.stubGlobal('EventSource', Events); });
afterEach(() => {
  for (const [key, instance] of Object.entries(useNetdataStore.getState().instances)) {
    const scopes = Object.entries(instance.scopes).flatMap(([scope, count]) => Array(count).fill(scope));
    scopes.forEach((scope, index) => useNetdataStore.getState().unsubscribe({ integrationId: key, scope, refreshInterval: instance.intervals[index] }));
  }
  vi.useRealTimers(); vi.unstubAllGlobals();
});
it('batches mounts and reduces both scopes and frequency after removing a fast widget', async () => {
  const { subscribe, unsubscribe } = useNetdataStore.getState();
  const cpu = { integrationId: 'one', scope: 'cpu', refreshInterval: 2000 };
  const ram = { integrationId: 'one', scope: 'ram', refreshInterval: 10_000 };
  subscribe(cpu); subscribe(ram);
  await vi.advanceTimersByTimeAsync(50);
  expect(Events.all).toHaveLength(1);
  let query = new URL(Events.all[0].url, 'http://home.test').searchParams;
  expect(query.get('scope')).toBe('cpu,ram'); expect(query.get('interval')).toBe('2000');
  unsubscribe(cpu);
  await vi.advanceTimersByTimeAsync(50);
  expect(Events.all[0].close).toHaveBeenCalledOnce();
  query = new URL(Events.all[1].url, 'http://home.test').searchParams;
  expect(query.get('scope')).toBe('ram'); expect(query.get('interval')).toBe('10000');
  Events.all[0].onmessage?.(new MessageEvent('message', { data: '{"cpu":99}' }));
  expect(useNetdataStore.getState().instances.one.data).toBeNull();
  unsubscribe(ram);
  expect(Events.all[1].close).toHaveBeenCalledOnce();
  expect(useNetdataStore.getState().instances).toEqual({});
});
it('honors all scopes and does not reconnect for a duplicate subscription', async () => {
  const { subscribe, unsubscribe } = useNetdataStore.getState();
  subscribe({ integrationId: 'one' });
  subscribe({ integrationId: 'one', scope: 'cpu' });
  await vi.advanceTimersByTimeAsync(50);
  expect(new URL(Events.all[0].url, 'http://home.test').searchParams.get('scope')).toBe('all');
  subscribe({ integrationId: 'one', scope: 'cpu' });
  await vi.advanceTimersByTimeAsync(50);
  expect(Events.all).toHaveLength(1);
  unsubscribe({ integrationId: 'one' });
  await vi.advanceTimersByTimeAsync(50);
  expect(new URL(Events.all[1].url, 'http://home.test').searchParams.get('scope')).toBe('cpu');
});
