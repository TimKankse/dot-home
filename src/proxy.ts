import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import {
  classifyRequestPath,
  validateAppMutationRequest,
} from '@/lib/request-security';
import { isSessionTokenCurrent } from '@/lib/session-revocation';

const AUTH_PAGES = new Set(['/login']);

const clearSessionCookies = (response: NextResponse): NextResponse => {
  response.cookies.delete('next-auth.session-token');
  response.cookies.delete('__Secure-next-auth.session-token');
  return response;
};

const unauthorizedResponse = (request: NextRequest, message?: string) => {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized', code: message || 'unauthorized' },
      { status: 401 },
    );
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set(
    'callbackUrl',
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  if (message) loginUrl.searchParams.set('message', message);
  return NextResponse.redirect(loginUrl);
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathKind = classifyRequestPath(pathname, request.method);

  if (pathKind === 'static') return NextResponse.next();

  // NextAuth maintains its own CSRF protocol. All other unsafe application
  // requests, including public setup/reset endpoints, use the first-party gate.
  if (pathKind !== 'next-auth') {
    const requestResult = validateAppMutationRequest(request);
    if (!requestResult.allowed) {
      return NextResponse.json(
        { error: 'Request rejected', code: requestResult.code },
        { status: requestResult.status },
      );
    }
  }

  const isPublic = pathKind === 'public-page' || pathKind === 'public-api' || pathKind === 'next-auth';
  const isAuthPage = AUTH_PAGES.has(pathname);
  if (isPublic && !isAuthPage) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token && !(await isSessionTokenCurrent(token))) {
    const response = isAuthPage
      ? NextResponse.next()
      : unauthorizedResponse(request, 'session-expired');
    return clearSessionCookies(response);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (isPublic) return NextResponse.next();
  if (!token) return unauthorizedResponse(request);
  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};
