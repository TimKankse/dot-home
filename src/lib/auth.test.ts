// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ findUser: vi.fn(), verify: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mocks.findUser } } }));
vi.mock('@/lib/passwords', () => ({
  normalizeEmail: (value: string) => value.trim().toLowerCase(), verifyPassword: mocks.verify,
}));
import { authOptions } from './auth';

type Credentials = { email: string; password: string };
const authorize = (authOptions.providers[0].options as { authorize: (credentials: Credentials) => Promise<unknown> }).authorize;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUser.mockResolvedValue({ id: 'user', email: 'user@example.test', passwordHash: 'test-hash', role: 'member', sessionVersion: 0 });
  mocks.verify.mockResolvedValue(false);
});

describe('credential login limits', () => {
  it('throttles repeated attempts before database or password work, including normalized email variants', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await authorize({ email: ' brute@example.test ', password: 'wrong-password' })).toBeNull();
    }
    expect(await authorize({ email: 'BRUTE@EXAMPLE.TEST', password: 'wrong-password' })).toBeNull();
    expect(mocks.findUser).toHaveBeenCalledTimes(10);
    expect(mocks.verify).toHaveBeenCalledTimes(10);
  });
  it('allows valid credentials and rejects oversized inputs without password work', async () => {
    mocks.verify.mockResolvedValue(true);
    expect(await authorize({ email: 'valid@example.test', password: 'correct-password' })).toMatchObject({ id: 'user', role: 'member' });
    expect(await authorize({ email: 'valid@example.test', password: 'x'.repeat(1025) })).toBeNull();
    expect(mocks.verify).toHaveBeenCalledOnce();
  });
});
