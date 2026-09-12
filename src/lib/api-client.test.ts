import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from './api-client';
import { APP_REQUEST_HEADER } from './request-security';

describe('apiFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adds the application header to unsafe requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get(APP_REQUEST_HEADER)).toBe('1');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('leaves safe requests simple', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/config');

    expect(fetchMock).toHaveBeenCalledWith('/api/config', {});
  });
});
