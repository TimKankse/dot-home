import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  widgetPermission: { findUnique: vi.fn().mockResolvedValue(null) },
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
import { ApiSecurityError } from '@/lib/api-security';
import { decryptSensitiveFields, isEncrypted } from '@/utils/crypto';
import { DELETE, GET, POST, PUT } from './route';

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
    vi.stubEnv('CONFIG_ENCRYPTION_SECRET', 'integration-route-test-secret');
    vi.stubEnv('DATABASE_URL', '');
    securityMock.requireApiUser.mockResolvedValue({ id: 'user-1', role: 'admin' });
    accessMock.resolveOwnedIntegration.mockResolvedValue(storedJellyfin);
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.integration.delete.mockResolvedValue({ id: 'integration-1' });
    prismaMock.objectPermission.deleteMany.mockResolvedValue({ count: 0 });
  });
  afterEach(() => vi.unstubAllEnvs());

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

  it.each([['POST', POST], ['PUT', PUT]] as const)('rejects pasted encrypted credentials on %s before writing', async (method, handler) => {
    const value = 'enc:copied-from-storage';
    const response = await handler(new Request('https://home.example.test/api/integrations', {
      method,
      body: JSON.stringify({
        id: 'integration-1',
        name: 'Jellyfin',
        type: 'jellyfin',
        config: { url: 'http://jellyfin.test', apiKey: value },
      }),
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Enter the original credential from Jellyfin.');
    expect(JSON.stringify(body)).not.toContain(value);
    expect(prismaMock.integration.create).not.toHaveBeenCalled();
    expect(prismaMock.integration.update).not.toHaveBeenCalled();
  });

  it('stores a replacement encrypted, reports it on reopen, and preserves it on an unrelated edit', async () => {
    let stored = {
      id: 'integration-1',
      name: 'Jellyfin',
      type: 'jellyfin',
      config: JSON.stringify(storedJellyfin.config),
    };
    prismaMock.integration.update.mockImplementation(async ({ data }) => {
      stored = { ...stored, ...data };
      return stored;
    });
    prismaMock.integration.findMany.mockImplementation(async () => [stored]);
    accessMock.resolveOwnedIntegration.mockImplementation(async () => ({
      ...storedJellyfin,
      config: decryptSensitiveFields(JSON.parse(stored.config)),
    }));

    const save = (config: Record<string, string>) => PUT(new Request('https://home.example.test/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'integration-1',
        name: 'Living room Jellyfin',
        type: 'jellyfin',
        config: { url: 'http://192.168.1.20:8096', ...config },
      }),
    }));

    const replacement = 'replacement-test-key';
    const response = await save({ apiKey: replacement });
    expect(response.status).toBe(200);
    expect(isEncrypted(JSON.parse(stored.config).apiKey)).toBe(true);
    expect(await response.json()).toMatchObject({ credentialStatus: { apiKey: 'saved' } });

    const reopened = await (await GET()).json();
    expect(reopened[0]).toMatchObject({
      config: { apiKey: '********' },
      credentialStatus: { apiKey: 'saved' },
    });
    expect(JSON.stringify(reopened)).not.toContain(replacement);

    expect((await save({})).status).toBe(200);
    expect(decryptSensitiveFields(JSON.parse(stored.config)).apiKey).toBe(replacement);
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
  it.each(['netdata', 'portainer'])('prevents a member creating an admin-only %s integration', async (type) => {
    securityMock.requireApiUser.mockResolvedValue({ id: 'user-1', role: 'member' });
    const response = await POST(new Request('https://home.test/api/integrations', {
      method: 'POST', body: JSON.stringify({ name: 'Admin service', type, config: { url: 'http://private.test', ...(type === 'portainer' ? { apiKey: 'test' } : {}) } }),
    }));
    expect(response.status).toBe(404);
    expect(prismaMock.integration.create).not.toHaveBeenCalled();
  });

});
