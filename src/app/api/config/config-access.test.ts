import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  widgetPermission: { findMany: vi.fn() },
  integration: { findMany: vi.fn() },
  dashboard: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  userDashboardPreference: { findUnique: vi.fn() },
  objectPermission: { findUnique: vi.fn() },
}));
vi.mock('next-auth', () => ({ getServerSession: session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/automatic-integration-migration', () => ({
  ensureAutomaticIntegrationMigration: vi.fn(), runAutomaticIntegrationMigration: vi.fn(),
}));
import { GET, POST } from './route';
import { runAutomaticIntegrationMigration } from '@/lib/automatic-integration-migration';

const own = { id: 'own', userId: 'member', accessLevel: 'PRIVATE', layout: JSON.stringify({ widgets: [], pages: [] }) };
const shared = { id: 'shared', userId: 'owner', accessLevel: 'VIEWABLE', layout: JSON.stringify({ widgets: [], pages: [{ id: 'private-page', name: 'Restricted contents' }] }) };

beforeEach(() => {
  vi.resetAllMocks();
  session.mockResolvedValue({ user: { id: 'member', role: 'member' } });
  db.user.findUnique.mockResolvedValue({ id: 'member', role: 'member', disabledAt: null });
  db.widgetPermission.findMany.mockResolvedValue([{ widgetType: 'clock', roles: '["member"]' }]);
  db.integration.findMany.mockResolvedValue([]);
  db.userDashboardPreference.findUnique.mockResolvedValue({ defaultDashboardId: 'shared' });
  db.dashboard.findFirst.mockResolvedValue(own);
});

describe('dashboard save performance', () => {
  const save = (config: Record<string, unknown>) => POST(new Request('https://home.test/api/config', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-dothome-request': '1' },
    body: JSON.stringify({ dashboardId: 'own', widgets: [{
      id: 'widget', type: 'widget', widgetType: 'jellyfin', integrationId: 'service', config,
    }] }),
  }));
  it('does not rescan stored credentials when moving or resizing modern widgets', async () => {
    db.dashboard.findUnique.mockResolvedValue(own);
    expect((await save({ viewMode: 'nowplaying' })).status).toBe(200);
    expect(db.dashboard.update).toHaveBeenCalledOnce();
    expect(runAutomaticIntegrationMigration).not.toHaveBeenCalled();
  });
  it('still migrates an imported legacy configuration, scoped to the saved dashboard', async () => {
    db.dashboard.findUnique.mockResolvedValue(own);
    expect((await save({ url: 'http://jellyfin.local', apiKey: 'legacy-test-key' })).status).toBe(200);
    expect(runAutomaticIntegrationMigration).toHaveBeenCalledExactlyOnceWith({ dashboardId: 'own' });
  });
});

describe('preferred dashboard authorization', () => {
  it.each(['PUBLIC', 'VIEWABLE', 'PRIVATE'])('honors a BLOCKED override for a preferred %s dashboard', async (accessLevel) => {
    db.dashboard.findUnique.mockResolvedValue({ ...shared, accessLevel });
    db.objectPermission.findUnique.mockResolvedValue({ permission: 'BLOCKED' });
    for (const query of ['', '?dashboardId=shared']) {
      const response = await GET(new Request(`https://home.test/api/config${query}`));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.dashboardId).toBe('own');
      expect(JSON.stringify(body)).not.toContain('Restricted contents');
    }
  });

  it('retains access to an explicitly shared private preferred dashboard', async () => {
    db.dashboard.findUnique.mockResolvedValue({ ...shared, accessLevel: 'PRIVATE' });
    db.objectPermission.findUnique.mockResolvedValue({ permission: 'VIEW' });
    const response = await GET(new Request('https://home.test/api/config'));
    expect((await response.json()).dashboardId).toBe('shared');
  });
});
