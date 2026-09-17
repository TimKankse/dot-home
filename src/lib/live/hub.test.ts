// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedLiveHub } from './hub';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('shared live workers', () => {
  it('shares a poll, replays the snapshot, and stops after the last subscriber', async () => {
    const hub = new SharedLiveHub();
    const poll = vi.fn().mockResolvedValue({ data: { speed: 10 }, intervalMs: 2000 });
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = hub.subscribe('integration', () => ({ poll }), first);
    await vi.advanceTimersByTimeAsync(0);
    const stopSecond = hub.subscribe('integration', () => { throw new Error('duplicate worker'); }, second);
    expect(poll).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledWith({ data: { speed: 10 } });
    stopFirst();
    await vi.advanceTimersByTimeAsync(2000);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledOnce(); // unchanged values are not broadcast again
    const signal = poll.mock.calls[0][0] as AbortSignal;
    stopSecond();
    expect(signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(poll).toHaveBeenCalledTimes(2);
  });

  it('does not overlap slow requests, and refreshes once after an action', async () => {
    const hub = new SharedLiveHub();
    let finish!: (value: { data: number; intervalMs: number }) => void;
    const poll = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValue({ data: 2, intervalMs: 2000 });
    const stop = hub.subscribe('queue', () => ({ poll }), vi.fn());
    await vi.advanceTimersByTimeAsync(0);
    hub.refresh(() => true);
    hub.refresh(() => true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(poll).toHaveBeenCalledOnce();
    finish({ data: 1, intervalMs: 2000 });
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
    stop();
  });

  it('preserves newer socket data when an older HTTP snapshot finishes', async () => {
    const hub = new SharedLiveHub();
    let publish!: (value: unknown) => void;
    let finish!: (value: { data: string; intervalMs: number }) => void;
    const listener = vi.fn();
    const stop = hub.subscribe('sessions', () => ({
      connect: (callback) => { publish = callback; },
      poll: () => new Promise((resolve) => { finish = resolve; }),
    }), listener);
    await vi.advanceTimersByTimeAsync(0);
    publish('new');
    finish({ data: 'old', intervalMs: 2000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith({ data: 'new' });
    stop();
  });

  it('bounds workers and recovers capacity after disconnection', async () => {
    const hub = new SharedLiveHub(1);
    const source = () => ({ poll: vi.fn().mockResolvedValue({ data: 1, intervalMs: 2000 }) });
    const stop = hub.subscribe('a', source, vi.fn());
    expect(() => hub.subscribe('b', source, vi.fn())).toThrow('limit');
    stop();
    const stopNew = hub.subscribe('b', source, vi.fn());
    stopNew();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('backs off failed services and resumes after recovery', async () => {
    const hub = new SharedLiveHub();
    const poll = vi.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ data: 'recovered', intervalMs: 2000 });
    const listener = vi.fn();
    const stop = hub.subscribe('a', () => ({ poll }), listener);
    await vi.advanceTimersByTimeAsync(3999);
    expect(poll).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ data: 'recovered' });
    stop();
  });
});
