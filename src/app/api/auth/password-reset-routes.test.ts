import { beforeEach, describe, expect, it, vi } from 'vitest';

const passwordResetMock = vi.hoisted(() => ({
  consumePasswordResetToken: vi.fn(),
  hasUsablePasswordResetToken: vi.fn(),
}));

const passwordsMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  isValidPasswordLength: vi.fn(),
  MIN_PASSWORD_LENGTH: 8,
}));

vi.mock('@/lib/password-reset', () => passwordResetMock);
vi.mock('@/lib/passwords', () => passwordsMock);

import { POST as resetPassword } from './reset-password/route';

describe('password reset routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    passwordsMock.isValidPasswordLength.mockReturnValue(true);
    passwordsMock.hashPassword.mockResolvedValue('next-hash');
    passwordResetMock.hasUsablePasswordResetToken.mockResolvedValue(true);
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
