import { describe, expect, it } from 'vitest';

import { parseStoredDashboardLayout } from '@/lib/dashboard-layout';

describe('dashboard layout migrations', () => {
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
