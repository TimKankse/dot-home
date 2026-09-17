// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ token: vi.fn(), current: vi.fn(), authorize: vi.fn(), data: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken: mocks.token }));
vi.mock('@/lib/session-revocation', () => ({ isSessionTokenCurrent: mocks.current }));
vi.mock('@/lib/integration-access', () => ({ resolveAuthorizedIntegration: mocks.authorize }));
vi.mock('@/lib/integration-connection', () => ({
  resolveRequestIntegration: vi.fn(),
  resolveIntegrationBaseUrl: async (integration: { config: { url: string } }) => new URL(integration.config.url),
}));
vi.mock('./data', () => ({ fetchNetdataData: mocks.data }));
import { GET } from './route';
import { ApiSecurityError } from '@/lib/api-security';
let controllers: AbortController[];
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); controllers = [];
  mocks.token.mockResolvedValue({ id: 'viewer', role: 'admin' });
  mocks.current.mockResolvedValue(true);
  mocks.authorize.mockResolvedValue({ id: 'netdata', config: { url: 'http://netdata.local' } });
  mocks.data.mockResolvedValue({ cpu: { total: 25 } });
});
afterEach(() => { controllers.forEach(controller => controller.abort()); vi.useRealTimers(); });
function request(scope = 'cpu,ram') {
  const controller = new AbortController(); controllers.push(controller);
  return new NextRequest(`http://home.test/api/netdata?integrationId=netdata&scope=${scope}`, { signal: controller.signal });
}
const frame = async (reader: ReadableStreamDefaultReader<Uint8Array>) => new TextDecoder().decode((await reader.read()).value);
it('shares one worker across tabs, canonicalizes scopes, and releases it after the last tab closes', async () => {
  const first = (await GET(request())).body!.getReader();
  await frame(first);
  const second = (await GET(request('ram,cpu'))).body!.getReader();
  await frame(second);
  expect(mocks.data).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(2000);
  await frame(first); await frame(second);
  expect(mocks.data).toHaveBeenCalledTimes(2);
  const signal = mocks.data.mock.calls[0][0].signal as AbortSignal;
  await first.cancel(); expect(signal.aborted).toBe(false);
  await second.cancel(); expect(signal.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(mocks.data).toHaveBeenCalledTimes(2);
});
it('checks authorization before delivering an existing worker snapshot', async () => {
  const first = (await GET(request())).body!.getReader();
  await frame(first);
  mocks.authorize.mockRejectedValue(new ApiSecurityError('Forbidden', 403, 'forbidden'));
  const denied = await GET(request());
  expect(denied.status).toBe(403);
  expect(await denied.text()).not.toContain('25');
  expect(mocks.data).toHaveBeenCalledOnce();
  await first.cancel();
});
it.each(['session', 'config', 'permission'])('revokes an open stream after a %s change', async (change) => {
  const reader = (await GET(request())).body!.getReader();
  await frame(reader);
  if (change === 'session') mocks.current.mockResolvedValue(false);
  if (change === 'config') mocks.authorize.mockResolvedValue({ id: 'netdata', config: { url: 'http://changed.local' } });
  if (change === 'permission') mocks.authorize.mockRejectedValue(new ApiSecurityError('Forbidden', 403, 'forbidden'));
  await vi.advanceTimersByTimeAsync(15_000);
  let received = '';
  for (;;) { const next = await reader.read(); if (next.done) break; received += new TextDecoder().decode(next.value); }
  expect(received).toContain('event: reset');
  expect(mocks.data.mock.calls[0][0].signal.aborted).toBe(true);
});
it('rejects unknown scopes without starting upstream work', async () => {
  expect((await GET(request('unknown'))).status).toBe(400);
  expect(mocks.data).not.toHaveBeenCalled();
});
