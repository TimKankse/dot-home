import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  hashPassword,
  isValidPasswordLength,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from '@/lib/passwords';
import { parseChangePasswordRequest } from '@/lib/request-parsers';
import { updatePasswordAndRevokeSessions } from '@/lib/session-revocation';
import { ValidationError } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = parseChangePasswordRequest(
      await request.json(),
    );

    if (!isValidPasswordLength(newPassword)) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const nextPasswordHash = await hashPassword(newPassword);

    await updatePasswordAndRevokeSessions(user.id, nextPasswordHash);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
