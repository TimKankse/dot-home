import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

const passwordResetMock = vi.hoisted(() => ({
  buildPasswordResetUrl: vi.fn(),
  checkPasswordResetRateLimit: vi.fn(),
  consumePasswordResetToken: vi.fn(),
  getAdminContactEmail: vi.fn(),
  hasUsablePasswordResetToken: vi.fn(),
  hasAutomatedPasswordResetDelivery: vi.fn(),
  issuePasswordResetToken: vi.fn(),
  sendPasswordResetNotification: vi.fn(),
}));

const passwordsMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  isValidPasswordLength: vi.fn(),
  MIN_PASSWORD_LENGTH: 8,
}));

vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/password-reset', () => passwordResetMock);
vi.mock('@/lib/passwords', () => passwordsMock);

import { POST as forgotPassword } from './forgot-password/route';
import { POST as resetPassword } from './reset-password/route';

describe('password reset routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    passwordResetMock.checkPasswordResetRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    passwordResetMock.hasAutomatedPasswordResetDelivery.mockReturnValue(false);
    passwordResetMock.getAdminContactEmail.mockReturnValue(null);
    passwordsMock.isValidPasswordLength.mockReturnValue(true);
    passwordsMock.hashPassword.mockResolvedValue('next-hash');
    passwordResetMock.hasUsablePasswordResetToken.mockResolvedValue(true);
  });

  it('returns 429 before looking up a user when the forgot-password limit is reached', async () => {
    passwordResetMock.checkPasswordResetRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 120,
    });

    const response = await forgotPassword(new Request(
      'https://home.example.test/api/auth/forgot-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.test' }),
      },
    ));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('120');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns the same admin-assisted response without revealing account existence', async () => {
    const response = await forgotPassword(new Request(
      'https://home.example.test/api/auth/forgot-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'missing@example.test' }),
      },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      delivery: 'admin',
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('resets a password only when the token is atomically consumed', async () => {
    passwordResetMock.consumePasswordResetToken.mockResolvedValue(true);

    const response = await resetPassword(new Request(
      'https://home.example.test/api/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token', password: 'new-password' }),
      },
    ));

    expect(response.status).toBe(200);
    expect(passwordResetMock.consumePasswordResetToken).toHaveBeenCalledWith(
      'valid-token',
      'next-hash',
    );
  });

  it('rejects a token that cannot be consumed', async () => {
    passwordResetMock.consumePasswordResetToken.mockResolvedValue(false);

    const response = await resetPassword(new Request(
      'https://home.example.test/api/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'used-token', password: 'new-password' }),
      },
    ));

    expect(response.status).toBe(400);
  });

  it('rejects invalid tokens before doing expensive password hashing', async () => {
    passwordResetMock.hasUsablePasswordResetToken.mockResolvedValue(false);

    const response = await resetPassword(new Request(
      'https://home.example.test/api/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token', password: 'new-password' }),
      },
    ));

    expect(response.status).toBe(400);
    expect(passwordsMock.hashPassword).not.toHaveBeenCalled();
    expect(passwordResetMock.consumePasswordResetToken).not.toHaveBeenCalled();
  });
});
