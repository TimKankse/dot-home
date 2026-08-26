import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  buildPasswordResetUrl,
  issuePasswordResetToken,
  sendPasswordResetNotification,
} from '@/lib/password-reset';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { token, expiresAt } = await issuePasswordResetToken(user.id);
    const resetUrl = buildPasswordResetUrl(token, request);

    try {
      const delivered = await sendPasswordResetNotification({
        initiatedBy: 'admin',
        user,
        resetUrl,
        expiresAt,
      });

      if (delivered) {
        return NextResponse.json({
          success: true,
          delivery: 'automated',
          expiresAt: expiresAt.toISOString(),
        });
      }
    } catch (error) {
      console.error('Admin password reset delivery failed:', error);
    }

    return NextResponse.json({
      success: true,
      delivery: 'manual',
      resetUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating admin password reset:', error);
    return NextResponse.json(
      { error: 'Failed to create password reset' },
      { status: 500 }
    );
  }
}
