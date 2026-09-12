import { isIP } from 'node:net';

import { isNonPublicIpAddress } from './ip-address';

type JsonRecord = Record<string, unknown>;

export type MigrationIntegration = {
  id: string;
  userId: string;
  type: string;
  config: JsonRecord;
  decryptable?: boolean;
};

export type MigrationWidget = JsonRecord & {
  id?: string;
  name?: string;
  type?: string;
  widgetType?: string;
  integrationId?: string;
  config?: JsonRecord;
};

export type WidgetMigrationAction =
  | 'already-clean'
  | 'redact'
  | 'link-and-redact'
  | 'create-link-and-redact'
  | 'repair-and-redact'
  | 'blocked'
  | 'skip';

export type WidgetMigrationPlan = {
  action: WidgetMigrationAction;
  widgetId: string;
  widgetName: string;
  widgetType: string;
  integrationId?: string;
  integrationConfig?: JsonRecord;
  reason?: string;
};

export type PlannedWidgetIntegrationMigration = {
  plan: WidgetMigrationPlan;
  calendarIntegrationType?: 'radarr' | 'sonarr';
  rssFeedUrl?: string;
};

type MigrationSpec = {
  connectionFields: readonly string[];
  ready: boolean;
  buildConfig: (config: JsonRecord) => JsonRecord | null;
};

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const readUsableString = (value: unknown): string | undefined => {
  const result = readString(value);
  return result && !result.startsWith('enc:') ? result : undefined;
};

const compact = (values: JsonRecord): JsonRecord =>
  Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );

const urlAndApiKey = (config: JsonRecord): JsonRecord | null => {
  const url = readUsableString(config.externalUrl) || readUsableString(config.url);
  const apiKey = readUsableString(config.apiKey);
  return url && apiKey ? compact({ url, apiKey }) : null;
};

export const INTEGRATION_MIGRATION_SPECS: Record<string, MigrationSpec> = {
  jellyfin: {
    connectionFields: ['url', 'externalUrl', 'apiKey', 'userId'],
    ready: true,
    buildConfig: (config) => {
      const base = urlAndApiKey(config);
      if (!base) return null;
      return compact({ ...base, userId: readString(config.userId) });
    },
  },
  jellyseerr: {
    connectionFields: ['url', 'externalUrl', 'apiKey'],
    ready: true,
    buildConfig: urlAndApiKey,
  },
  portainer: {
    connectionFields: ['url', 'externalUrl', 'apiKey', 'endpointId'],
    ready: true,
    buildConfig: (config) => {
      const base = urlAndApiKey(config);
      if (!base) return null;
      return compact({ ...base, endpointId: readUsableString(config.endpointId) });
    },
  },
  sabnzbd: {
    connectionFields: ['url', 'externalUrl', 'apiKey'],
    ready: true,
    buildConfig: urlAndApiKey,
  },
  qbittorrent: {
    connectionFields: ['url', 'externalUrl', 'username', 'password'],
    ready: true,
    buildConfig: (config) => {
      const url = readUsableString(config.externalUrl) || readUsableString(config.url);
      if (!url) return null;
      return compact({
        url,
        username: readUsableString(config.username),
        password: readUsableString(config.password),
      });
    },
  },
  twitch: {
    connectionFields: ['clientId', 'clientSecret'],
    ready: true,
    buildConfig: (config) => {
      const clientId = readUsableString(config.clientId);
      const clientSecret = readUsableString(config.clientSecret);
      return clientId && clientSecret ? { clientId, clientSecret } : null;
    },
  },
  netdata: {
    connectionFields: ['url', 'externalUrl'],
    ready: true,
    buildConfig: (config) => {
      const url = readUsableString(config.externalUrl) || readUsableString(config.url);
      return url ? { url } : null;
    },
  },
  radarr: {
    connectionFields: ['url', 'externalUrl', 'apiKey'],
    ready: true,
    buildConfig: urlAndApiKey,
  },
  sonarr: {
    connectionFields: ['url', 'externalUrl', 'apiKey'],
    ready: true,
    buildConfig: urlAndApiKey,
  },
  rss: {
    connectionFields: ['secretUrl'],
    ready: true,
    buildConfig: (config) => {
      const secretUrl = readUsableString(config.secretUrl);
      return secretUrl ? { secretUrl } : null;
    },
  },
};

export const getMigrationWidgetType = (widget: MigrationWidget): string =>
  readString(widget.widgetType) || readString(widget.type) || 'unknown';

export const getMigrationIntegrationId = (
  widget: MigrationWidget,
): string | undefined =>
  readString(widget.integrationId) || readString(widget.config?.integrationId);

const stableConfigKey = (type: string, config: JsonRecord): string =>
  `${type}:${JSON.stringify(
    Object.fromEntries(Object.entries(config).sort(([left], [right]) => left.localeCompare(right))),
  )}`;

export const getMigrationConfigKey = stableConfigKey;

export function stripMigratedConnectionFields(
  widget: MigrationWidget,
): MigrationWidget {
  const widgetType = getMigrationWidgetType(widget);
  const spec = INTEGRATION_MIGRATION_SPECS[widgetType];
  if (!spec) return widget;

  const config = { ...(widget.config || {}) };
  for (const field of spec.connectionFields) delete config[field];
  delete config.integrationId;

  return {
    ...widget,
    config,
  };
}

export function reconcileWidgetIntegrationSelection(
  incomingWidget: MigrationWidget,
  storedWidget: MigrationWidget | undefined,
): MigrationWidget {
  if (typeof incomingWidget.integrationId === 'string') {
    if (incomingWidget.integrationId.trim()) return incomingWidget;

    const { integrationId: _cleared, ...withoutIntegration } = incomingWidget;
    const widgetType = getMigrationWidgetType(withoutIntegration);
    return INTEGRATION_MIGRATION_SPECS[widgetType]
      ? stripMigratedConnectionFields(withoutIntegration)
      : withoutIntegration;
  }

  const storedIntegrationId = storedWidget
    ? getMigrationIntegrationId(storedWidget)
    : undefined;
  if (!storedIntegrationId) return incomingWidget;

  const widgetType = getMigrationWidgetType(incomingWidget);
  if (!INTEGRATION_MIGRATION_SPECS[widgetType]) return incomingWidget;

  return stripMigratedConnectionFields({
    ...incomingWidget,
    integrationId: storedIntegrationId,
  });
}

export function planWidgetIntegrationMigration(
  widget: MigrationWidget,
  ownerId: string,
  integrations: MigrationIntegration[],
): WidgetMigrationPlan | null {
  const widgetType = getMigrationWidgetType(widget);
  const spec = INTEGRATION_MIGRATION_SPECS[widgetType];
  if (!spec) return null;

  const widgetId = readString(widget.id) || 'unknown-widget';
  const widgetName = readString(widget.name) || widgetType;
  const config = widget.config || {};
  const integrationId = getMigrationIntegrationId(widget);
  const integrationIdNeedsPromotion =
    !readString(widget.integrationId) && readString(config.integrationId) !== undefined;
  const connectionFieldsPresent = spec.connectionFields.some(
    (field) => readString(config[field]) !== undefined,
  );

  if (integrationId) {
    const integration = integrations.find(
      (candidate) =>
        candidate.id === integrationId &&
        candidate.userId === ownerId &&
        candidate.type === widgetType,
    );

    if (!integration) {
      return {
        action: 'blocked',
        widgetId,
        widgetName,
        widgetType,
        integrationId,
        reason: 'Referenced integration is missing, belongs to another user, or has the wrong type',
      };
    }

    if (integration.decryptable === false) {
      const repairConfig = spec.ready ? spec.buildConfig(config) : null;
      if (repairConfig) {
        return {
          action: 'repair-and-redact',
          widgetId,
          widgetName,
          widgetType,
          integrationId,
          integrationConfig: repairConfig,
          reason: 'Repair stored integration credentials from the legacy inline configuration',
        };
      }
      if (connectionFieldsPresent || integrationIdNeedsPromotion) {
        return {
          action: 'redact',
          widgetId,
          widgetName,
          widgetType,
          integrationId,
          reason: 'Remove the unusable legacy copy; re-enter the stored integration credentials',
        };
      }
      return {
        action: 'blocked',
        widgetId,
        widgetName,
        widgetType,
        integrationId,
        reason: 'Stored integration credentials could not be decrypted with the configured key',
      };
    }

    if (!connectionFieldsPresent && !integrationIdNeedsPromotion) {
      return {
        action: 'already-clean',
        widgetId,
        widgetName,
        widgetType,
        integrationId,
      };
    }

    if (!spec.ready) {
      return {
        action: 'blocked',
        widgetId,
        widgetName,
        widgetType,
        integrationId,
        reason: 'Server route has not been migrated to integration-only credentials yet',
      };
    }

    return {
      action: 'redact',
      widgetId,
      widgetName,
      widgetType,
      integrationId,
    };
  }

  const integrationConfig = spec.buildConfig(config);
  if (!integrationConfig) {
    // An older browser may save a redacted legacy config after the server has
    // already created its Integration record. Recover the link only when the
    // remaining non-secret fields identify exactly one owner integration.
    const partialConnectionConfig = compact(
      Object.fromEntries(spec.connectionFields.flatMap((field) => {
        const value = readUsableString(config[field]);
        if (!value) return [];
        const normalizedField = field === 'externalUrl' ? 'url' : field;
        return [[normalizedField, value]];
      })),
    );
    const partialEntries = Object.entries(partialConnectionConfig);
    const partialMatches = partialEntries.length > 0
      ? integrations.filter((candidate) => {
          if (
            candidate.userId !== ownerId ||
            candidate.type !== widgetType ||
            candidate.decryptable === false
          ) return false;
          const normalizedCandidate = spec.buildConfig(candidate.config);
          return Boolean(
            normalizedCandidate &&
            partialEntries.every(([field, value]) => normalizedCandidate[field] === value),
          );
        })
      : [];
    if (spec.ready && partialMatches.length === 1) {
      return {
        action: 'link-and-redact',
        widgetId,
        widgetName,
        widgetType,
        integrationId: partialMatches[0].id,
        reason: 'Relink the uniquely matching integration after a redacted legacy save',
      };
    }
    return {
      action: 'skip',
      widgetId,
      widgetName,
      widgetType,
      reason: connectionFieldsPresent
        ? 'Inline connection configuration is incomplete'
        : 'No inline connection configuration found',
    };
  }

  if (!spec.ready) {
    return {
      action: 'blocked',
      widgetId,
      widgetName,
      widgetType,
      reason: 'Server route has not been migrated to integration-only credentials yet',
    };
  }

  const configKey = stableConfigKey(widgetType, integrationConfig);
  const matching = integrations.find(
    (candidate) =>
      candidate.userId === ownerId &&
      candidate.type === widgetType &&
      candidate.decryptable !== false &&
      stableConfigKey(candidate.type, spec.buildConfig(candidate.config) || {}) === configKey,
  );

  if (!matching) {
    const partialConnectionConfig = compact(
      Object.fromEntries(spec.connectionFields.flatMap((field) => {
        const value = readUsableString(config[field]);
        if (!value) return [];
        return [[field === 'externalUrl' ? 'url' : field, value]];
      })),
    );
    const partialEntries = Object.entries(partialConnectionConfig);
    const partialMatches = integrations.filter((candidate) => {
      if (
        candidate.userId !== ownerId ||
        candidate.type !== widgetType ||
        candidate.decryptable === false
      ) return false;
      const normalizedCandidate = spec.buildConfig(candidate.config);
      return Boolean(
        normalizedCandidate &&
        partialEntries.every(([field, value]) => normalizedCandidate[field] === value),
      );
    });
    if (partialEntries.length > 0 && partialMatches.length === 1) {
      return {
        action: 'link-and-redact',
        widgetId,
        widgetName,
        widgetType,
        integrationId: partialMatches[0].id,
        reason: 'Relink the uniquely matching integration after a redacted legacy save',
      };
    }
  }

  return matching
    ? {
        action: 'link-and-redact',
        widgetId,
        widgetName,
        widgetType,
        integrationId: matching.id,
      }
    : {
        action: 'create-link-and-redact',
        widgetId,
        widgetName,
        widgetType,
        integrationConfig,
      };
}

export function applyWidgetIntegrationMigration(
  widget: MigrationWidget,
  plan: WidgetMigrationPlan,
  integrationId: string,
): MigrationWidget {
  if (!['redact', 'link-and-redact', 'create-link-and-redact', 'repair-and-redact'].includes(plan.action)) {
    return widget;
  }

  return {
    ...stripMigratedConnectionFields(widget),
    integrationId,
  };
}

const CALENDAR_INTEGRATION_TYPES = ['radarr', 'sonarr'] as const;

const RSS_CREDENTIAL_QUERY_KEY = /^(?:api[-_]?key|access[-_]?token|auth|key|p|pass|password|secret|token)$/i;

export const requiresStoredRssIntegration = (value: string): boolean => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    const isPrivateHost = hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      (isIP(hostname) !== 0 && isNonPublicIpAddress(hostname));
    const hasCredentialQuery = [...url.searchParams.keys()]
      .some((key) => RSS_CREDENTIAL_QUERY_KEY.test(key));
    return isPrivateHost || Boolean(url.username || url.password) || hasCredentialQuery;
  } catch {
    return false;
  }
};

export const redactProtectedRssFeedUrls = (config: JsonRecord): JsonRecord => {
  const result = { ...config };
  const singleFeed = readString(result.feedUrl);
  if (singleFeed && requiresStoredRssIntegration(singleFeed)) delete result.feedUrl;

  if (Array.isArray(result.feedUrls)) {
    const publicFeeds = result.feedUrls.filter(
      (value) => typeof value !== 'string' || !requiresStoredRssIntegration(value),
    );
    if (publicFeeds.length > 0) result.feedUrls = publicFeeds;
    else delete result.feedUrls;
  }

  return result;
};

const planRssIntegrationMigration = (
  widget: MigrationWidget,
  ownerId: string,
  integrations: MigrationIntegration[],
): PlannedWidgetIntegrationMigration[] => {
  const config = widget.config || {};
  const legacyUrls = [
    readString(config.feedUrl),
    ...(Array.isArray(config.feedUrls) ? config.feedUrls.map(readString) : []),
  ].filter((value): value is string => Boolean(value));
  const storedFeedUrls = [...new Set(legacyUrls.filter(requiresStoredRssIntegration))];
  const existingIntegrationId = getMigrationIntegrationId(widget);

  if (existingIntegrationId) {
    const existingIntegration = integrations.find(
      (candidate) =>
        candidate.id === existingIntegrationId &&
        candidate.userId === ownerId &&
        candidate.type === 'rss' &&
        candidate.decryptable !== false,
    );
    const legacyStoredUrl = readUsableString(existingIntegration?.config.feedUrl);
    if (existingIntegration && legacyStoredUrl) {
      return [{
        plan: {
          action: 'repair-and-redact',
          widgetId: readString(widget.id) || 'unknown-widget',
          widgetName: readString(widget.name) || 'rss',
          widgetType: 'rss',
          integrationId: existingIntegration.id,
          integrationConfig: {
            secretUrl: readUsableString(existingIntegration.config.secretUrl) || legacyStoredUrl,
          },
          reason: 'Normalize the stored RSS feed URL as an encrypted integration secret',
        },
      }];
    }
  }

  if (storedFeedUrls.length > 1) {
    return [{
      plan: {
        action: 'blocked',
        widgetId: readString(widget.id) || 'unknown-widget',
        widgetName: readString(widget.name) || 'rss',
        widgetType: 'rss',
        reason: 'Multiple private or authenticated feeds require separate RSS widgets',
      },
    }];
  }
  if (storedFeedUrls.length === 0 && !existingIntegrationId) return [];

  const feedUrl = storedFeedUrls[0];
  const syntheticWidget: MigrationWidget = {
    id: readString(widget.id) || 'unknown-widget',
    name: readString(widget.name) || 'rss',
    widgetType: 'rss',
    integrationId: readString(widget.integrationId),
    config: compact({
      secretUrl: feedUrl,
      integrationId: readString(config.integrationId),
    }),
  };
  const plan = planWidgetIntegrationMigration(syntheticWidget, ownerId, integrations);
  return plan ? [{ plan, rssFeedUrl: feedUrl }] : [];
};

export function planWidgetIntegrationMigrations(
  widget: MigrationWidget,
  ownerId: string,
  integrations: MigrationIntegration[],
): PlannedWidgetIntegrationMigration[] {
  if (getMigrationWidgetType(widget) === 'rss') {
    return planRssIntegrationMigration(widget, ownerId, integrations);
  }
  const directPlan = planWidgetIntegrationMigration(widget, ownerId, integrations);
  if (directPlan) return [{ plan: directPlan }];
  if (getMigrationWidgetType(widget) !== 'calendar') return [];

  const config = widget.config || {};
  return CALENDAR_INTEGRATION_TYPES.flatMap((type) => {
    const integrationId = readString(config[`${type}IntegrationId`]);
    const url = readString(config[`${type}Url`]);
    const apiKey = readString(config[`${type}ApiKey`]);
    if (!integrationId && !url && !apiKey) return [];

    const syntheticWidget: MigrationWidget = {
      id: `${readString(widget.id) || 'calendar'}:${type}`,
      name: `${readString(widget.name) || 'Calendar'} ${type}`,
      widgetType: type,
      integrationId,
      config: compact({ url, apiKey }),
    };
    const plan = planWidgetIntegrationMigration(
      syntheticWidget,
      ownerId,
      integrations,
    );
    return plan ? [{ plan, calendarIntegrationType: type }] : [];
  });
}

export function applyPlannedWidgetIntegrationMigration(
  widget: MigrationWidget,
  migration: PlannedWidgetIntegrationMigration,
  integrationId: string,
): MigrationWidget {
  if (migration.rssFeedUrl) {
    if (!['redact', 'link-and-redact', 'create-link-and-redact', 'repair-and-redact'].includes(migration.plan.action)) {
      return widget;
    }
    const config = { ...(widget.config || {}) };
    if (readString(config.feedUrl) === migration.rssFeedUrl) delete config.feedUrl;
    if (Array.isArray(config.feedUrls)) {
      const remaining = config.feedUrls.filter(
        (value) => readString(value) !== migration.rssFeedUrl,
      );
      if (remaining.length > 0) config.feedUrls = remaining;
      else delete config.feedUrls;
    }
    delete config.integrationId;
    return { ...widget, config, integrationId };
  }
  if (!migration.calendarIntegrationType) {
    return applyWidgetIntegrationMigration(widget, migration.plan, integrationId);
  }
  if (!['redact', 'link-and-redact', 'create-link-and-redact', 'repair-and-redact'].includes(migration.plan.action)) {
    return widget;
  }

  const type = migration.calendarIntegrationType;
  const config = { ...(widget.config || {}) };
  delete config[`${type}Url`];
  delete config[`${type}ApiKey`];
  config[`${type}IntegrationId`] = integrationId;

  return { ...widget, config };
}
