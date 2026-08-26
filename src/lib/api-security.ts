import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

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

export async function requireApiUser(): Promise<ApiUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new ApiSecurityError('Unauthorized', 401, 'unauthorized');
  }

  return {
    id: session.user.id,
    role: session.user.role,
  };
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

  console.error(fallbackMessage, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
