import { beforeEach, describe, expect, it, vi } from 'vitest';

const getBootstrapSecretMock = vi.hoisted(() => vi.fn(() => 'bootstrap-secret'));
const transaction = vi.hoisted(() => ({
  user: {
    count: vi.fn(),
    create: vi.fn(),
  },
  dashboard: { create: vi.fn() },
  appState: {
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));
const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) => callback(transaction)),
}));

vi.mock('@/lib/bootstrap-security', () => ({ getBootstrapSecret: getBootstrapSecretMock }));
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));

import { createInitialAdmin, getSetupState } from './bootstrap-state';

describe('bootstrap claim state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.appState.update.mockResolvedValue({});
    transaction.dashboard.create.mockResolvedValue({});
  });

  it('creates a retrievable secret for an unclaimed fresh deployment', async () => {
    transaction.user.count.mockResolvedValue(0);
    transaction.appState.upsert.mockResolvedValue({ bootstrapClaimedAt: null });

    await expect(getSetupState()).resolves.toEqual({ needsSetup: true });
    expect(getBootstrapSecretMock).toHaveBeenCalledOnce();
  });

  it('backfills the permanent claim for an existing deployment', async () => {
    transaction.user.count.mockResolvedValue(2);
    transaction.appState.upsert.mockResolvedValue({ bootstrapClaimedAt: null });

    await expect(getSetupState()).resolves.toEqual({ needsSetup: false });
    expect(transaction.appState.update).toHaveBeenCalledOnce();
    expect(getBootstrapSecretMock).not.toHaveBeenCalled();
  });

  it('claims setup and creates the admin and dashboard in one transaction', async () => {
    transaction.user.count.mockResolvedValue(0);
    transaction.appState.upsert.mockResolvedValue({ bootstrapClaimedAt: null });
    transaction.appState.updateMany.mockResolvedValue({ count: 1 });
    transaction.user.create.mockResolvedValue({ id: 'admin-1', email: 'admin@example.test', role: 'admin' });

    await expect(createInitialAdmin({
      email: 'admin@example.test',
      displayName: 'Admin',
      passwordHash: 'hash',
      dashboardLayout: '{}',
    })).resolves.toMatchObject({ id: 'admin-1' });

    expect(transaction.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: 'admin' }),
    });
    expect(transaction.dashboard.create).toHaveBeenCalledOnce();
  });

  it('refuses a second claimant when the conditional claim is already consumed', async () => {
    transaction.user.count.mockResolvedValue(0);
    transaction.appState.upsert.mockResolvedValue({ bootstrapClaimedAt: new Date() });
    transaction.appState.updateMany.mockResolvedValue({ count: 0 });

    await expect(createInitialAdmin({
      email: 'admin@example.test',
      displayName: null,
      passwordHash: 'hash',
      dashboardLayout: '{}',
    })).resolves.toBeNull();
    expect(transaction.user.create).not.toHaveBeenCalled();
  });
});
