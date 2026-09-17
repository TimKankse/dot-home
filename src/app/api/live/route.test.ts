// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getToken: vi.fn(), current: vi.fn(), authorize: vi.fn(), subscribe: vi.fn(), stop: vi.fn(),
}));
vi.mock('next-auth/jwt', () => ({ getToken: mocks.getToken }));
vi.mock('@/lib/session-revocation', () => ({ isSessionTokenCurrent: mocks.current }));
vi.mock('@/lib/integration-access', () => ({ resolveAuthorizedIntegration: mocks.authorize }));
vi.mock('@/lib/live/registry', () => ({
  liveHub: { subscribe: mocks.subscribe },
  liveSourceKey: (integration: { id: string; config: unknown }, channel: string) => JSON.stringify([integration.id, channel, integration.config]),
}));
vi.mock('@/lib/live/sources', () => ({ createLiveSource: vi.fn() }));
import { GET } from './route';

let controller: AbortController;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  controller = new AbortController();
  mocks.getToken.mockResolvedValue({ id: 'user', role: 'member', sessionVersion: 1 });
  mocks.current.mockResolvedValue(true);
  mocks.authorize.mockResolvedValue({ id: 'q', type: 'qbittorrent', config: { url: 'http://private.test' } });
  mocks.subscribe.mockImplementation((_key, _create, listener) => {
    listener({ data: { speed: 10 } });
    return mocks.stop;
  });
});
afterEach(() => { controller.abort(); vi.useRealTimers(); });
const request = (topics: unknown = [{ integrationId: 'q', channel: 'queue' }]) => new NextRequest(
  `http://home.test/api/live?${new URLSearchParams({ topics: JSON.stringify(topics) })}`,
  { signal: controller.signal },
);

describe('authorized live delivery', () => {
  it('never subscribes an unauthorized user to an existing shared worker', async () => {
    mocks.authorize.mockRejectedValue(new Error('no access'));
    const response = await GET(request());
    const reader = response.body!.getReader();
    const initial = new TextDecoder().decode((await reader.read()).value);
    expect(initial).toContain('Integration unavailable');
    expect(initial).not.toContain('speed');
    expect(mocks.subscribe).not.toHaveBeenCalled();
    await reader.cancel();
  });
  it('revokes an open stream and releases the upstream subscription', async () => {
    const response = await GET(request());
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('speed');
    mocks.current.mockResolvedValue(false);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: reset');
    expect((await reader.read()).done).toBe(true);
    expect(mocks.stop).toHaveBeenCalledOnce();
  });
  it('closes and resets when the integration configuration changes', async () => {
    const response = await GET(request());
    const reader = response.body!.getReader();
    await reader.read();
    mocks.authorize.mockResolvedValue({ id: 'q', config: { url: 'http://changed.test' } });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: reset');
    expect((await reader.read()).done).toBe(true);
    expect(mocks.stop).toHaveBeenCalledOnce();
  });
  it('rejects revoked sessions and excessive or unknown subscriptions', async () => {
    mocks.current.mockResolvedValue(false);
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request(Array.from({ length: 25 }, () => ({ integrationId: 'q', channel: 'queue' }))))).status).toBe(400);
    expect((await GET(request([{ integrationId: 'q', channel: 'admin' }]))).status).toBe(400);
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });
});
