import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServerSessionMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
}));
const passwordResetMock = vi.hoisted(() => ({
  buildPasswordResetPath: vi.fn((token: string) => `/reset-password?token=${token}`),
  issuePasswordResetToken: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: prismaMock }));
vi.mock('@/lib/password-reset', () => passwordResetMock);

import { POST } from './[id]/reset-password/route';

describe('admin password reset route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    passwordResetMock.issuePasswordResetToken.mockResolvedValue({
      token: 'one-time-token',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
  });

  it('returns only a relative, administrator-issued reset path', async () => {
    const response = await POST(
      new Request('https://untrusted-host.test/api/users/user-1/reset-password', { method: 'POST' }),
      { params: Promise.resolve({ id: 'user-1' }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      resetPath: '/reset-password?token=one-time-token',
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
  });

  it('allows only administrators to issue reset links', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'member-1', role: 'member' } });

    const response = await POST(
      new Request('https://home.example.test/api/users/user-1/reset-password', { method: 'POST' }),
      { params: Promise.resolve({ id: 'user-1' }) },
    );

    expect(response.status).toBe(403);
    expect(passwordResetMock.issuePasswordResetToken).not.toHaveBeenCalled();
  });
});
