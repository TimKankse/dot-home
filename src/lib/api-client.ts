import {
  APP_REQUEST_HEADER,
  APP_REQUEST_HEADER_VALUE,
  isSafeRequestMethod,
} from '@/lib/request-security';

/**
 * Fetch wrapper for requests to dotHome's own API.
 *
 * Unsafe requests carry a non-simple header. Browsers must preflight attempts
 * from another origin, while the server also rejects cross-site Fetch Metadata.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (isSafeRequestMethod(method)) return fetch(input, init);

  const headers = new Headers(
    init.headers || (input instanceof Request ? input.headers : undefined),
  );
  headers.set(APP_REQUEST_HEADER, APP_REQUEST_HEADER_VALUE);
  return fetch(input, { ...init, headers });
}
