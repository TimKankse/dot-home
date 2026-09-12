import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseUpdateUserRequest } from '@/lib/request-parsers';
import { updateManagedUser, UserAdministrationError } from '@/lib/user-administration';
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
        disabledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: { ...user, disabled: user.disabledAt !== null },
    });
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

    const input = parseUpdateUserRequest(await request.json());
    const user = await updateManagedUser(
      { id: session.user.id, role: session.user.role },
      id,
      input,
    );

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof UserAdministrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
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
      select: { role: true, disabledAt: true },
    });

    if (userToDelete?.role === 'admin' && userToDelete.disabledAt === null) {
      const adminCount = await prisma.user.count({
        where: { role: 'admin', disabledAt: null },
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
