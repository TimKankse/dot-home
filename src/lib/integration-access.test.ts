import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  integration: {
    findUnique: vi.fn(),
  },
}));

const resolvePermissionMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/utils/permissions', () => ({
  resolvePermission: resolvePermissionMock,
}));

import { resolveAuthorizedIntegration } from '@/lib/integration-access';

const integration = {
  id: 'integration-1',
  userId: 'owner-1',
  name: 'Home Jellyfin',
  type: 'jellyfin',
  accessLevel: 'PRIVATE',
  config: JSON.stringify({ url: 'http://192.168.1.19:8096', apiKey: 'secret' }),
};

describe('authorized integration resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.integration.findUnique.mockResolvedValue(integration);
    resolvePermissionMock.mockResolvedValue('edit');
  });

  it('returns the server-side config for an authorized matching integration', async () => {
    const result = await resolveAuthorizedIntegration({
      integrationId: integration.id,
      user: { id: integration.userId, role: 'admin' },
      expectedTypes: ['jellyfin'],
    });

    expect(result.config).toEqual({
      url: 'http://192.168.1.19:8096',
      apiKey: 'secret',
    });
    expect(resolvePermissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        objectType: 'integration',
        objectId: integration.id,
        ownerId: integration.userId,
      }),
      integration.userId,
    );
  });

  it('does not reveal whether a wrong-type integration exists', async () => {
    await expect(resolveAuthorizedIntegration({
      integrationId: integration.id,
      user: { id: integration.userId, role: 'admin' },
      expectedTypes: ['sonarr'],
    })).rejects.toMatchObject({
      status: 404,
      code: 'integration_not_found',
    });

    expect(resolvePermissionMock).not.toHaveBeenCalled();
  });

  it('does not expose another user private integration', async () => {
    resolvePermissionMock.mockResolvedValue('none');

    await expect(resolveAuthorizedIntegration({
      integrationId: integration.id,
      user: { id: 'viewer-1', role: 'viewer' },
      expectedTypes: ['jellyfin'],
    })).rejects.toMatchObject({
      status: 404,
      code: 'integration_not_found',
    });
  });

  it('requires edit permission for state-changing integration operations', async () => {
    resolvePermissionMock.mockResolvedValue('view');

    await expect(resolveAuthorizedIntegration({
      integrationId: integration.id,
      user: { id: 'viewer-1', role: 'member' },
      expectedTypes: ['jellyfin'],
      requiredPermission: 'edit',
    })).rejects.toMatchObject({ status: 404 });
  });
});
