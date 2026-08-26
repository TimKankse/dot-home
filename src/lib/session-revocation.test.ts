import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  passwordResetToken: {
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('./db', () => ({ prisma: prismaMock }));

import {
  getSessionVersion,
  isSessionTokenCurrent,
  updatePasswordAndRevokeSessions,
} from './session-revocation';
import { authOptions } from './auth';

describe('session revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it('treats legacy tokens without a version as version zero', () => {
    expect(getSessionVersion({ id: 'user-1' })).toBe(0);
  });

  it('accepts only the current session version', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ sessionVersion: 2 });

    await expect(isSessionTokenCurrent({ id: 'user-1', sessionVersion: 2 })).resolves.toBe(true);
    await expect(isSessionTokenCurrent({ id: 'user-1', sessionVersion: 1 })).resolves.toBe(false);
  });

  it('rejects tokens for deleted users', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(isSessionTokenCurrent({ id: 'missing-user', sessionVersion: 0 })).resolves.toBe(false);
  });

  it('marks stale JWTs invalid and omits their sessions', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ sessionVersion: 2 });
    const jwtCallback = authOptions.callbacks?.jwt;
    const sessionCallback = authOptions.callbacks?.session;

    expect(jwtCallback).toBeDefined();
    expect(sessionCallback).toBeDefined();

    const token = await jwtCallback!({
      token: {
        id: 'user-1',
        role: 'member',
        sessionVersion: 1,
      },
    } as never);
    const session = await sessionCallback!({
      session: {
        user: { id: 'user-1', email: 'user@example.test', name: 'User', role: 'member' },
        expires: new Date(Date.now() + 60_000).toISOString(),
      },
      token,
    } as never);

    expect(token.sessionInvalidated).toBe(true);
    expect(session).toBeNull();
  });

  it('updates the password, increments the session version, and clears reset tokens together', async () => {
    await updatePasswordAndRevokeSessions('user-1', 'next-hash');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'next-hash',
        sessionVersion: { increment: 1 },
      },
    });
    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});
