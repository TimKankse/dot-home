import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_REQUEST_HEADER } from './request-security';

const getServerSessionMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }));
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { requireApiUser } from './api-security';
import { authOptions } from './auth';

describe('API security', () => {
  beforeEach(() => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'admin' },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      disabledAt: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a foreign mutation origin before reading the session', async () => {
    await expect(requireApiUser(new Request(
      'https://home.example.test/api/integrations',
      {
        method: 'POST',
        headers: {
          [APP_REQUEST_HEADER]: '1',
          'Sec-Fetch-Site': 'cross-site',
        },
      },
    ))).rejects.toMatchObject({ code: 'cross_site_request', status: 403 });
    expect(getServerSessionMock).not.toHaveBeenCalled();
  });

  it('rejects a disabled live user even if a session object exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      disabledAt: new Date(),
    });

    await expect(requireApiUser()).rejects.toMatchObject({
      code: 'session_revoked',
      status: 401,
    });
  });

  it('uses the live database role for authorization', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'viewer',
      disabledAt: null,
    });

    await expect(requireApiUser()).resolves.toEqual({ id: 'user-1', role: 'viewer' });
  });

  it('uses one database validation per API session and revalidates the next request', async () => {
    const jwt = authOptions.callbacks!.jwt!;
    const sessionCallback = authOptions.callbacks!.session!;
    getServerSessionMock.mockImplementation(async () => {
      const token = await jwt({ token: { id: 'user-1', role: 'admin', sessionVersion: 0 } } as Parameters<typeof jwt>[0]);
      return sessionCallback({ session: { user: { id: 'user-1', role: 'admin' }, expires: '' }, token } as Parameters<typeof sessionCallback>[0]);
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'admin', disabledAt: null, sessionVersion: 0 });
    await expect(requireApiUser()).resolves.toEqual({ id: 'user-1', role: 'admin' });
    expect(prismaMock.user.findUnique).toHaveBeenCalledOnce();
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'viewer', disabledAt: null, sessionVersion: 1 });
    await expect(requireApiUser()).rejects.toMatchObject({ status: 401 });
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2);
  });
});
