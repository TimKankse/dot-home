import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canView } from '@/utils/permissions';
import { type AccessLevel } from '@/utils/permissions';

export const dynamic = 'force-dynamic';

// GET /api/users/preferences - Get current user's dashboard preference
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const preference = await prisma.userDashboardPreference.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      defaultDashboardId: preference?.defaultDashboardId || null,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/users/preferences - Update user's dashboard preference
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { defaultDashboardId } = body;

    // Validate that the dashboard exists and user has access
    if (defaultDashboardId) {
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: defaultDashboardId },
      });

      if (!dashboard) {
        return NextResponse.json(
          { error: 'Dashboard not found' },
          { status: 404 }
        );
      }

      // Check access using permissions utility
      const hasAccess = await canView(
        {
          objectType: 'dashboard',
          objectId: dashboard.id,
          ownerId: dashboard.userId,
          accessLevel: dashboard.accessLevel as AccessLevel,
        },
        userId
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this dashboard' },
          { status: 403 }
        );
      }
    }

    // Upsert user preference
    const preference = await prisma.userDashboardPreference.upsert({
      where: { userId },
      update: {
        defaultDashboardId,
        updatedAt: new Date(),
      },
      create: {
        userId,
        defaultDashboardId,
      },
    });

    return NextResponse.json({
      defaultDashboardId: preference.defaultDashboardId,
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
