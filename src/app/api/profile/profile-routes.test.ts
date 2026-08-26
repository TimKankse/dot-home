import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServerSessionMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));
const passwordsMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  isValidPasswordLength: vi.fn(),
  MIN_PASSWORD_LENGTH: 8,
  verifyPassword: vi.fn(),
}));
const revokeSessionsMock = vi.hoisted(() => vi.fn());

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/passwords', () => passwordsMock);
vi.mock('@/lib/session-revocation', () => ({
  updatePasswordAndRevokeSessions: revokeSessionsMock,
}));

import { PATCH as updateProfile } from './route';
import { POST as changePassword } from './change-password/route';

describe('profile routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.test', role: 'member' },
    });
    passwordsMock.isValidPasswordLength.mockReturnValue(true);
    passwordsMock.verifyPassword.mockResolvedValue(true);
    passwordsMock.hashPassword.mockResolvedValue('next-hash');
    revokeSessionsMock.mockResolvedValue(undefined);
  });

  it('updates only the authenticated user display name', async () => {
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.test',
      displayName: 'Updated User',
      role: 'member',
      updatedAt: new Date(),
    });

    const response = await updateProfile(new Request('https://home.example.test/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Updated User' }),
    }));

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: { displayName: 'Updated User' },
    }));
  });

  it('requires the current password before changing credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'current-hash',
    });
    passwordsMock.verifyPassword.mockResolvedValue(false);

    const response = await changePassword(new Request(
      'https://home.example.test/api/profile/change-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      },
    ));

    expect(response.status).toBe(400);
    expect(revokeSessionsMock).not.toHaveBeenCalled();
  });

  it('changes the password through the session-revoking transaction', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'current-hash',
    });

    const response = await changePassword(new Request(
      'https://home.example.test/api/profile/change-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: 'current-password',
          newPassword: 'new-password',
        }),
      },
    ));

    expect(response.status).toBe(200);
    expect(revokeSessionsMock).toHaveBeenCalledWith('user-1', 'next-hash');
  });
});
