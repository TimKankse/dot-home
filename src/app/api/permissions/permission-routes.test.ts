import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  dashboard: { findUnique: vi.fn() },
  page: { findUnique: vi.fn() },
  integration: { findUnique: vi.fn() },
  objectPermission: { findMany: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
}));
vi.mock('next-auth', () => ({ getServerSession: session }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/db', () => ({ prisma: db }));
import { GET, POST, DELETE } from './route';

function request(method: string, objectType = 'integration', userId = 'target', safe = true) {
  return new Request(`https://home.test/api/permissions?objectType=${objectType}&objectId=object&userId=${userId}`, {
    method,
    headers: safe ? { 'X-DotHome-Request': '1', 'Content-Type': 'application/json' } : {},
    ...(method === 'POST' ? { body: JSON.stringify({ objectType, objectId: 'object', userId, permission: 'BLOCKED' }) } : {}),
  });
}

function login(id: string, role = 'member') {
  session.mockResolvedValue({ user: { id, role } });
  db.user.findUnique.mockImplementation(async ({ where }) => ({ id: where.id, role, disabledAt: null }));
}

beforeEach(() => {
  vi.resetAllMocks();
  login('editor');
  db.dashboard.findUnique.mockResolvedValue({ userId: 'owner', accessLevel: 'PUBLIC' });
  db.integration.findUnique.mockResolvedValue({ userId: 'owner', accessLevel: 'PUBLIC' });
  db.page.findUnique.mockResolvedValue({ dashboard: { userId: 'owner' }, accessLevel: 'PUBLIC' });
  db.objectPermission.findMany.mockResolvedValue([]);
  db.objectPermission.upsert.mockResolvedValue({ id: 'override' });
});

describe('permission administration', () => {
  it.each(['dashboard', 'page', 'integration'])('rejects shared editors for %s permission reads and changes', async (type) => {
    expect((await GET(request('GET', type))).status).toBe(403);
    expect((await POST(request('POST', type))).status).toBe(403);
    expect((await DELETE(request('DELETE', type))).status).toBe(403);
    expect(db.objectPermission.findMany).not.toHaveBeenCalled();
    expect(db.objectPermission.upsert).not.toHaveBeenCalled();
    expect(db.objectPermission.delete).not.toHaveBeenCalled();
  });

  it.each([['owner', 'member'], ['administrator', 'admin']])('allows %s to manage overrides', async (id, role) => {
    login(id, role);
    expect((await GET(request('GET'))).status).toBe(200);
    expect((await POST(request('POST'))).status).toBe(200);
    expect((await DELETE(request('DELETE'))).status).toBe(200);
    expect(db.objectPermission.upsert).toHaveBeenCalled();
    expect(db.objectPermission.delete).toHaveBeenCalled();
  });

  it('rejects owner overrides even from administrators but permits clearing old ones', async () => {
    login('administrator', 'admin');
    expect((await POST(request('POST', 'integration', 'owner'))).status).toBe(400);
    expect(db.objectPermission.upsert).not.toHaveBeenCalled();
    expect((await DELETE(request('DELETE', 'integration', 'owner'))).status).toBe(200);
  });

  it('rejects unauthenticated requests and mutations without the first-party header', async () => {
    session.mockResolvedValue(null);
    expect((await GET(request('GET'))).status).toBe(401);
    login('owner');
    expect((await POST(request('POST', 'integration', 'target', false))).status).toBe(403);
    expect((await DELETE(request('DELETE', 'integration', 'target', false))).status).toBe(403);
    expect(db.objectPermission.upsert).not.toHaveBeenCalled();
    expect(db.objectPermission.delete).not.toHaveBeenCalled();
  });
});
