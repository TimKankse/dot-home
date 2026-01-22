import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  batchResolvePermissions,
  type AccessLevel,
  type EffectivePermission,
} from '@/utils/permissions';

export const dynamic = 'force-dynamic';

interface DashboardWithStats {
  id: string;
  name: string;
  isDefault: boolean;
  isUserDefault: boolean;
  accessLevel: string;
  ownerId: string;
  ownerName: string | null;
  permission: EffectivePermission;
  isOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
  pageCount: number;
  widgetCount: number;
}

// Default dashboard layout for new dashboards
function createDefaultDashboardLayout() {
  const defaultPageId = uuidv4();
  return {
    widgets: [],
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

// GET /api/dashboards - List all accessible dashboards for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's dashboard preference to determine isUserDefault
    const userPreference = await prisma.userDashboardPreference.findUnique({
      where: { userId },
    });

    // First, get dashboard IDs where user has explicit VIEW or EDIT permission
    let permittedDashboardIds: string[] = [];
    try {
      const userPermissions = await prisma.objectPermission.findMany({
        where: {
          userId,
          objectType: 'dashboard',
          permission: { in: ['VIEW', 'EDIT'] },
        },
        select: { objectId: true },
      });
      permittedDashboardIds = userPermissions.map((p: typeof userPermissions[number]) => p.objectId);
    } catch (permError) {
      // ObjectPermission table might not exist yet, continue without it
      console.warn('Could not fetch user permissions, continuing:', permError);
    }

    // Build OR conditions - only include explicit permission check if there are any
    const orConditions: object[] = [
      { userId }, // Owned by user
      { accessLevel: { in: ['PUBLIC', 'VIEWABLE'] } }, // Accessible to all
    ];
    
    if (permittedDashboardIds.length > 0) {
      orConditions.push({ id: { in: permittedDashboardIds } });
    }

    // Get all accessible dashboards
    const dashboards = await prisma.dashboard.findMany({
      where: { OR: orConditions },
      include: {
        user: {
          select: { displayName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Batch resolve permissions (with fallback if it fails)
    let permissionMap: Map<string, EffectivePermission>;
    try {
      permissionMap = await batchResolvePermissions(
        'dashboard',
        dashboards.map((d: typeof dashboards[number]) => ({
          id: d.id,
          ownerId: d.userId,
          accessLevel: d.accessLevel as AccessLevel,
        })),
        userId
      );
    } catch (batchError) {
      console.warn('Could not batch resolve permissions, using fallback:', batchError);
      // Fallback: owner gets edit, others depend on accessLevel
      permissionMap = new Map();
      for (const d of dashboards) {
        if (d.userId === userId) {
          permissionMap.set(d.id, 'edit');
        } else if (d.accessLevel === 'PUBLIC') {
          permissionMap.set(d.id, 'edit');
        } else if (d.accessLevel === 'VIEWABLE') {
          permissionMap.set(d.id, 'view');
        } else {
          permissionMap.set(d.id, 'none');
        }
      }
    }

    // Filter out dashboards where user has 'none' permission (blocked)
    const accessibleDashboards = dashboards.filter(
      (d: typeof dashboards[number]) => permissionMap.get(d.id) !== 'none'
    );

    // Parse layouts and compute stats
    const dashboardsWithStats: DashboardWithStats[] = accessibleDashboards.map(
      (d: typeof accessibleDashboards[number]) => {
        const layout = JSON.parse(d.layout);
        const isOwner = d.userId === userId;
        // Determine if this is the user's default
        // If user has explicit preference, use that
        // Otherwise, fall back to owner's isDefault flag for their own dashboards
        const isUserDefault = userPreference?.defaultDashboardId
          ? d.id === userPreference.defaultDashboardId
          : isOwner && d.isDefault;
        
        return {
          id: d.id,
          name: d.name,
          isDefault: d.isDefault,
          isUserDefault,
          accessLevel: d.accessLevel,
          ownerId: d.userId,
          ownerName: d.user.displayName,
          permission: permissionMap.get(d.id) || 'none',
          isOwner,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          pageCount: layout.pages?.length || 0,
          widgetCount: layout.widgets?.length || 0,
        };
      }
    );

    return NextResponse.json({ dashboards: dashboardsWithStats });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/dashboards - Create a new dashboard
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Viewers cannot create dashboards' },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const name = body.name || 'New Dashboard';

    const defaultLayout = createDefaultDashboardLayout();

    const dashboard = await prisma.dashboard.create({
      data: {
        userId,
        name,
        layout: JSON.stringify(defaultLayout),
        isDefault: false, // New dashboards are not default
      },
    });

    const layout = JSON.parse(dashboard.layout);

    return NextResponse.json({
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        isDefault: dashboard.isDefault,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
        pageCount: layout.pages?.length || 0,
        widgetCount: layout.widgets?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}
