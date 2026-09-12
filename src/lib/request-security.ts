export type RequestPathKind =
  | 'static'
  | 'next-auth'
  | 'public-page'
  | 'public-api'
  | 'protected';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const APP_REQUEST_HEADER = 'X-DotHome-Request';
export const APP_REQUEST_HEADER_VALUE = '1';
const STATIC_EXACT_PATHS = new Set([
  '/favicon.ico',
  '/dotHome-icon.png',
]);
const PUBLIC_PAGE_PATHS = new Set([
  '/login',
  '/setup',
  '/reset-password',
]);
const PUBLIC_API_PATHS = new Set([
  '/api/setup',
  '/api/setup/check',
  '/api/auth/reset-password',
]);
const NEXT_AUTH_EXACT_PATHS = new Set([
  '/api/auth/providers',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/error',
  '/api/auth/verify-request',
]);
const NEXT_AUTH_PREFIXES = [
  '/api/auth/callback/',
  '/api/auth/signin/',
  '/api/auth/signout/',
];

const hasPathPrefix = (pathname: string, prefix: string): boolean =>
  pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);

export const isSafeRequestMethod = (method: string): boolean =>
  SAFE_METHODS.has(method.toUpperCase());

export function classifyRequestPath(
  pathname: string,
  method = 'GET',
): RequestPathKind {
  const normalizedMethod = method.toUpperCase();
  if (
    isSafeRequestMethod(normalizedMethod) &&
    (
      STATIC_EXACT_PATHS.has(pathname) ||
      hasPathPrefix(pathname, '/_next/static/') ||
      pathname === '/_next/image'
    )
  ) {
    return 'static';
  }

  if (
    NEXT_AUTH_EXACT_PATHS.has(pathname) ||
    NEXT_AUTH_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix))
  ) {
    return 'next-auth';
  }
  if (PUBLIC_PAGE_PATHS.has(pathname)) return 'public-page';
  if (PUBLIC_API_PATHS.has(pathname)) return 'public-api';
  return 'protected';
}

export type MutationRequestResult =
  | { allowed: true }
  | {
      allowed: false;
      code: 'cross_site_request' | 'missing_request_header';
      status: 403;
    };

export function validateAppMutationRequest(request: Request): MutationRequestResult {
  if (isSafeRequestMethod(request.method)) return { allowed: true };

  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') {
    return { allowed: false, code: 'cross_site_request', status: 403 };
  }

  if (request.headers.get(APP_REQUEST_HEADER) !== APP_REQUEST_HEADER_VALUE) {
    return { allowed: false, code: 'missing_request_header', status: 403 };
  }
  return { allowed: true };
}
