import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  buildPasswordResetUrl,
  checkPasswordResetRateLimit,
  getAdminContactEmail,
  hasAutomatedPasswordResetDelivery,
  issuePasswordResetToken,
  sendPasswordResetNotification,
} from '@/lib/password-reset';
import { parseForgotPasswordRequest } from '@/lib/request-parsers';
import { ValidationError } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const { email } = parseForgotPasswordRequest(await request.json());
    const rateLimit = await checkPasswordResetRateLimit(request, email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const automatedDeliveryEnabled = hasAutomatedPasswordResetDelivery();
    const adminContactEmail = getAdminContactEmail();

    const user = automatedDeliveryEnabled
      ? await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        })
      : null;

    if (user) {
      try {
        const { token, expiresAt } = await issuePasswordResetToken(user.id);
        await sendPasswordResetNotification({
          initiatedBy: 'self-service',
          user,
          resetUrl: buildPasswordResetUrl(token, request),
          expiresAt,
        });
      } catch (error) {
        console.error('Automated password reset delivery failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      delivery: automatedDeliveryEnabled ? 'automated' : 'admin',
      adminContactEmail,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error processing forgot password request:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
