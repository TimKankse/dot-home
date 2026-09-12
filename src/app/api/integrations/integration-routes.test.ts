import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  integration: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  objectPermission: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));
const securityMock = vi.hoisted(() => ({
  requireApiUser: vi.fn(),
}));
const accessMock = vi.hoisted(() => ({
  resolveOwnedIntegration: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/api-security', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-security')>('@/lib/api-security');
  return { ...actual, requireApiUser: securityMock.requireApiUser };
});
vi.mock('@/lib/integration-access', () => accessMock);
vi.mock('@/utils/crypto', () => ({
  encryptSensitiveFields: (config: Record<string, unknown>) => config,
}));

import { ApiSecurityError } from '@/lib/api-security';
import { DELETE, POST, PUT } from './route';

const storedJellyfin = {
  id: 'integration-1',
  ownerId: 'user-1',
  name: 'Jellyfin',
  type: 'jellyfin',
  permission: 'edit',
  config: {
    url: 'http://192.168.1.19:8096',
    apiKey: 'stored-secret',
  },
};

describe('integration management routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    securityMock.requireApiUser.mockResolvedValue({ id: 'user-1', role: 'admin' });
    accessMock.resolveOwnedIntegration.mockResolvedValue(storedJellyfin);
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.integration.delete.mockResolvedValue({ id: 'integration-1' });
    prismaMock.objectPermission.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('uses a server-generated ID when creating an integration', async () => {
    prismaMock.integration.create.mockResolvedValue({
      id: 'server-generated-id',
      name: 'qBittorrent',
      type: 'qbittorrent',
      config: JSON.stringify({
        url: 'http://192.168.1.19:8096',
        username: 'admin',
        password: 'secret',
      }),
    });

    const response = await POST(new Request('https://home.example.test/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'client-chosen-id',
        name: 'qBittorrent',
        type: 'qbittorrent',
        config: {
          url: 'http://192.168.1.19:8096',
          username: 'admin',
          password: 'secret',
        },
      }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: 'server-generated-id' });
    expect(prismaMock.integration.create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({ id: expect.anything() }),
    });
  });

  it('never returns a stored RSS feed URL to the browser', async () => {
    const secretUrl = 'http://192.168.1.19:3033/i/?token=stored-secret';
    prismaMock.integration.create.mockResolvedValue({
      id: 'rss-1',
      name: 'FreshRSS',
      type: 'rss',
      config: JSON.stringify({ secretUrl }),
    });

    const response = await POST(new Request('https://home.example.test/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'FreshRSS',
        type: 'rss',
        config: { secretUrl },
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      id: 'rss-1',
      config: { secretUrl: '********' },
    });
    expect(JSON.stringify(body)).not.toContain('stored-secret');
  });

  it('blocks viewers before creating an integration', async () => {
    securityMock.requireApiUser.mockResolvedValue({ id: 'viewer-1', role: 'viewer' });

    const response = await POST(new Request('https://home.example.test/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(403);
    expect(prismaMock.integration.create).not.toHaveBeenCalled();
  });

  it('preserves an omitted stored secret when updating non-secret fields', async () => {
    prismaMock.integration.update.mockResolvedValue({
      id: 'integration-1',
      name: 'Living room Jellyfin',
      type: 'jellyfin',
      config: JSON.stringify({
        url: 'http://192.168.1.20:8096',
        apiKey: 'stored-secret',
      }),
    });

    const response = await PUT(new Request('https://home.example.test/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'integration-1',
        name: 'Living room Jellyfin',
        type: 'jellyfin',
        config: { url: 'http://192.168.1.20:8096' },
      }),
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.integration.update).toHaveBeenCalledWith({
      where: { id: 'integration-1' },
      data: {
        name: 'Living room Jellyfin',
        config: JSON.stringify({
          url: 'http://192.168.1.20:8096',
          apiKey: 'stored-secret',
        }),
      },
    });
  });

  it('rejects integration type changes', async () => {
    const response = await PUT(new Request('https://home.example.test/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'integration-1',
        name: 'Not Sonarr',
        type: 'sonarr',
        config: { url: 'http://sonarr:8989', apiKey: 'secret' },
      }),
    }));

    expect(response.status).toBe(400);
    expect(prismaMock.integration.update).not.toHaveBeenCalled();
  });

  it('does not reveal an inaccessible integration during management', async () => {
    accessMock.resolveOwnedIntegration.mockRejectedValue(new ApiSecurityError(
      'Integration not found',
      404,
      'integration_not_found',
    ));

    const response = await PUT(new Request('https://home.example.test/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'another-user-integration',
        name: 'Hidden',
        type: 'jellyfin',
        config: { url: 'http://hidden:8096', apiKey: 'secret' },
      }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: 'integration_not_found' });
  });

  it('deletes stale integration permission records in the same transaction', async () => {
    const response = await DELETE(new Request(
      'https://home.example.test/api/integrations?id=integration-1',
      { method: 'DELETE' },
    ));

    expect(response.status).toBe(200);
    expect(prismaMock.objectPermission.deleteMany).toHaveBeenCalledWith({
      where: { objectType: 'integration', objectId: 'integration-1' },
    });
    expect(prismaMock.integration.delete).toHaveBeenCalledWith({
      where: { id: 'integration-1' },
    });
  });
});
