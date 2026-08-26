import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { clearPasswordResetTokensForUser } from '@/lib/password-reset';
import { normalizeEmail } from '@/lib/passwords';
import { parseUpdateUserRequest } from '@/lib/request-parsers';
import { ValidationError } from '@/lib/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get a specific user (admin or self)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can view their own profile, admins can view anyone
    if (session.user.role !== 'admin' && session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update a user (admin only, or self for display name only)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSelf = session.user.id === id;
    const isAdmin = session.user.role === 'admin';

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { displayName, email, role } = parseUpdateUserRequest(await request.json());

    interface UserUpdateData {
      displayName?: string | null;
      email?: string;
      role?: string;
    }
    
    const updateData: UserUpdateData = {};

    // Anyone can update their own display name
    if (displayName !== undefined) {
      updateData.displayName = displayName || null;
    }

    // Email updates are admin-assisted only.
    if (email !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Only admins can change email addresses' },
          { status: 403 }
        );
      }

      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }

      updateData.email = normalizedEmail;
    }

    // Only admins can change roles
    if (role !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Only admins can change roles' },
          { status: 403 }
        );
      }

      if (!['admin', 'member', 'viewer'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }

      // Prevent removing the last admin
      if (isSelf && role !== 'admin') {
        const adminCount = await prisma.user.count({
          where: { role: 'admin' },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last admin' },
            { status: 400 }
          );
        }
      }

      updateData.role = role;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        updatedAt: true,
      },
    });

    if (updateData.email) {
      await clearPasswordResetTokensForUser(id);
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete a user (admin only)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if this would remove the last admin
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (userToDelete?.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin' },
          { status: 400 }
        );
      }
    }

    // Delete user (dashboards cascade delete)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
