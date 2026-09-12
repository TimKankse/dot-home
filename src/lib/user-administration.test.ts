import { beforeEach, describe, expect, it, vi } from 'vitest';

const transaction = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: { deleteMany: vi.fn() },
}));
const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) => callback(transaction)),
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { updateManagedUser } from './user-administration';

const activeAdmin = {
  id: 'target-1',
  email: 'target@example.test',
  displayName: 'Target',
  role: 'admin',
  disabledAt: null,
};

describe('managed user security changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.user.findUnique.mockResolvedValue(activeAdmin);
    transaction.user.findFirst.mockResolvedValue(null);
    transaction.user.count.mockResolvedValue(2);
    transaction.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    transaction.user.update.mockImplementation(async ({ data }) => ({
      ...activeAdmin,
      ...data,
      disabledAt: data.disabledAt ?? activeAdmin.disabledAt,
      updatedAt: new Date(),
    }));
  });

  it('revokes sessions when reducing a role', async () => {
    await updateManagedUser(
      { id: 'actor-1', role: 'admin' },
      activeAdmin.id,
      { role: 'viewer' },
    );

    expect(transaction.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: 'viewer',
        sessionVersion: { increment: 1 },
      }),
    }));
  });

  it('revokes sessions immediately when disabling an account', async () => {
    const result = await updateManagedUser(
      { id: 'actor-1', role: 'admin' },
      activeAdmin.id,
      { disabled: true },
    );

    expect(result.disabled).toBe(true);
    expect(transaction.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        disabledAt: expect.any(Date),
        sessionVersion: { increment: 1 },
      }),
    }));
  });

  it('preserves at least one active administrator', async () => {
    transaction.user.count.mockResolvedValue(1);

    await expect(updateManagedUser(
      { id: 'actor-1', role: 'admin' },
      activeAdmin.id,
      { disabled: true },
    )).rejects.toEqual(expect.objectContaining({
      status: 400,
      message: 'Cannot remove the last active admin',
    }));
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('prevents users from changing their own access controls', async () => {
    transaction.user.findUnique.mockResolvedValue({ ...activeAdmin, role: 'member' });

    await expect(updateManagedUser(
      { id: activeAdmin.id, role: 'member' },
      activeAdmin.id,
      { role: 'admin' },
    )).rejects.toMatchObject({ status: 403 });
  });
});
