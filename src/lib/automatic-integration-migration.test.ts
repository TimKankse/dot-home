// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({
  dashboard: { findMany: vi.fn(), updateMany: vi.fn() },
  integration: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  widgetUserConfig: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('./db', () => ({ prisma: db }));
vi.mock('@/lib/db', () => ({ prisma: db }));
import { runAutomaticIntegrationMigration } from './automatic-integration-migration';
import { hasLegacyIntegrationConfig } from './integration-config-migration';
import { decryptSensitiveFields } from '../utils/crypto';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CONFIG_ENCRYPTION_SECRET', 'migration-test-secret');
  vi.stubEnv('DATABASE_URL', '');
  db.dashboard.findMany.mockResolvedValue([{ id: 'one', name: 'One', userId: 'owner', layout: JSON.stringify({ widgets: [{ id: 'q', type: 'qbittorrent', config: { url: 'http://q.local' } }] }) }]);
  db.integration.findMany.mockResolvedValue([]);
  db.integration.create.mockResolvedValue({ id: 'created' });
  db.dashboard.updateMany.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation((run) => run(db));
});
afterEach(() => vi.unstubAllEnvs());
it('normalizes the saved dashboard without reading unrelated personal configs or integrations', async () => {
  const result = await runAutomaticIntegrationMigration({ dashboardId: 'one', backup: false });
  expect(result.changedDashboards).toBe(1);
  expect(result.createdIntegrations).toBe(1);
  expect(db.dashboard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'one' } }));
  expect(db.integration.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { user: { dashboards: { some: { id: 'one' } } } } }));
  expect(db.widgetUserConfig.findMany).not.toHaveBeenCalled();
  const saved = JSON.parse(db.dashboard.updateMany.mock.calls[0][0].data.layout);
  expect(saved.widgets[0].integrationId).toBe('created');
  expect(saved.widgets[0].config.url).toBeUndefined();
});
it('refuses to overwrite a concurrent save with an older migration plan', async () => {
  db.dashboard.updateMany.mockResolvedValue({ count: 0 });
  await expect(runAutomaticIntegrationMigration({ dashboardId: 'one', backup: false })).rejects.toMatchObject({ status: 409 });
});

it('repairs one integration shared by legacy widgets with the same credentials', async () => {
  const integrationId = 'shared-jellyfin';
  const config = { url: 'http://jellyfin.test', apiKey: 'fixture-key', userId: 'media-user' };
  db.integration.findMany.mockResolvedValue([{
    id: integrationId,
    userId: 'owner',
    type: 'jellyfin',
    config: JSON.stringify({ ...config, apiKey: 'enc:unreadable' }),
  }]);
  const widgets = ['now-playing', 'libraries'].map((id) => ({
    id, widgetType: 'jellyfin', integrationId, config: { ...config, viewMode: id },
  }));
  db.dashboard.findMany.mockResolvedValue([{
    id: 'one', name: 'One', userId: 'owner', layout: JSON.stringify({ widgets }),
  }]);

  const result = await runAutomaticIntegrationMigration({ dashboardId: 'one', backup: false });

  expect(result.repairedIntegrations).toBe(1);
  expect(db.integration.update).toHaveBeenCalledOnce();
  const stored = JSON.parse(db.integration.update.mock.calls[0][0].data.config);
  expect(stored.apiKey).toMatch(/^enc:/);
  expect(decryptSensitiveFields(stored)).toEqual(config);
  const migrated = JSON.parse(db.dashboard.updateMany.mock.calls[0][0].data.layout);
  expect(migrated.widgets).toEqual(widgets.map(({ config, ...widget }) => ({
    ...widget, config: { viewMode: config.viewMode },
  })));
});
describe('legacy-save detection', () => {
  it.each([
    { type: 'jellyfin', config: { apiKey: 'key' } },
    { type: 'jellyfin', config: { integrationId: 'nested-id' } },
    { type: 'calendar', config: { radarrUrl: 'http://radarr.local' } },
    { type: 'rss', config: { feedUrls: ['https://feed.example/rss?token=secret'] } },
    { type: 'rss', config: { feedUrl: 'http://192.168.1.10/rss' } },
  ])('keeps migration for legacy $type credentials', widget => expect(hasLegacyIntegrationConfig(widget)).toBe(true));
  it.each([
    { type: 'jellyfin', integrationId: 'stored', config: { viewMode: 'nowplaying' } },
    { type: 'calendar', config: { radarrIntegrationId: 'stored' } },
    { type: 'rss', config: { feedUrls: ['https://feed.example/rss'] } },
    { type: 'shortcut', config: { url: 'http://server.local' } },
  ])('skips modern $type configuration', widget => expect(hasLegacyIntegrationConfig(widget)).toBe(false));
});
