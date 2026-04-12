import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

// Default dashboard layout for new users
function createDefaultDashboardLayout() {
  const defaultPageId = uuidv4();
  return {
    widgets: [],
    responsiveLayouts: {},
    scrollDirection: 'vertical',
    pages: [{ id: defaultPageId }],
    defaultPageId: defaultPageId,
    settings: {
      behavior: {
        confirmEdit: false,
        autoSave: true,
        refreshInterval: 10,
        autoDetectLocation: true,
      },
      display: {
        is24Hour: true,
        temperatureUnit: 'C',
        dateFormat: 'DD/MM',
        language: 'en',
        timezone: 'auto',
        location: '',
        mobileBreakpointMaxWidth: 767,
        tabletBreakpointMaxWidth: 975,
      },
      shortcuts: {
        toggleEdit: 'Alt+E',
        openSettings: 'Alt+,',
        addItem: 'Alt+N',
        saveChanges: 'Alt+S',
        prevPage: 'Alt+ArrowLeft',
        nextPage: 'Alt+ArrowRight',
      },
    },
  };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Get permissions from database
    const permissions = await getPermissions();

    // If no session, return default layout with empty integrations
    if (!session?.user) {
      return NextResponse.json({
        ...createDefaultDashboardLayout(),
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
      const defaultLayout = createDefaultDashboardLayout();
      dashboard = await prisma.dashboard.create({
        data: {
          userId,
          name: 'Main',
          layout: JSON.stringify(defaultLayout),
          isDefault: true,
        },
      });
    }

    // Parse the dashboard layout
    const dashboardData = JSON.parse(dashboard.layout);
    dashboardData.responsiveLayouts = dashboardData.responsiveLayouts ?? dashboardData.mediumLayouts ?? {};

    // Decrypt sensitive fields in widget configs
    if (dashboardData.widgets && Array.isArray(dashboardData.widgets)) {
      dashboardData.widgets = dashboardData.widgets.map((widget: Record<string, unknown>) => {
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
        .filter((w: Record<string, unknown>) => w.syncConfig === false)
        .map((w: Record<string, unknown>) => w.id as string);

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
        dashboardData.widgets = dashboardData.widgets.map((widget: Record<string, unknown>) => {
          if (widget.syncConfig === false && userConfigMap.has(widget.id as string)) {
            const userConfig = userConfigMap.get(widget.id as string) as Record<string, unknown>;
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
    const body = await request.json();

    // Validate that we have widgets
    if (!body.widgets || !Array.isArray(body.widgets)) {
      console.error('Invalid configuration format: missing widgets array');
      return NextResponse.json(
        { error: 'Invalid configuration format' },
        { status: 400 }
      );
    }

    // Extract dashboard-specific data (not global config)
    const dashboardData = {
      widgets: body.widgets,
      responsiveLayouts: body.responsiveLayouts || {},
      pages: body.pages,
      scrollDirection: body.scrollDirection,
      defaultPageId: body.defaultPageId,
      settings: body.settings,
    };

    // Find or create dashboard
    let existingDashboard = null;

    if (body.dashboardId) {
       // Best case: we have a specific ID
       existingDashboard = await prisma.dashboard.findUnique({
         where: { id: body.dashboardId },
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
          layout: JSON.stringify(dashboardData),
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new dashboard
      await prisma.dashboard.create({
        data: {
          userId,
          name: 'Main',
          layout: JSON.stringify(dashboardData),
          isDefault: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
