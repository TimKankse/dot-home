import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateAppMutationRequest } from '@/lib/request-security';
import { ValidationError } from '@/lib/validation';
import { takeValidatedSessionUser } from '@/lib/validated-session';

export type ApiUser = {
  id: string;
  role: string;
};

export class ApiSecurityError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiSecurityError';
  }
}

export function assertSafeAppMutation(request: Request): void {
  const result = validateAppMutationRequest(request);
  if (!result.allowed) {
    throw new ApiSecurityError(
      'Request rejected',
      result.status,
      result.code,
    );
  }
}

export async function requireApiUser(request?: Request): Promise<ApiUser> {
  if (request) assertSafeAppMutation(request);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new ApiSecurityError('Unauthorized', 401, 'unauthorized');
  }

  const validatedUser = takeValidatedSessionUser(session);
  if (validatedUser) return validatedUser;

  // Fail safely if a session provider doesn't preserve the callback object.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, disabledAt: true },
  });

  if (!user || user.disabledAt) {
    throw new ApiSecurityError('Unauthorized', 401, 'session_revoked');
  }

  return { id: user.id, role: user.role };
}

export function apiSecurityErrorResponse(
  error: unknown,
  fallbackMessage = 'Internal server error',
): NextResponse {
  if (error instanceof ApiSecurityError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, code: 'invalid_request' },
      { status: 400 },
    );
  }

  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
