/**
 * Page [id] API
 *
 * GET /api/pages/[id] - Get a single page
 * PUT /api/pages/[id] - Update a page
 * DELETE /api/pages/[id] - Delete a page
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canView, canEdit, type AccessLevel } from '@/utils/permissions';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single page
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const page = await prisma.page.findUnique({
      where: { id },
      include: { dashboard: { select: { userId: true, accessLevel: true } } },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check access to the page itself
    const hasViewAccess = await canView(
      {
        objectType: 'page',
        objectId: id,
        ownerId: page.dashboard.userId,
        accessLevel: page.accessLevel as AccessLevel,
      },
      session.user.id
    );

    if (!hasViewAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// PUT - Update a page
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, accessLevel, sortOrder } = body;

    const page = await prisma.page.findUnique({
      where: { id },
      include: { dashboard: { select: { userId: true, accessLevel: true } } },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check edit access to parent dashboard (page editing requires dashboard edit access)
    const hasEditAccess = await canEdit(
      {
        objectType: 'dashboard',
        objectId: page.dashboardId,
        ownerId: page.dashboard.userId,
        accessLevel: page.dashboard.accessLevel as AccessLevel,
      },
      session.user.id
    );

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedPage = await prisma.page.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(accessLevel !== undefined && { accessLevel }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({ page: updatedPage });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a page
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const page = await prisma.page.findUnique({
      where: { id },
      include: { dashboard: { select: { userId: true, accessLevel: true } } },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check edit access to parent dashboard
    const hasEditAccess = await canEdit(
      {
        objectType: 'dashboard',
        objectId: page.dashboardId,
        ownerId: page.dashboard.userId,
        accessLevel: page.dashboard.accessLevel as AccessLevel,
      },
      session.user.id
    );

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.page.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
