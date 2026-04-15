import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getDashboardLayoutSummary,
  parseStoredDashboardLayout,
} from '@/lib/dashboard-layout';
import { parseUpdateDashboardRequest } from '@/lib/request-parsers';
import { ValidationError, tryParseJsonString } from '@/lib/validation';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/dashboards/[id] - Get single dashboard
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const layout = parseStoredDashboardLayout(tryParseJsonString(dashboard.layout, {}));

    return NextResponse.json({
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        isDefault: dashboard.isDefault,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
        ...getDashboardLayoutSummary(layout),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

// PUT /api/dashboards/[id] - Update dashboard (name, isDefault)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Viewers cannot edit dashboards' },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const body = parseUpdateDashboardRequest(await request.json());

    // Check dashboard exists and belongs to user
    const existing = await prisma.dashboard.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // If setting as default, unset other dashboards
    if (body.isDefault === true) {
      await prisma.dashboard.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Update dashboard
    const updated = await prisma.dashboard.update({
      where: { id },
        data: {
        name: body.name ?? existing.name,
        isDefault: body.isDefault ?? existing.isDefault,
        accessLevel: body.accessLevel ?? existing.accessLevel,
        updatedAt: new Date(),
      },
    });

    const layout = parseStoredDashboardLayout(tryParseJsonString(updated.layout, {}));

    return NextResponse.json({
      dashboard: {
        id: updated.id,
        name: updated.name,
        isDefault: updated.isDefault,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        ...getDashboardLayoutSummary(layout),
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error updating dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

// DELETE /api/dashboards/[id] - Delete dashboard
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Viewers cannot delete dashboards' },
        { status: 403 }
      );
    }

    const userId = session.user.id;

    // Check dashboard exists and belongs to user
    const existing = await prisma.dashboard.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Count user's dashboards
    const count = await prisma.dashboard.count({
      where: { userId },
    });

    // Prevent deleting the last dashboard
    if (count <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last dashboard' },
        { status: 400 }
      );
    }

    // Prevent deleting the default dashboard
    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete the default dashboard. Set another dashboard as default first.' },
        { status: 400 }
      );
    }

    await prisma.dashboard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}
