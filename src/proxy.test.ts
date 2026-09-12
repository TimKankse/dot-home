import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_REQUEST_HEADER } from '@/lib/request-security';

const getTokenMock = vi.hoisted(() => vi.fn());
const isSessionTokenCurrentMock = vi.hoisted(() => vi.fn());

vi.mock('next-auth/jwt', () => ({ getToken: getTokenMock }));
vi.mock('@/lib/session-revocation', () => ({
  isSessionTokenCurrent: isSessionTokenCurrentMock,
}));

import { proxy } from './proxy';

const request = (
  pathname: string,
  init: ConstructorParameters<typeof NextRequest>[1] = {},
) => new NextRequest(`https://home.example.test${pathname}`, init);

describe('security proxy', () => {
  beforeEach(() => {
    getTokenMock.mockResolvedValue(null);
    isSessionTokenCurrentMock.mockResolvedValue(true);
  });

  it('rejects cross-origin mutations before authentication or route handling', async () => {
    const response = await proxy(request('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        [APP_REQUEST_HEADER]: '1',
        'Sec-Fetch-Site': 'cross-site',
      },
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'cross_site_request' });
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it('does not treat extension-like or public-prefix paths as exempt', async () => {
    const apiResponse = await proxy(request('/api/users.json'));
    const pageResponse = await proxy(request('/setup-admin'));

    expect(apiResponse.status).toBe(401);
    expect(pageResponse.status).toBe(307);
    expect(pageResponse.headers.get('location')).toContain('/login');
  });

  it('only exempts safe requests to known static paths', async () => {
    const staticResponse = await proxy(request('/_next/static/chunks/app.js'));
    const unsafeResponse = await proxy(request('/_next/static/chunks/app.js', {
      method: 'POST',
      headers: { [APP_REQUEST_HEADER]: '1' },
    }));

    expect(staticResponse.headers.get('x-middleware-next')).toBe('1');
    expect(unsafeResponse.status).toBe(307);
  });

  it('clears stale session cookies and blocks the request', async () => {
    getTokenMock.mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      sessionVersion: 2,
    });
    isSessionTokenCurrentMock.mockResolvedValue(false);

    const response = await proxy(request('/api/users'));

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toContain('next-auth.session-token=');
    await expect(response.json()).resolves.toMatchObject({ code: 'session-expired' });
  });
});
