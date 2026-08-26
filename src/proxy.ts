import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isSessionTokenCurrent } from '@/lib/session-revocation';

const publicRoutes = ['/login', '/setup', '/forgot-password', '/reset-password', '/api/auth', '/api/setup'];

const authRoutes = ['/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions (favicon, etc)
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (token && !(await isSessionTokenCurrent(token))) {
    const response = isAuthRoute
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login?message=session-expired', request.url));

    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    return response;
  }

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
