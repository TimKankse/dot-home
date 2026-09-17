import { lookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import { createBrotliDecompress, createUnzip } from 'node:zlib';

import { ApiSecurityError } from '@/lib/api-security';
import { isNonPublicIpAddress } from './ip-address';

export { isNonPublicIpAddress } from './ip-address';

export type OutboundUrlPolicy = 'trusted-integration' | 'public-internet';

type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

type DnsLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string; family: number }>>;

type ValidateOutboundUrlOptions = {
  dnsLookup?: DnsLookup;
};

export type OutboundFetchOptions = {
  policy: OutboundUrlPolicy;
  maxResponseBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  allowCrossOriginRedirects?: boolean;
  dnsLookup?: DnsLookup;
  transport?: OutboundTransport;
};

export type ResolvedOutboundTarget = {
  url: URL;
  addresses: ResolvedAddress[];
};

export type OutboundTransport = (
  target: ResolvedOutboundTarget,
  init: RequestInit,
) => Promise<Response>;

const parseOutboundUrl = (value: string | URL): URL => {
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value) : new URL(value);
  } catch {
    throw new ApiSecurityError('Invalid outbound URL', 400, 'invalid_outbound_url');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ApiSecurityError('Invalid outbound URL', 400, 'invalid_outbound_url');
  }

  return url;
};

export const resolveOutboundTarget = async (
  value: string | URL,
  policy: OutboundUrlPolicy,
  dnsLookup: DnsLookup = lookup as DnsLookup,
): Promise<ResolvedOutboundTarget> => {
  const url = parseOutboundUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();

  if (
    policy === 'public-internet' &&
    (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local'))
  ) {
    throw new ApiSecurityError('Private network URLs are not allowed', 400, 'private_network_url');
  }

  const ipFamily = isIP(hostname);
  let addresses: ResolvedAddress[];

  if (ipFamily) {
    addresses = [{ address: hostname, family: ipFamily as 4 | 6 }];
  } else {
    try {
      const resolved = await dnsLookup(hostname, { all: true, verbatim: true });
      addresses = resolved
        .filter((entry): entry is ResolvedAddress => entry.family === 4 || entry.family === 6)
        .map(({ address, family }) => ({ address, family }));
    } catch {
      throw new ApiSecurityError('Outbound host could not be resolved', 400, 'unresolvable_outbound_host');
    }
  }

  if (addresses.length === 0) {
    throw new ApiSecurityError('Outbound host could not be resolved', 400, 'unresolvable_outbound_host');
  }

  if (policy === 'public-internet' && addresses.some(({ address }) => isNonPublicIpAddress(address))) {
    throw new ApiSecurityError('Private network URLs are not allowed', 400, 'private_network_url');
  }

  return { url, addresses };
};

export async function validateOutboundUrl(
  value: string | URL,
  policy: OutboundUrlPolicy,
  { dnsLookup = lookup as DnsLookup }: ValidateOutboundUrlOptions = {},
): Promise<URL> {
  return (await resolveOutboundTarget(value, policy, dnsLookup)).url;
}

const responseHeaders = (headers: IncomingHttpHeaders): Headers => {
  const result = new Headers();

  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => result.append(name, entry));
    } else if (value !== undefined) {
      result.append(name, String(value));
    }
  }

  return result;
};

export const decodedResponseBody = (
  upstreamResponse: Readable,
  headers: Headers,
): Readable => {
  const contentEncoding = headers.get('content-encoding')?.trim().toLowerCase();
  let body = upstreamResponse;

  if (contentEncoding === 'gzip' || contentEncoding === 'x-gzip' || contentEncoding === 'deflate') {
    body = upstreamResponse.pipe(createUnzip());
  } else if (contentEncoding === 'br') {
    body = upstreamResponse.pipe(createBrotliDecompress());
  } else {
    return body;
  }

  upstreamResponse.once('error', (error) => body.destroy(error));
  body.once('close', () => upstreamResponse.destroy());

  // The returned Response contains decoded bytes, so encoded-body metadata is
  // no longer accurate. This mirrors the body callers receive from fetch().
  headers.delete('content-encoding');
  headers.delete('content-length');
  return body;
};

const pinnedRequest = async (
  target: ResolvedOutboundTarget,
  init: RequestInit,
): Promise<Response> => {
  const normalizedRequest = new Request(target.url, {
    ...init,
    signal: undefined,
  });
  const requestBody = normalizedRequest.body
    ? Buffer.from(await normalizedRequest.arrayBuffer())
    : undefined;
  const headers = Object.fromEntries(normalizedRequest.headers.entries());

  if (!normalizedRequest.headers.has('accept-encoding')) {
    headers['accept-encoding'] = 'gzip, deflate, br';
  }

  if (requestBody && !normalizedRequest.headers.has('content-length')) {
    headers['content-length'] = String(requestBody.byteLength);
  }

  const lookupPinnedAddress = (
    _hostname: string,
    options: number | { family?: number | 'IPv4' | 'IPv6'; all?: boolean },
    callback: (
      error: NodeJS.ErrnoException | null,
      address: string | ResolvedAddress[],
      family?: number,
    ) => void,
  ) => {
    const requestedFamily = typeof options === 'number'
      ? options
      : options.family === 'IPv4'
        ? 4
        : options.family === 'IPv6'
          ? 6
          : options.family;
    const eligible = requestedFamily === 4 || requestedFamily === 6
      ? target.addresses.filter(({ family }) => family === requestedFamily)
      : target.addresses;

    if (eligible.length === 0) {
      const error = new Error('No vetted address matches the requested IP family') as NodeJS.ErrnoException;
      error.code = 'ENOTFOUND';
      callback(error, '');
      return;
    }

    if (typeof options === 'object' && options.all) {
      callback(null, eligible);
      return;
    }

    callback(null, eligible[0].address, eligible[0].family);
  };

  return new Promise<Response>((resolve, reject) => {
    const request = (target.url.protocol === 'https:' ? httpsRequest : httpRequest)(target.url, {
      method: normalizedRequest.method,
      headers,
      lookup: lookupPinnedAddress,
      signal: init.signal ?? undefined,
    }, (upstreamResponse) => {
      try {
        const headers = responseHeaders(upstreamResponse.headers);
        const status = upstreamResponse.statusCode ?? 502;
        const hasBody = normalizedRequest.method !== 'HEAD' && ![204, 205, 304].includes(status);
        const body = hasBody
          ? Readable.toWeb(decodedResponseBody(upstreamResponse, headers)) as ReadableStream<Uint8Array>
          : null;
        if (!hasBody) upstreamResponse.resume();
        resolve(new Response(body, { status, statusText: upstreamResponse.statusMessage, headers }));
      } catch (error) {
        upstreamResponse.destroy();
        reject(error);
      }
    });

    request.once('error', reject);
    if (requestBody) request.write(requestBody);
    request.end();
  });
};

export async function fetchOutbound(
  value: string | URL,
  init: RequestInit = {},
  {
    policy,
    maxResponseBytes = 8 * 1024 * 1024,
    timeoutMs = 10_000,
    maxRedirects = 3,
    allowCrossOriginRedirects = false,
    dnsLookup = lookup as DnsLookup,
    transport = pinnedRequest,
  }: OutboundFetchOptions,
): Promise<Response> {
  let currentTarget = await resolveOutboundTarget(value, policy, dnsLookup);
  let currentInit = { ...init };

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = currentInit.signal
      ? AbortSignal.any([currentInit.signal, timeoutSignal])
      : timeoutSignal;
    const response = await transport(currentTarget, {
      ...currentInit,
      signal,
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return limitResponseBody(response, maxResponseBytes);
    }

    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location || redirectCount === maxRedirects) {
      throw new ApiSecurityError('Too many outbound redirects', 502, 'outbound_redirect_error');
    }

    const nextUrl = parseOutboundUrl(new URL(location, currentTarget.url));
    if (!allowCrossOriginRedirects && nextUrl.origin !== currentTarget.url.origin) {
      throw new ApiSecurityError('Cross-origin redirects are not allowed', 502, 'outbound_redirect_error');
    }
    const nextTarget = await resolveOutboundTarget(nextUrl, policy, dnsLookup);

    const method = currentInit.method?.toUpperCase() || 'GET';
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST')) {
      const headers = new Headers(currentInit.headers);
      headers.delete('content-type');
      headers.delete('content-length');
      currentInit = {
        ...currentInit,
        method: 'GET',
        body: undefined,
        headers,
      };
    }
    currentTarget = nextTarget;
  }

  throw new ApiSecurityError('Too many outbound redirects', 502, 'outbound_redirect_error');
}

// Count decoded bytes, so compression cannot bypass the limit. A streaming
// transform preserves backpressure and cancels the upstream on overflow.
export function limitResponseBody(response: Response, maxBytes: number): Response {
  if (!response.body) return response;
  let bytes = 0;
  const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > maxBytes) {
        throw new ApiSecurityError('Upstream response is too large', 502, 'upstream_response_too_large');
      }
      controller.enqueue(chunk);
    },
  }));
  return new Response(body, {
    status: response.status, statusText: response.statusText, headers: response.headers,
  });
}
