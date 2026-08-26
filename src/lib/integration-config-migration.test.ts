import { describe, expect, it } from 'vitest';

import {
  applyWidgetIntegrationMigration,
  planWidgetIntegrationMigration,
  type MigrationIntegration,
  type MigrationWidget,
} from '@/lib/integration-config-migration';

const ownerId = 'owner-1';
const jellyfinIntegration: MigrationIntegration = {
  id: 'jellyfin-1',
  userId: ownerId,
  type: 'jellyfin',
  config: {
    url: 'http://192.168.1.19:8096',
    apiKey: 'secret',
    userId: 'media-user-1',
  },
};

describe('integration config migration planning', () => {
  it('redacts an already-linked Jellyfin widget', () => {
    const widget: MigrationWidget = {
      id: 'widget-1',
      name: 'Now Playing',
      widgetType: 'jellyfin',
      integrationId: jellyfinIntegration.id,
      config: {
        url: 'http://192.168.1.19:8096',
        apiKey: 'secret',
        userId: 'media-user-1',
        viewMode: 'now-playing',
      },
    };

    const plan = planWidgetIntegrationMigration(widget, ownerId, [jellyfinIntegration]);
    expect(plan).toMatchObject({ action: 'redact', integrationId: 'jellyfin-1' });

    const migrated = applyWidgetIntegrationMigration(widget, plan!, jellyfinIntegration.id);
    expect(migrated).toMatchObject({
      integrationId: 'jellyfin-1',
      config: { viewMode: 'now-playing' },
    });
    expect(migrated.config).not.toHaveProperty('apiKey');
    expect(migrated.config).not.toHaveProperty('url');
    expect(migrated.config).not.toHaveProperty('userId');
  });

  it('links an unlinked widget to a matching owner integration', () => {
    const widget: MigrationWidget = {
      id: 'widget-2',
      widgetType: 'jellyfin',
      config: {
        url: 'http://192.168.1.19:8096',
        apiKey: 'secret',
        userId: 'media-user-1',
      },
    };

    expect(planWidgetIntegrationMigration(widget, ownerId, [jellyfinIntegration])).toMatchObject({
      action: 'link-and-redact',
      integrationId: jellyfinIntegration.id,
    });
  });

  it('does not reuse another owner integration', () => {
    const widget: MigrationWidget = {
      id: 'widget-3',
      widgetType: 'jellyfin',
      config: jellyfinIntegration.config,
    };

    expect(planWidgetIntegrationMigration(widget, 'owner-2', [jellyfinIntegration])).toMatchObject({
      action: 'create-link-and-redact',
    });
  });

  it('creates an integration for a legacy Portainer widget', () => {
    const widget: MigrationWidget = {
      id: 'portainer-1',
      widgetType: 'portainer',
      config: {
        url: 'http://portainer.local:9000',
        apiKey: 'secret',
      },
    };

    expect(planWidgetIntegrationMigration(widget, ownerId, [])).toMatchObject({
      action: 'create-link-and-redact',
      integrationConfig: {
        url: 'http://portainer.local:9000',
        apiKey: 'secret',
      },
    });
  });

  it('blocks references that do not belong to the dashboard owner', () => {
    const widget: MigrationWidget = {
      id: 'widget-4',
      widgetType: 'jellyfin',
      integrationId: jellyfinIntegration.id,
      config: { apiKey: 'secret' },
    };

    expect(planWidgetIntegrationMigration(widget, 'owner-2', [jellyfinIntegration])).toMatchObject({
      action: 'blocked',
      reason: expect.stringContaining('belongs to another user'),
    });
  });

  it('repairs an undecryptable integration from complete inline credentials', () => {
    const integration: MigrationIntegration = {
      id: 'jellyseerr-1',
      userId: ownerId,
      type: 'jellyseerr',
      config: { url: 'http://jellyseerr.local', apiKey: 'enc:old-key' },
      decryptable: false,
    };
    const widget: MigrationWidget = {
      id: 'widget-5',
      widgetType: 'jellyseerr',
      integrationId: integration.id,
      config: { url: 'http://jellyseerr.local', apiKey: 'usable-inline-key' },
    };

    expect(planWidgetIntegrationMigration(widget, ownerId, [integration])).toMatchObject({
      action: 'repair-and-redact',
      integrationId: integration.id,
      integrationConfig: { url: 'http://jellyseerr.local', apiKey: 'usable-inline-key' },
    });
  });

  it('promotes an integration ID stored inside legacy widget config', () => {
    const widget: MigrationWidget = {
      id: 'widget-6',
      widgetType: 'jellyfin',
      config: { integrationId: jellyfinIntegration.id, viewMode: 'now-playing' },
    };
    const plan = planWidgetIntegrationMigration(widget, ownerId, [jellyfinIntegration]);
    expect(plan).toMatchObject({ action: 'redact', integrationId: jellyfinIntegration.id });
    expect(applyWidgetIntegrationMigration(widget, plan!, jellyfinIntegration.id)).toMatchObject({
      integrationId: jellyfinIntegration.id,
      config: { viewMode: 'now-playing' },
    });
  });

  it('relinks a stale redacted save when one owner integration uniquely matches', () => {
    const portainerIntegration: MigrationIntegration = {
      id: 'portainer-1',
      userId: ownerId,
      type: 'portainer',
      config: {
        url: 'http://portainer.local:9000',
        apiKey: 'server-only-key',
        endpointId: '1',
      },
    };
    const widget: MigrationWidget = {
      id: 'widget-7',
      widgetType: 'portainer',
      config: { url: 'http://portainer.local:9000', endpointId: '1' },
    };

    expect(planWidgetIntegrationMigration(widget, ownerId, [portainerIntegration])).toMatchObject({
      action: 'link-and-redact',
      integrationId: portainerIntegration.id,
      reason: expect.stringContaining('redacted legacy save'),
    });
  });
});
