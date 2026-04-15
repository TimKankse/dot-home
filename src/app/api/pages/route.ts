/**
 * Pages API
 *
 * GET /api/pages?dashboardId=xxx - List pages for a dashboard
 * POST /api/pages - Create a new page
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseCreatePageRequest } from '@/lib/request-parsers';
import { ValidationError } from '@/lib/validation';
import { canView, canEdit, type AccessLevel } from '@/utils/permissions';

export const dynamic = 'force-dynamic';

// GET - List pages for a dashboard
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('dashboardId');

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'dashboardId is required' },
        { status: 400 }
      );
    }

    // Get dashboard to check access
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      select: { userId: true, accessLevel: true },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Check if user can view this dashboard
    const hasViewAccess = await canView(
      {
        objectType: 'dashboard',
        objectId: dashboardId,
        ownerId: dashboard.userId,
        accessLevel: dashboard.accessLevel as AccessLevel,
      },
      session.user.id
    );

    if (!hasViewAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pages = await prisma.page.findMany({
      where: { dashboardId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST - Create a new page
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dashboardId, name, accessLevel } = parseCreatePageRequest(
      await request.json(),
    );

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'dashboardId is required' },
        { status: 400 }
      );
    }

    // Get dashboard to check access
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      select: { userId: true, accessLevel: true },
    });

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    // Check if user can edit this dashboard
    const hasEditAccess = await canEdit(
      {
        objectType: 'dashboard',
        objectId: dashboardId,
        ownerId: dashboard.userId,
        accessLevel: dashboard.accessLevel as AccessLevel,
      },
      session.user.id
    );

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get max sort order for this dashboard
    const maxSortOrder = await prisma.page.aggregate({
      where: { dashboardId },
      _max: { sortOrder: true },
    });

    const page = await prisma.page.create({
      data: {
        dashboardId,
        name,
        accessLevel,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ page });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}
