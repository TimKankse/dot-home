import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_REQUEST_HEADER } from './request-security';

const getServerSessionMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }));
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { requireApiUser } from './api-security';

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
});
