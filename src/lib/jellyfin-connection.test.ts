import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiUserMock = vi.hoisted(() => vi.fn());
const resolveAuthorizedIntegrationMock = vi.hoisted(() => vi.fn());
const validateOutboundUrlMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-security', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api-security')>(),
  requireApiUser: requireApiUserMock,
}));
vi.mock('@/lib/integration-access', () => ({
  resolveAuthorizedIntegration: resolveAuthorizedIntegrationMock,
}));
vi.mock('@/lib/outbound-http', () => ({
  validateOutboundUrl: validateOutboundUrlMock,
}));

import { resolveJellyfinConnection } from '@/lib/jellyfin-connection';

describe('Jellyfin connection resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireApiUserMock.mockResolvedValue({ id: 'user-1', role: 'member' });
    validateOutboundUrlMock.mockImplementation(async (value: string) => new URL(value));
  });

  it('uses an authorized typed integration without reading client credentials', async () => {
    resolveAuthorizedIntegrationMock.mockResolvedValue({
      config: {
        url: 'http://192.168.1.19:8096',
        apiKey: 'stored-secret',
        userId: 'jellyfin-user-1',
      },
    });
    const request = new Request('https://home.example.test/api/jellyfin/sessions', {
      headers: {
        'x-integration-id': 'integration-1',
        'x-jellyfin-apikey': 'untrusted-client-secret',
      },
    });

    const connection = await resolveJellyfinConnection(request);

    expect(connection).toMatchObject({
      apiKey: 'stored-secret',
      userId: 'jellyfin-user-1',
      source: 'integration',
    });
    expect(resolveAuthorizedIntegrationMock).toHaveBeenCalledWith({
      integrationId: 'integration-1',
      user: { id: 'user-1', role: 'member' },
      expectedTypes: ['jellyfin'],
      requiredPermission: 'view',
    });
  });

  it('rejects inline credentials without an integration ID', async () => {
    resolveAuthorizedIntegrationMock.mockRejectedValue({
      status: 400,
      code: 'integration_required',
    });
    const request = new Request('https://home.example.test/api/jellyfin/sessions', {
      headers: {
        'x-jellyfin-url': 'http://192.168.1.19:8096',
        'x-jellyfin-apikey': 'client-secret',
      },
    });

    await expect(resolveJellyfinConnection(request)).rejects.toMatchObject({
      status: 400,
      code: 'integration_required',
    });
    expect(validateOutboundUrlMock).not.toHaveBeenCalled();
  });

  it('also rejects inline credentials from admins after automatic migration', async () => {
    requireApiUserMock.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    resolveAuthorizedIntegrationMock.mockRejectedValue({
      status: 400,
      code: 'integration_required',
    });
    const request = new Request('https://home.example.test/api/jellyfin/sessions', {
      headers: {
        'x-jellyfin-url': 'http://192.168.1.19:8096',
        'x-jellyfin-apikey': 'client-secret',
        'x-jellyfin-userid': 'jellyfin-user-1',
      },
    });

    await expect(resolveJellyfinConnection(request)).rejects.toMatchObject({
      status: 400,
      code: 'integration_required',
    });
  });
});
