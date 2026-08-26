import { NextResponse } from 'next/server';
import {
  consumePasswordResetToken,
  hasUsablePasswordResetToken,
} from '@/lib/password-reset';
import {
  hashPassword,
  isValidPasswordLength,
  MIN_PASSWORD_LENGTH,
} from '@/lib/passwords';
import { parseResetPasswordRequest } from '@/lib/request-parsers';
import { ValidationError } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const { token, password } = parseResetPasswordRequest(await request.json());

    if (!isValidPasswordLength(password)) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!(await hasUsablePasswordResetToken(token))) {
      return NextResponse.json(
        { error: 'This password reset link is invalid or has expired' },
        { status: 400 }
      );
    }

    const nextPasswordHash = await hashPassword(password);
    const resetSucceeded = await consumePasswordResetToken(token, nextPasswordHash);

    if (!resetSucceeded) {
      return NextResponse.json(
        { error: 'This password reset link is invalid or has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
