import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const transactionMock = vi.hoisted(() => ({
  passwordResetToken: {
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  passwordResetRateLimit: {
    deleteMany: vi.fn(),
    upsert: vi.fn(),
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
  checkPasswordResetRateLimit,
  consumePasswordResetToken,
  getAppOrigin,
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
    transactionMock.passwordResetRateLimit.deleteMany.mockResolvedValue({ count: 0 });
    transactionMock.passwordResetRateLimit.upsert.mockResolvedValue({
      requestCount: 1,
      expiresAt: new Date(Date.now() + 300_000),
    });
    transactionMock.user.update.mockResolvedValue({});
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the configured canonical origin instead of request headers', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://home.example.test/path');
    vi.stubEnv('NODE_ENV', 'production');
    const request = new Request('https://attacker.test/forgot-password', {
      headers: { 'x-forwarded-host': 'attacker.test' },
    });

    expect(getAppOrigin(request)).toBe('https://home.example.test');
  });

  it('requires a canonical origin in production', () => {
    vi.stubEnv('NEXTAUTH_URL', '');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => getAppOrigin(new Request('https://untrusted.test'))).toThrow(
      'NEXTAUTH_URL is required',
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

  it('limits repeated requests for the same email', async () => {
    const expiresAt = new Date(Date.now() + 300_000);
    transactionMock.passwordResetRateLimit.upsert.mockResolvedValue({
      keyHash: 'email-hash',
      requestCount: 4,
      expiresAt,
    });

    const result = await checkPasswordResetRateLimit(
      new Request('https://home.example.test/api/auth/forgot-password'),
      'user@example.test',
    );

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(transactionMock.passwordResetRateLimit.upsert).toHaveBeenCalledOnce();
  });

  it('stores only hashed rate-limit keys', async () => {
    const result = await checkPasswordResetRateLimit(
      new Request('https://home.example.test/api/auth/forgot-password', {
        headers: { 'x-forwarded-for': '192.0.2.10' },
      }),
      'user@example.test',
    );

    expect(result.allowed).toBe(true);
    expect(transactionMock.passwordResetRateLimit.upsert).toHaveBeenCalledTimes(2);
    for (const [call] of transactionMock.passwordResetRateLimit.upsert.mock.calls) {
      expect(call.create.keyHash).toMatch(/^[a-f0-9]{64}$/);
      expect(call.create.keyHash).not.toContain('user@example.test');
      expect(call.create.keyHash).not.toContain('192.0.2.10');
    }
  });
});
