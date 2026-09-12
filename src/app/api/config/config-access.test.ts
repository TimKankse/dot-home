import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  widgetPermission: { findMany: vi.fn() },
  integration: { findMany: vi.fn() },
  dashboard: { findUnique: vi.fn(), findFirst: vi.fn() },
  userDashboardPreference: { findUnique: vi.fn() },
  objectPermission: { findUnique: vi.fn() },
}));
vi.mock('next-auth', () => ({ getServerSession: session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/automatic-integration-migration', () => ({
  ensureAutomaticIntegrationMigration: vi.fn(), runAutomaticIntegrationMigration: vi.fn(),
}));
import { GET } from './route';

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
