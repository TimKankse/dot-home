import { describe, expect, it } from 'vitest';

import { parseStoredDashboardLayout, serializeDashboardLayout } from '@/lib/dashboard-layout';

describe('dashboard layout migrations', () => {
  it('defaults older dashboards to one neighboring page and retains saved buffer settings', () => {
    const legacy = parseStoredDashboardLayout({ widgets: [], pages: [] });
    expect(legacy.settings.behavior).toMatchObject({ pageBufferEnabled: true, pageBufferSize: 1 });
    legacy.settings.behavior.pageBufferEnabled = false;
    legacy.settings.behavior.pageBufferSize = 3;
    const restored = parseStoredDashboardLayout(JSON.parse(serializeDashboardLayout(legacy)));
    expect(restored.settings.behavior).toMatchObject({ pageBufferEnabled: false, pageBufferSize: 3 });
  });

  it.each([
    [-2, 0], [2.9, 2], ['invalid', 1], [null, 1], [Number.POSITIVE_INFINITY, 1],
  ])('normalizes an imported page buffer size %s to %s', (value, expected) => {
    const layout = parseStoredDashboardLayout({ settings: { behavior: { pageBufferSize: value } } });
    expect(layout.settings.behavior.pageBufferSize).toBe(expected);
  });

  it('promotes a legacy shortcut internal URL when no external URL exists', () => {
    const layout = parseStoredDashboardLayout({
      pages: [{ id: 'page-1' }],
      widgets: [{
        id: 'shortcut-1',
        type: 'shortcut',
        name: 'Internal service',
        url: '',
        internalUrl: 'http://192.168.1.19:8096',
        isSelfHosted: true,
        pageId: 'page-1',
        grid: { x: 0, y: 0, w: 1, h: 1 },
      }],
    });

    expect(layout.widgets[0]).toMatchObject({
      id: 'shortcut-1',
      url: 'http://192.168.1.19:8096',
    });
    expect(layout.widgets[0]).not.toHaveProperty('internalUrl');
    expect(layout.widgets[0]).not.toHaveProperty('isSelfHosted');
  });

  it('keeps an existing external shortcut URL over the deprecated internal URL', () => {
    const layout = parseStoredDashboardLayout({
      pages: [{ id: 'page-1' }],
      widgets: [{
        id: 'shortcut-1',
        type: 'shortcut',
        url: 'https://service.example.test',
        internalUrl: 'http://192.168.1.19:8096',
        isSelfHosted: true,
        pageId: 'page-1',
        grid: { x: 0, y: 0, w: 1, h: 1 },
      }],
    });

    expect(layout.widgets[0]?.url).toBe('https://service.example.test');
  });
});
