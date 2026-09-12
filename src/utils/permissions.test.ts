import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ findUnique: vi.fn(), findMany: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { objectPermission: db } }));
import { batchResolvePermissions, resolvePermission, resolvePermissionSync, type PermissionContext } from './permissions';

const context: PermissionContext = {
  objectType: 'integration', objectId: 'integration', ownerId: 'owner', accessLevel: 'PUBLIC',
};

beforeEach(() => vi.resetAllMocks());

describe('permission precedence', () => {
  it.each(['BLOCKED', 'VIEW'])('keeps owner access despite a %s override in all resolvers', async (permission) => {
    db.findUnique.mockResolvedValue({ permission });
    db.findMany.mockResolvedValue([{ objectId: context.objectId, permission }]);
    expect(await resolvePermission(context, 'owner')).toBe('edit');
    expect(resolvePermissionSync(context, 'owner', { permission })).toBe('edit');
    const batch = await batchResolvePermissions('integration', [{
      id: context.objectId, ownerId: context.ownerId, accessLevel: context.accessLevel,
    }], 'owner');
    expect(batch.get(context.objectId)).toBe('edit');
  });

  it('still blocks non-owners on public objects', async () => {
    db.findUnique.mockResolvedValue({ permission: 'BLOCKED' });
    expect(await resolvePermission(context, 'member')).toBe('none');
    expect(resolvePermissionSync(context, 'member', { permission: 'BLOCKED' })).toBe('none');
  });
});
