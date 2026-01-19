/**
 * Permissions API
 *
 * GET /api/permissions?objectType=dashboard&objectId=xxx - List user overrides
 * POST /api/permissions - Create/update a user override
 * DELETE /api/permissions - Remove a user override
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  canEdit,
  getObjectPermissions,
  setObjectPermission,
  removeObjectPermission,
  type ObjectType,
  type PermissionType,
} from '@/utils/permissions';

export const dynamic = 'force-dynamic';

// Helper to get owner ID for an object
async function getObjectOwnerId(
  objectType: ObjectType,
  objectId: string
): Promise<string | null> {
  switch (objectType) {
    case 'dashboard': {
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: objectId },
        select: { userId: true },
      });
      return dashboard?.userId ?? null;
    }
    case 'page': {
      const page = await prisma.page.findUnique({
        where: { id: objectId },
        include: { dashboard: { select: { userId: true } } },
      });
      return page?.dashboard.userId ?? null;
    }
    case 'integration': {
      const integration = await prisma.integration.findUnique({
        where: { id: objectId },
        select: { userId: true },
      });
      return integration?.userId ?? null;
    }
    default:
      return null;
  }
}

// Helper to get object access level
async function getObjectAccessLevel(
  objectType: ObjectType,
  objectId: string
): Promise<string | null> {
  switch (objectType) {
    case 'dashboard': {
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: objectId },
        select: { accessLevel: true },
      });
      return dashboard?.accessLevel ?? null;
    }
    case 'page': {
      const page = await prisma.page.findUnique({
        where: { id: objectId },
        select: { accessLevel: true },
      });
      return page?.accessLevel ?? null;
    }
    case 'integration': {
      const integration = await prisma.integration.findUnique({
        where: { id: objectId },
        select: { accessLevel: true },
      });
      return integration?.accessLevel ?? null;
    }
    default:
      return null;
  }
}

// GET - List user overrides for an object
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const objectType = searchParams.get('objectType') as ObjectType;
    const objectId = searchParams.get('objectId');

    if (!objectType || !objectId) {
      return NextResponse.json(
        { error: 'objectType and objectId are required' },
        { status: 400 }
      );
    }

    // Check if user can edit this object (only editors can see permission overrides)
    const ownerId = await getObjectOwnerId(objectType, objectId);
    const accessLevel = await getObjectAccessLevel(objectType, objectId);

    if (!ownerId || !accessLevel) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    const hasEditAccess = await canEdit(
      { objectType, objectId, ownerId, accessLevel: accessLevel as 'PUBLIC' | 'VIEWABLE' | 'PRIVATE' },
      session.user.id
    );

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const permissions = await getObjectPermissions(objectType, objectId);

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// POST - Create/update a user override
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { objectType, objectId, userId, permission } = body;

    if (!objectType || !objectId || !userId || !permission) {
      return NextResponse.json(
        { error: 'objectType, objectId, userId, and permission are required' },
        { status: 400 }
      );
    }

    // Validate permission value
    if (!['BLOCKED', 'VIEW', 'EDIT'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission value' },
        { status: 400 }
      );
    }

    // Check if user can edit this object
    const ownerId = await getObjectOwnerId(objectType, objectId);
    const accessLevel = await getObjectAccessLevel(objectType, objectId);

    if (!ownerId || !accessLevel) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    const hasEditAccess = await canEdit(
      { objectType, objectId, ownerId, accessLevel: accessLevel as 'PUBLIC' | 'VIEWABLE' | 'PRIVATE' },
      session.user.id
    );

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent setting permissions on yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot set permissions on yourself' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await setObjectPermission(
      objectType as ObjectType,
      objectId,
      userId,
      permission as PermissionType
    );

    return NextResponse.json({ permission: result });
  } catch (error) {
    console.error('Error setting permission:', error);
    return NextResponse.json(
      { error: 'Failed to set permission' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a user override
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const objectType = searchParams.get('objectType') as ObjectType;
    const objectId = searchParams.get('objectId');
    const userId = searchParams.get('userId');

    if (!objectType || !objectId || !userId) {
      return NextResponse.json(
        { error: 'objectType, objectId, and userId are required' },
        { status: 400 }
      );
    }

    // Check if user can edit this object
    const ownerId = await getObjectOwnerId(objectType, objectId);
    const accessLevel = await getObjectAccessLevel(objectType, objectId);

    if (!ownerId || !accessLevel) {
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    const hasEditAccess = await canEdit(
      { objectType, objectId, ownerId, accessLevel: accessLevel as 'PUBLIC' | 'VIEWABLE' | 'PRIVATE' },
      session.user.id
    );

    if (!hasEditAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await removeObjectPermission(objectType as ObjectType, objectId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing permission:', error);
    return NextResponse.json(
      { error: 'Failed to remove permission' },
      { status: 500 }
    );
  }
}
