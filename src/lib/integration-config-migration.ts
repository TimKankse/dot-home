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
