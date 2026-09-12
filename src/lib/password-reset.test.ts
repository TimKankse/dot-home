import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionMock = vi.hoisted(() => ({
  passwordResetToken: {
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  passwordResetToken: {
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('./db', () => ({ prisma: prismaMock }));

import {
  buildPasswordResetPath,
  consumePasswordResetToken,
  issuePasswordResetToken,
} from './password-reset';

describe('password reset security helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (operation) => {
      if (typeof operation === 'function') {
        return operation(transactionMock);
      }
      return Promise.all(operation);
    });
    transactionMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });
    transactionMock.user.update.mockResolvedValue({});
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({});
  });

  it('builds a relative path without consulting request host headers', () => {
    expect(buildPasswordResetPath('token with spaces')).toBe(
      '/reset-password?token=token%20with%20spaces',
    );
  });

  it('consumes a reset token and revokes sessions in one transaction', async () => {
    transactionMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(consumePasswordResetToken('raw-token', 'next-hash')).resolves.toBe(true);

    expect(transactionMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: 'next-hash',
        sessionVersion: { increment: 1 },
      },
    });
    expect(transactionMock.passwordResetToken.deleteMany).toHaveBeenLastCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('keeps previously delivered unexpired links when issuing a new token', async () => {
    await issuePasswordResetToken('user-1');

    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: expect.any(Date) } },
    });
    expect(prismaMock.passwordResetToken.deleteMany).not.toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('rejects expired reset tokens without changing the password', async () => {
    transactionMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(consumePasswordResetToken('expired-token', 'next-hash')).resolves.toBe(false);
    expect(transactionMock.user.update).not.toHaveBeenCalled();
  });

});
