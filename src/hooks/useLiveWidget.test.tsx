import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveWidget } from './useLiveWidget';
import { topicKey } from '@/lib/live/types';

class MockEvents extends EventTarget {
  static instances: MockEvents[] = [];
  close = vi.fn();
  onerror: (() => void) | null = null;
  constructor(public url: string) { super(); MockEvents.instances.push(this); }
}
beforeEach(() => {
  vi.useFakeTimers();
  MockEvents.instances = [];
  vi.stubGlobal('EventSource', MockEvents);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('shared browser live subscription', () => {
  it('batches widgets into one connection and distributes each topic to the correct subscriber', async () => {
    const a = renderHook(() => useLiveWidget<{ speed: number }>('a', 'queue'));
    const b = renderHook(() => useLiveWidget<unknown[]>('b', 'sessions'));
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(MockEvents.instances).toHaveLength(1);
    const source = MockEvents.instances[0];
    const topics = JSON.parse(new URL(source.url, 'http://home.test').searchParams.get('topics')!);
    expect(topics).toHaveLength(2);
    act(() => source.dispatchEvent(new MessageEvent('update', {
      data: JSON.stringify({ key: topicKey({ integrationId: 'a', channel: 'queue' }), data: { speed: 10 } }),
    })));
    expect(a.result.current.data).toEqual({ speed: 10 });
    expect(b.result.current.data).toBeUndefined();
    a.unmount(); b.unmount();
    expect(source.close).toHaveBeenCalled();
  });
  it('closes when hidden and reconnects when visible; revocation clears cached data', async () => {
    const hook = renderHook(() => useLiveWidget('a', 'queue'));
    await act(() => vi.advanceTimersByTimeAsync(50));
    const source = MockEvents.instances[0];
    act(() => source.dispatchEvent(new MessageEvent('update', { data: JSON.stringify({
      key: topicKey({ integrationId: 'a', channel: 'queue' }), data: { speed: 10 },
    }) })));
    act(() => source.dispatchEvent(new MessageEvent('reset')));
    expect(hook.result.current.data).toBeUndefined();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(source.close).toHaveBeenCalled();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(MockEvents.instances).toHaveLength(2);
    hook.unmount();
  });
});
