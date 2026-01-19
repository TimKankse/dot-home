/**
 * Permission Resolution Utility
 *
 * Resolves effective permissions for objects (dashboards, pages, integrations)
 * based on:
 * 1. User-specific overrides (highest priority)
 * 2. Ownership (owner always has edit access)
 * 3. Object's access level (PUBLIC/VIEWABLE/PRIVATE)
 */

import { prisma } from '@/lib/db';

// Type definitions
export type AccessLevel = 'PUBLIC' | 'VIEWABLE' | 'PRIVATE';
export type PermissionType = 'BLOCKED' | 'VIEW' | 'EDIT';
export type EffectivePermission = 'none' | 'view' | 'edit';
export type ObjectType = 'dashboard' | 'page' | 'integration';

export interface PermissionContext {
  objectType: ObjectType;
  objectId: string;
  ownerId: string;
  accessLevel: AccessLevel;
}

/**
 * Resolve the effective permission for a user on an object.
 *
 * Resolution order:
 * 1. Check user-specific override (BLOCKED/VIEW/EDIT)
 * 2. Check if user is owner → edit
 * 3. Check object's access level (PUBLIC/VIEWABLE/PRIVATE)
 */
export async function resolvePermission(
  context: PermissionContext,
  currentUserId: string
): Promise<EffectivePermission> {
  // 1. Check for user-specific override
  const override = await prisma.objectPermission.findUnique({
    where: {
      userId_objectType_objectId: {
        userId: currentUserId,
        objectType: context.objectType,
        objectId: context.objectId,
      },
    },
  });

  if (override) {
    switch (override.permission as PermissionType) {
      case 'BLOCKED':
        return 'none';
      case 'VIEW':
        return 'view';
      case 'EDIT':
        return 'edit';
    }
  }

  // 2. Check if user is owner
  if (context.ownerId === currentUserId) {
    return 'edit';
  }

  // 3. Fall back to object's access level
  switch (context.accessLevel) {
    case 'PUBLIC':
      return 'edit';
    case 'VIEWABLE':
      return 'view';
    case 'PRIVATE':
      return 'none';
  }
}

/**
 * Synchronous version for when you already have the override data.
 * Use this when you've pre-fetched overrides to avoid N+1 queries.
 */
export function resolvePermissionSync(
  context: PermissionContext,
  currentUserId: string,
  override?: { permission: string } | null
): EffectivePermission {
  // 1. Check user-specific override
  if (override) {
    switch (override.permission as PermissionType) {
      case 'BLOCKED':
        return 'none';
      case 'VIEW':
        return 'view';
      case 'EDIT':
        return 'edit';
    }
  }

  // 2. Check if user is owner
  if (context.ownerId === currentUserId) {
    return 'edit';
  }

  // 3. Fall back to access level
  switch (context.accessLevel) {
    case 'PUBLIC':
      return 'edit';
    case 'VIEWABLE':
      return 'view';
    case 'PRIVATE':
      return 'none';
  }
}

/**
 * Check if a user can view an object.
 */
export async function canView(
  context: PermissionContext,
  currentUserId: string
): Promise<boolean> {
  const permission = await resolvePermission(context, currentUserId);
  return permission === 'view' || permission === 'edit';
}

/**
 * Check if a user can edit an object.
 */
export async function canEdit(
  context: PermissionContext,
  currentUserId: string
): Promise<boolean> {
  const permission = await resolvePermission(context, currentUserId);
  return permission === 'edit';
}

/**
 * Get all user overrides for an object.
 */
export async function getObjectPermissions(
  objectType: ObjectType,
  objectId: string
) {
  return prisma.objectPermission.findMany({
    where: {
      objectType,
      objectId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Set a user's permission override for an object.
 */
export async function setObjectPermission(
  objectType: ObjectType,
  objectId: string,
  userId: string,
  permission: PermissionType
) {
  return prisma.objectPermission.upsert({
    where: {
      userId_objectType_objectId: {
        userId,
        objectType,
        objectId,
      },
    },
    update: {
      permission,
    },
    create: {
      userId,
      objectType,
      objectId,
      permission,
    },
  });
}

/**
 * Remove a user's permission override for an object.
 */
export async function removeObjectPermission(
  objectType: ObjectType,
  objectId: string,
  userId: string
) {
  return prisma.objectPermission.delete({
    where: {
      userId_objectType_objectId: {
        userId,
        objectType,
        objectId,
      },
    },
  });
}

/**
 * Batch resolve permissions for multiple objects of the same type.
 * More efficient than multiple individual calls.
 */
export async function batchResolvePermissions(
  objectType: ObjectType,
  objects: Array<{ id: string; ownerId: string; accessLevel: AccessLevel }>,
  currentUserId: string
): Promise<Map<string, EffectivePermission>> {
  // Fetch all overrides for these objects in one query
  const overrides = await prisma.objectPermission.findMany({
    where: {
      userId: currentUserId,
      objectType,
      objectId: { in: objects.map((o) => o.id) },
    },
  });

  const overrideMap = new Map(overrides.map((o) => [o.objectId, o]));

  const result = new Map<string, EffectivePermission>();

  for (const obj of objects) {
    const permission = resolvePermissionSync(
      {
        objectType,
        objectId: obj.id,
        ownerId: obj.ownerId,
        accessLevel: obj.accessLevel,
      },
      currentUserId,
      overrideMap.get(obj.id)
    );
    result.set(obj.id, permission);
  }

  return result;
}
