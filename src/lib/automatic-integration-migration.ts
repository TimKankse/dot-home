import path from 'node:path';

import { prisma } from './db';
import {
  applyPlannedWidgetIntegrationMigration,
  getMigrationConfigKey,
  planWidgetIntegrationMigrations,
  type MigrationIntegration,
  type MigrationWidget,
  type PlannedWidgetIntegrationMigration,
  type WidgetMigrationPlan,
} from './integration-config-migration';
import { decryptSensitiveFields, encryptSensitiveFields } from '../utils/crypto';

type JsonRecord = Record<string, unknown>;

type DashboardWork = {
  id: string;
  name: string;
  ownerId: string;
  layout: JsonRecord;
  widgets: MigrationWidget[];
  migrations: Array<{ index: number; migration: PlannedWidgetIntegrationMigration }>;
};

type PersonalConfigWork = {
  id: string;
  userId: string;
  config: JsonRecord;
  widget: MigrationWidget;
  migrations: PlannedWidgetIntegrationMigration[];
};

export type AutomaticIntegrationMigrationResult = {
  changedDashboards: number;
  changedPersonalConfigs: number;
  createdIntegrations: number;
  repairedIntegrations: number;
  actions: Record<string, number>;
  planned: Array<{
    action: string;
    widgetType: string;
    widgetName: string;
    reason?: string;
  }>;
  blocked: Array<{ widgetType: string; widgetName: string; reason?: string }>;
  backupPath?: string;
};

const MUTATING_ACTIONS = new Set([
  'redact',
  'link-and-redact',
  'create-link-and-redact',
  'repair-and-redact',
]);

const parseRecord = (value: string): JsonRecord => {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a stored JSON object');
  }
  return parsed as JsonRecord;
};

const containsEncryptedValue = (value: unknown): boolean => {
  if (typeof value === 'string') return value.startsWith('enc:');
  if (Array.isArray(value)) return value.some(containsEncryptedValue);
  return Boolean(value && typeof value === 'object' && Object.values(value).some(containsEncryptedValue));
};

const getSqliteDatabasePath = (): string | undefined => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith('file:')) return undefined;
  const configuredPath = databaseUrl.slice('file:'.length).split('?')[0];
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), 'prisma', configuredPath);
};

const createDatabaseBackup = async (): Promise<string | undefined> => {
  const databasePath = getSqliteDatabasePath();
  if (!databasePath) return undefined;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${databasePath}.pre-integration-migration-${timestamp}.bak`;
  const escapedBackupPath = backupPath.replace(/'/g, "''");
  await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedBackupPath}'`);
  return backupPath;
};

async function buildWork() {
  const [dashboards, storedIntegrations, personalConfigs] = await Promise.all([
    prisma.dashboard.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.integration.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.widgetUserConfig.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);
  const integrations: MigrationIntegration[] = storedIntegrations.map((integration) => {
    const config = decryptSensitiveFields(parseRecord(integration.config));
    return {
      id: integration.id,
      userId: integration.userId,
      type: integration.type,
      config,
      decryptable: !containsEncryptedValue(config),
    };
  });

  const dashboardWork: DashboardWork[] = dashboards.map((dashboard) => {
    const layout = parseRecord(dashboard.layout);
    const widgets = Array.isArray(layout.widgets)
      ? layout.widgets as MigrationWidget[]
      : [];
    const migrations = widgets.flatMap((widget, index) =>
      planWidgetIntegrationMigrations(widget, dashboard.userId, integrations)
        .map((migration) => ({ index, migration })),
    );
    return {
      id: dashboard.id,
      name: dashboard.name,
      ownerId: dashboard.userId,
      layout,
      widgets,
      migrations,
    };
  });

  const widgetById = new Map<string, MigrationWidget>();
  dashboardWork.forEach(({ widgets }) => widgets.forEach((widget) => {
    if (typeof widget.id === 'string') widgetById.set(widget.id, widget);
  }));
  const personalWork: PersonalConfigWork[] = [];
  for (const personal of personalConfigs) {
    const baseWidget = widgetById.get(personal.widgetId);
    if (!baseWidget) continue;
    const config = parseRecord(personal.config);
    const syntheticWidget: MigrationWidget = {
      ...baseWidget,
      integrationId: typeof config.integrationId === 'string' ? config.integrationId : undefined,
      config,
    };
    const migrations = planWidgetIntegrationMigrations(
      syntheticWidget,
      personal.userId,
      integrations,
    );
    if (migrations.length > 0) {
      personalWork.push({
        id: personal.id,
        userId: personal.userId,
        config,
        widget: syntheticWidget,
        migrations,
      });
    }
  }

  return { dashboardWork, personalWork };
}

export async function runAutomaticIntegrationMigration(
  options: { backup?: boolean; dryRun?: boolean } = {},
): Promise<AutomaticIntegrationMigrationResult> {
  const { dashboardWork, personalWork } = await buildWork();
  const allPlans = [
    ...dashboardWork.flatMap((dashboard) =>
      dashboard.migrations.map(({ migration }) => migration.plan),
    ),
    ...personalWork.flatMap(({ migrations }) =>
      migrations.map(({ plan }) => plan),
    ),
  ];
  const blocked = allPlans
    .filter((plan) => plan.action === 'blocked')
    .map((plan) => ({
      widgetType: plan.widgetType,
      widgetName: plan.widgetName,
      reason: plan.reason,
    }));
  const planned = allPlans
    .filter((plan) => !['already-clean', 'skip'].includes(plan.action))
    .map((plan) => ({
      action: plan.action,
      widgetType: plan.widgetType,
      widgetName: plan.widgetName,
      reason: plan.reason,
    }));
  const actions = Object.fromEntries(
    [...new Set(allPlans.map((plan) => plan.action))]
      .sort()
      .map((action) => [
        action,
        allPlans.filter((plan) => plan.action === action).length,
      ]),
  );
  const hasChanges = allPlans.some((plan) => MUTATING_ACTIONS.has(plan.action));
  const result: AutomaticIntegrationMigrationResult = {
    changedDashboards: 0,
    changedPersonalConfigs: 0,
    createdIntegrations: 0,
    repairedIntegrations: 0,
    actions,
    planned,
    blocked,
  };
  if (!hasChanges || options.dryRun) return result;

  if (options.backup !== false) result.backupPath = await createDatabaseBackup();
  await prisma.$transaction(async (transaction) => {
    const createdByConfig = new Map<string, string>();
    const repairedConfigs = new Map<string, string>();

    const resolvePlanIntegration = async (
      ownerId: string,
      plan: WidgetMigrationPlan,
    ): Promise<string> => {
      if (plan.action === 'repair-and-redact') {
        if (!plan.integrationId || !plan.integrationConfig) {
          throw new Error(`Incomplete repair plan for ${plan.widgetId}`);
        }
        const serialized = JSON.stringify(
          encryptSensitiveFields(plan.integrationConfig),
        );
        const previous = repairedConfigs.get(plan.integrationId);
        if (previous && previous !== serialized) {
          throw new Error(`Conflicting legacy credentials reference integration ${plan.integrationId}`);
        }
        if (!previous) {
          await transaction.integration.update({
            where: { id: plan.integrationId },
            data: { config: serialized },
          });
          repairedConfigs.set(plan.integrationId, serialized);
          result.repairedIntegrations += 1;
        }
        return plan.integrationId;
      }

      if (plan.integrationId) return plan.integrationId;
      if (!plan.integrationConfig) throw new Error(`No integration config for ${plan.widgetId}`);
      const configKey = `${ownerId}:${getMigrationConfigKey(plan.widgetType, plan.integrationConfig)}`;
      const existing = createdByConfig.get(configKey);
      if (existing) return existing;
      const created = await transaction.integration.create({
        data: {
          userId: ownerId,
          name: `${plan.widgetName} (migrated)`,
          type: plan.widgetType,
          config: JSON.stringify(encryptSensitiveFields(plan.integrationConfig)),
        },
      });
      createdByConfig.set(configKey, created.id);
      result.createdIntegrations += 1;
      return created.id;
    };

    for (const dashboard of dashboardWork) {
      const widgets = [...dashboard.widgets];
      let changed = false;
      for (const { index, migration } of dashboard.migrations) {
        if (!MUTATING_ACTIONS.has(migration.plan.action)) continue;
        const integrationId = await resolvePlanIntegration(dashboard.ownerId, migration.plan);
        widgets[index] = applyPlannedWidgetIntegrationMigration(
          widgets[index],
          migration,
          integrationId,
        );
        changed = true;
      }
      if (changed) {
        await transaction.dashboard.update({
          where: { id: dashboard.id },
          data: { layout: JSON.stringify({ ...dashboard.layout, widgets }) },
        });
        result.changedDashboards += 1;
      }
    }

    for (const personal of personalWork) {
      let migrated = personal.widget;
      let changed = false;
      for (const migration of personal.migrations) {
        if (!MUTATING_ACTIONS.has(migration.plan.action)) continue;
        const integrationId = await resolvePlanIntegration(personal.userId, migration.plan);
        migrated = applyPlannedWidgetIntegrationMigration(
          migrated,
          migration,
          integrationId,
        );
        changed = true;
      }
      if (!changed) continue;
      await transaction.widgetUserConfig.update({
        where: { id: personal.id },
        data: {
          config: JSON.stringify({
            ...(migrated.config || {}),
            ...(migrated.integrationId ? { integrationId: migrated.integrationId } : {}),
          }),
        },
      });
      result.changedPersonalConfigs += 1;
    }
  });
  return result;
}

let startupMigration: Promise<AutomaticIntegrationMigrationResult> | undefined;

export function ensureAutomaticIntegrationMigration() {
  if (!startupMigration) {
    startupMigration = runAutomaticIntegrationMigration().catch((error) => {
      startupMigration = undefined;
      throw error;
    });
  }
  return startupMigration;
}
