import { DEFAULT_WIDGET_ROLES as DEFAULT_PERMISSIONS } from '@/lib/widget-roles';
import { NextResponse } from 'next/server';
import { apiSecurityErrorResponse, requireApiUser } from '@/lib/api-security';
import { prisma } from '@/lib/db';
import {
  createEmptyDashboardLayout,
  parseStoredDashboardLayout,
  serializeDashboardLayout,
} from '@/lib/dashboard-layout';
import { parseDashboardSaveRequest } from '@/lib/request-parsers';
import { getIntegrationCredentialStatus } from '@/lib/integration-credentials';
import { tryParseJsonString } from '@/lib/validation';
import { decryptSensitiveFields } from '@/utils/crypto';
import { redactSensitiveFields } from '@/utils/sensitive-config';
import { resolvePermission, type AccessLevel } from '@/utils/permissions';
import {
  ensureAutomaticIntegrationMigration,
  runAutomaticIntegrationMigration,
} from '@/lib/automatic-integration-migration';
import {
  getMigrationWidgetType,
  hasLegacyIntegrationConfig,
  INTEGRATION_MIGRATION_SPECS,
  reconcileWidgetIntegrationSelection,
  redactProtectedRssFeedUrls,
  type MigrationWidget,
} from '@/lib/integration-config-migration';

export const dynamic = 'force-dynamic';

const redactWidgetConfig = (
  widgetType: string,
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const redacted = redactSensitiveFields(config, 'omit');
  return widgetType === 'rss'
    ? redactProtectedRssFeedUrls(redacted)
    : redacted;
};

// Get permissions from database, seeding defaults if empty
async function getPermissions(): Promise<Record<string, string[]>> {
  try {
    const permissions = await prisma.widgetPermission.findMany();

    // If no permissions in DB, seed with defaults
    if (permissions.length === 0) {
      await Promise.all(
        Object.entries(DEFAULT_PERMISSIONS).map(([widgetType, roles]) =>
          prisma.widgetPermission.create({
            data: {
              widgetType,
              roles: JSON.stringify(roles),
            },
          })
        )
      );
      return DEFAULT_PERMISSIONS;
    }

    // Convert DB records to object
    const permissionsMap: Record<string, string[]> = {};
    for (const p of permissions) {
      permissionsMap[p.widgetType] = JSON.parse(p.roles);
    }
    return permissionsMap;
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return DEFAULT_PERMISSIONS;
  }
}

// Fetch user's integrations from database
async function getUserIntegrations(userId: string) {
  try {
    const integrations = await prisma.integration.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return integrations.map(({ id, name, type, config: stored }) => {
      const config = JSON.parse(stored) as Record<string, unknown>;
      return {
        id,
        name,
        type,
        config: redactSensitiveFields(config),
        credentialStatus: getIntegrationCredentialStatus(config),
      };
    });
  } catch (error) {
    console.error('Error fetching user integrations:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();

    // Get permissions from database
    const permissions = await getPermissions();
    const userId = user.id;

    // This is also invoked during server startup. Keeping the guarded call here
    // makes hot development reloads and non-standard runtimes converge on the
    // same idempotent migration before any dashboard configuration is returned.
    await ensureAutomaticIntegrationMigration();

    // Get user's integrations from database
    const integrations = await getUserIntegrations(userId);

    // Get dashboardId from URL
    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('dashboardId');

    // Try to get user's preferred dashboard (may be a shared dashboard)
    let dashboard = null;

    if (dashboardId) {
       // Explicit request for a specific dashboard
       const requestedDashboard = await prisma.dashboard.findUnique({
         where: { id: dashboardId },
       });

       if (requestedDashboard) {
          // Check access
          const isOwner = requestedDashboard.userId === userId;
          
          if (isOwner) {
             dashboard = requestedDashboard;
          } else {
             // Check permissions
             const effectivePermission = await resolvePermission(
               {
                 objectType: 'dashboard',
                 objectId: dashboardId,
                 ownerId: requestedDashboard.userId,
                 accessLevel: (requestedDashboard.accessLevel || 'PRIVATE') as AccessLevel,
               },
               userId
             );

             if (effectivePermission === 'view' || effectivePermission === 'edit') {
               dashboard = requestedDashboard;
             }
          }
       }
    }
    
    // Preferences remember a selection, never an authorization grant.
    if (!dashboard) {
      const preference = await prisma.userDashboardPreference.findUnique({
        where: { userId },
      });

      if (preference?.defaultDashboardId) {
        const preferredDashboard = await prisma.dashboard.findUnique({
          where: { id: preference.defaultDashboardId },
        });

        if (preferredDashboard) {
          const permission = await resolvePermission(
            {
              objectType: 'dashboard',
              objectId: preferredDashboard.id,
              ownerId: preferredDashboard.userId,
              accessLevel: (preferredDashboard.accessLevel || 'PRIVATE') as AccessLevel,
            },
            userId,
          );
          if (permission === 'view' || permission === 'edit') {
            dashboard = preferredDashboard;
          }
        }
      }
    }

    // 2. Fall back to user's owned default dashboard
    if (!dashboard) {
      dashboard = await prisma.dashboard.findFirst({
        where: {
          userId,
          isDefault: true,
        },
      });
    }

    // 3. If still no dashboard, create one
    if (!dashboard) {
      const defaultLayout = createEmptyDashboardLayout();
      dashboard = await prisma.dashboard.create({
        data: {
          userId,
          name: 'Main',
          layout: serializeDashboardLayout(defaultLayout),
          isDefault: true,
        },
      });
    }

    // Parse the dashboard layout
    const dashboardData = parseStoredDashboardLayout(
      tryParseJsonString(dashboard.layout, {}),
    );

    // Legacy integration-backed widgets are never allowed to send reusable
    // credentials to the browser. Other widget types retain their existing
    // compatibility behavior until their own server routes are migrated.
    if (dashboardData.widgets.length > 0) {
      dashboardData.widgets = dashboardData.widgets.map((widget) => {
        if (widget.config && typeof widget.config === 'object') {
          const migrationWidget = widget as unknown as MigrationWidget;
          const widgetType = getMigrationWidgetType(migrationWidget);
          const parsedConfig = widget.config as Record<string, unknown>;
          return {
            ...widget,
            config: INTEGRATION_MIGRATION_SPECS[widgetType] || widgetType === 'calendar'
              ? redactWidgetConfig(widgetType, parsedConfig)
              : decryptSensitiveFields(parsedConfig),
          };
        }
        return widget;
      });

      // Fetch per-user configs for widgets with syncConfig: false
      const widgetIds = dashboardData.widgets
        .filter((widget) => widget.syncConfig === false)
        .map((widget) => widget.id);

      if (widgetIds.length > 0) {
        const userConfigs = await prisma.widgetUserConfig.findMany({
          where: {
            userId,
            widgetId: { in: widgetIds },
          },
        });

        // Create a map of widgetId -> userConfig
        const userConfigMap = new Map(
          userConfigs.map((uc: typeof userConfigs[number]) => [uc.widgetId, JSON.parse(uc.config)])
        );

        // Merge user configs into widgets
        dashboardData.widgets = dashboardData.widgets.map((widget) => {
          if (widget.syncConfig === false && userConfigMap.has(widget.id)) {
            const storedUserConfig = userConfigMap.get(widget.id) as Record<string, unknown>;
            const widgetType = getMigrationWidgetType(widget as unknown as MigrationWidget);
            const isMigratedType = Boolean(
              INTEGRATION_MIGRATION_SPECS[widgetType] || widgetType === 'calendar',
            );
            const integrationId = typeof storedUserConfig.integrationId === 'string'
              ? storedUserConfig.integrationId
              : widget.integrationId;
            const configWithoutIntegration = { ...storedUserConfig };
            delete configWithoutIntegration.integrationId;
            const userConfig = isMigratedType
              ? redactWidgetConfig(widgetType, configWithoutIntegration)
              : decryptSensitiveFields(configWithoutIntegration);
            return {
              ...widget,
              integrationId,
              config: {
                ...(widget.config as Record<string, unknown> || {}),
                ...(userConfig || {}),
              },
            };
          }
          return widget;
        });
      }
    }

    // Determine if user can edit this dashboard
    const effectivePermission = await resolvePermission(
      {
        objectType: 'dashboard',
        objectId: dashboard.id,
        ownerId: dashboard.userId,
        accessLevel: (dashboard.accessLevel || 'PRIVATE') as AccessLevel,
      },
      userId
    );
    const canEditDashboard = effectivePermission === 'edit';

    // Merge dashboard with integrations and permissions
    return NextResponse.json({
      ...dashboardData,
      dashboardId: dashboard.id,
      integrations,
      permissions,
      userRole: user.role,
      canEditDashboard,
    });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to read configuration');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);

    // Viewers cannot save
    if (user.role === 'viewer') {
      return NextResponse.json({ error: 'Viewers cannot edit dashboards' }, { status: 403 });
    }

    const userId = user.id;
    const parsedRequest = parseDashboardSaveRequest(await request.json());
    await ensureAutomaticIntegrationMigration();
    let dashboardData = parsedRequest.layout;

    // Find or create dashboard
    let existingDashboard = null;

    if (parsedRequest.dashboardId) {
       // Best case: we have a specific ID
       existingDashboard = await prisma.dashboard.findUnique({
         where: { id: parsedRequest.dashboardId },
       });
       
       // Verify ownership or permission
       // If not owner, check if they have EDIT permission
       if (existingDashboard && existingDashboard.userId !== userId) {
          // Check permissions
          const permission = await resolvePermission(
             {
               objectType: 'dashboard',
               objectId: existingDashboard.id,
               ownerId: existingDashboard.userId,
               accessLevel: existingDashboard.accessLevel as AccessLevel
             },
             userId
          );
          
          if (permission !== 'edit') {
             return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
          }
       }
    }

    if (!existingDashboard) {
      // Fallback: Use default dashboard logic (legacy behavior)
      existingDashboard = await prisma.dashboard.findFirst({
        where: {
          userId,
          isDefault: true,
        },
      });
    }

    if (existingDashboard) {
      const existingLayout = parseStoredDashboardLayout(
        tryParseJsonString(existingDashboard.layout, {}),
      );
      const existingWidgets = new Map(
        existingLayout.widgets.map((widget) => [widget.id, widget]),
      );
      dashboardData = {
        ...dashboardData,
        widgets: dashboardData.widgets.map((widget) =>
          reconcileWidgetIntegrationSelection(
            widget as unknown as MigrationWidget,
            existingWidgets.get(widget.id) as unknown as MigrationWidget | undefined,
          ) as unknown as typeof widget,
        ),
      };
    }

    let savedDashboardId = existingDashboard?.id;
    if (existingDashboard) {
      // Update existing dashboard
          await prisma.dashboard.update({
        where: { id: existingDashboard.id },
        data: {
          layout: serializeDashboardLayout(dashboardData),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new dashboard
      const created = await prisma.dashboard.create({
        data: {
          userId,
          name: 'Main',
          layout: serializeDashboardLayout(dashboardData),
          isDefault: true,
        },
      });
      savedDashboardId = created.id;
    }

    // Old clients and imported layouts may still submit inline connection
    // settings. Normalize the just-saved layout before acknowledging the save.
    if (dashboardData.widgets.some((widget) => hasLegacyIntegrationConfig(widget as unknown as MigrationWidget))) {
      await runAutomaticIntegrationMigration({ dashboardId: savedDashboardId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to save configuration');
  }
}
