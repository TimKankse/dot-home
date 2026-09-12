import { describe, expect, it } from 'vitest';

import {
  applyPlannedWidgetIntegrationMigration,
  applyWidgetIntegrationMigration,
  planWidgetIntegrationMigrations,
  planWidgetIntegrationMigration,
  reconcileWidgetIntegrationSelection,
  redactProtectedRssFeedUrls,
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
  it('preserves an explicit integration disconnect', () => {
    const incomingWidget: MigrationWidget = {
      id: 'portainer-widget',
      widgetType: 'portainer',
      integrationId: '',
      config: {
        endpointId: '1',
        url: 'http://portainer.local:9000',
        apiKey: 'redacted-value',
        displayMode: 'compact',
      },
    };
    const storedWidget: MigrationWidget = {
      ...incomingWidget,
      integrationId: 'portainer-1',
    };

    expect(reconcileWidgetIntegrationSelection(incomingWidget, storedWidget)).toEqual({
      id: 'portainer-widget',
      widgetType: 'portainer',
      config: { displayMode: 'compact' },
    });
  });

  it('restores an integration omitted by a legacy redacted save', () => {
    const incomingWidget: MigrationWidget = {
      id: 'portainer-widget',
      widgetType: 'portainer',
      config: {
        endpointId: '1',
        url: 'http://portainer.local:9000',
        apiKey: 'redacted-value',
      },
    };
    const storedWidget: MigrationWidget = {
      id: 'portainer-widget',
      widgetType: 'portainer',
      integrationId: 'portainer-1',
      config: { endpointId: '1' },
    };

    expect(reconcileWidgetIntegrationSelection(incomingWidget, storedWidget)).toEqual({
      id: 'portainer-widget',
      widgetType: 'portainer',
      integrationId: 'portainer-1',
      config: {},
    });
  });

  it('keeps a newly selected integration', () => {
    const incomingWidget: MigrationWidget = {
      id: 'portainer-widget',
      widgetType: 'portainer',
      integrationId: 'portainer-2',
      config: { endpointId: '1' },
    };
    const storedWidget: MigrationWidget = {
      ...incomingWidget,
      integrationId: 'portainer-1',
    };

    expect(reconcileWidgetIntegrationSelection(incomingWidget, storedWidget))
      .toEqual(incomingWidget);
  });

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

  it('migrates both legacy calendar service connections independently', () => {
    const widget: MigrationWidget = {
      id: 'calendar-1',
      name: 'Release calendar',
      type: 'calendar',
      config: {
        weekStart: 'monday',
        radarrUrl: 'http://radarr:7878',
        radarrApiKey: 'radarr-secret',
        sonarrUrl: 'http://sonarr:8989',
        sonarrApiKey: 'sonarr-secret',
      },
    };
    const plans = planWidgetIntegrationMigrations(widget, ownerId, []);

    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({
      calendarIntegrationType: 'radarr',
      plan: {
        action: 'create-link-and-redact',
        integrationConfig: { url: 'http://radarr:7878', apiKey: 'radarr-secret' },
      },
    });
    expect(plans[1]).toMatchObject({
      calendarIntegrationType: 'sonarr',
      plan: {
        action: 'create-link-and-redact',
        integrationConfig: { url: 'http://sonarr:8989', apiKey: 'sonarr-secret' },
      },
    });

    const withRadarr = applyPlannedWidgetIntegrationMigration(widget, plans[0], 'radarr-1');
    const migrated = applyPlannedWidgetIntegrationMigration(withRadarr, plans[1], 'sonarr-1');
    expect(migrated.config).toEqual({
      weekStart: 'monday',
      radarrIntegrationId: 'radarr-1',
      sonarrIntegrationId: 'sonarr-1',
    });
  });

  it('moves a private authenticated RSS feed into an integration and preserves public feeds', () => {
    const privateFeed = 'http://192.168.1.19:3033/i/?a=rss&token=secret';
    const publicFeed = 'https://feeds.bbci.co.uk/news/rss.xml';
    const widget: MigrationWidget = {
      id: 'rss-1',
      name: 'News',
      widgetType: 'rss',
      config: {
        feedUrls: [publicFeed, privateFeed],
        maxItems: 10,
      },
    };

    const plans = planWidgetIntegrationMigrations(widget, ownerId, []);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      rssFeedUrl: privateFeed,
      plan: {
        action: 'create-link-and-redact',
        integrationConfig: { secretUrl: privateFeed },
      },
    });

    expect(applyPlannedWidgetIntegrationMigration(widget, plans[0], 'rss-integration-1'))
      .toMatchObject({
        integrationId: 'rss-integration-1',
        config: { feedUrls: [publicFeed], maxItems: 10 },
      });
  });

  it('leaves credential-free public RSS feeds under the public outbound policy', () => {
    const widget: MigrationWidget = {
      id: 'rss-2',
      widgetType: 'rss',
      config: { feedUrls: ['https://feeds.bbci.co.uk/news/rss.xml'] },
    };

    expect(planWidgetIntegrationMigrations(widget, ownerId, [])).toEqual([]);
  });

  it('redacts legacy private RSS URLs while preserving public feeds', () => {
    expect(redactProtectedRssFeedUrls({
      feedUrl: 'http://192.168.1.19:3033/private.xml',
      feedUrls: [
        'https://feeds.bbci.co.uk/news/rss.xml',
        'https://feeds.example.test/private.xml?token=secret',
      ],
      maxItems: 5,
    })).toEqual({
      feedUrls: ['https://feeds.bbci.co.uk/news/rss.xml'],
      maxItems: 5,
    });
  });

  it('blocks ambiguous migration of multiple private RSS feeds', () => {
    const widget: MigrationWidget = {
      id: 'rss-3',
      widgetType: 'rss',
      config: {
        feedUrls: [
          'http://192.168.1.19:3033/one.xml',
          'http://192.168.1.20:3033/two.xml',
        ],
      },
    };

    expect(planWidgetIntegrationMigrations(widget, ownerId, [])[0]).toMatchObject({
      plan: {
        action: 'blocked',
        reason: expect.stringContaining('separate RSS widgets'),
      },
    });
  });

  it('repairs an RSS integration created by the transitional field schema', () => {
    const legacyIntegration: MigrationIntegration = {
      id: 'rss-legacy-1',
      userId: ownerId,
      type: 'rss',
      config: { feedUrl: 'http://192.168.1.19:3033/private.xml?token=secret' },
    };
    const widget: MigrationWidget = {
      id: 'rss-4',
      widgetType: 'rss',
      integrationId: legacyIntegration.id,
      config: { maxItems: 5 },
    };

    expect(planWidgetIntegrationMigrations(widget, ownerId, [legacyIntegration])[0])
      .toMatchObject({
        plan: {
          action: 'repair-and-redact',
          integrationId: legacyIntegration.id,
          integrationConfig: {
            secretUrl: 'http://192.168.1.19:3033/private.xml?token=secret',
          },
        },
      });
  });
});
