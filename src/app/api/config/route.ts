import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  createEmptyDashboardLayout,
  parseStoredDashboardLayout,
  serializeDashboardLayout,
} from '@/lib/dashboard-layout';
import { parseDashboardSaveRequest } from '@/lib/request-parsers';
import { ValidationError, tryParseJsonString } from '@/lib/validation';
import { decryptSensitiveFields } from '@/utils/crypto';
import { resolvePermission, type AccessLevel } from '@/utils/permissions';

export const dynamic = 'force-dynamic';

// Default widget permissions by role
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  netdata: ['admin'],
  glances: ['admin'],
  portainer: ['admin'],
  jellyfin: ['admin', 'member'],
  jellyseerr: ['admin', 'member'],
  qbittorrent: ['admin', 'member'],
  sabnzbd: ['admin', 'member'],
  clock: ['admin', 'member', 'viewer'],
  weather: ['admin', 'member', 'viewer'],
  calendar: ['admin', 'member', 'viewer'],
  rss: ['admin', 'member', 'viewer'],
  search: ['admin', 'member', 'viewer'],
  shortcut: ['admin', 'member', 'viewer'],
  image: ['admin', 'member', 'viewer'],
  spacer: ['admin', 'member', 'viewer'],
  twitch: ['admin', 'member', 'viewer'],
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

    return integrations.map((i: typeof integrations[number]) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      config: decryptSensitiveFields(JSON.parse(i.config)),
    }));
  } catch (error) {
    console.error('Error fetching user integrations:', error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Get permissions from database
    const permissions = await getPermissions();

    // If no session, return default layout with empty integrations
    if (!session?.user) {
      return NextResponse.json({
        ...createEmptyDashboardLayout(),
        integrations: [],
        permissions,
      });
    }

    const userId = session.user.id;

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
    
    // 1. Check for user preference if no specific dashboard requested
    if (!dashboard) {
    const preference = await prisma.userDashboardPreference.findUnique({
      where: { userId },
    });
    
    if (preference?.defaultDashboardId) {
      // Try to fetch the preferred dashboard and verify access
      const preferredDashboard = await prisma.dashboard.findUnique({
        where: { id: preference.defaultDashboardId },
      });
      
      if (preferredDashboard) {
        // Check if user still has access to this dashboard
        const isOwner = preferredDashboard.userId === userId;
        const isPublicOrViewable = preferredDashboard.accessLevel === 'PUBLIC' || 
                                    preferredDashboard.accessLevel === 'VIEWABLE';
        
        // Check for explicit permission if not owner or public/viewable
        let hasExplicitPermission = false;
        if (!isOwner && !isPublicOrViewable) {
          const explicitPerm = await prisma.objectPermission.findUnique({
            where: {
              userId_objectType_objectId: {
                userId,
                objectType: 'dashboard',
                objectId: preference.defaultDashboardId,
              },
            },
          });
          hasExplicitPermission = explicitPerm?.permission === 'VIEW' || 
                                   explicitPerm?.permission === 'EDIT';
        }
        
        if (isOwner || isPublicOrViewable || hasExplicitPermission) {
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

    // Decrypt sensitive fields in widget configs
    if (dashboardData.widgets.length > 0) {
      dashboardData.widgets = dashboardData.widgets.map((widget) => {
        if (widget.config && typeof widget.config === 'object') {
          return {
            ...widget,
            config: decryptSensitiveFields(widget.config as Record<string, unknown>),
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
            const userConfig = userConfigMap.get(widget.id) as Record<string, unknown>;
            return {
              ...widget,
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
      userRole: session.user.role,
      canEditDashboard,
    });
  } catch (error) {
    console.error('Error reading config:', error);
    return NextResponse.json(
      { error: 'Failed to read configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Viewers cannot save
    if (session.user.role === 'viewer') {
      return NextResponse.json({ error: 'Viewers cannot edit dashboards' }, { status: 403 });
    }

    const userId = session.user.id;
    const parsedRequest = parseDashboardSaveRequest(await request.json());
    const dashboardData = parsedRequest.layout;

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
      await prisma.dashboard.create({
        data: {
          userId,
          name: 'Main',
          layout: serializeDashboardLayout(dashboardData),
          isDefault: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
