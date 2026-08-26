import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import {
  buildIntegrationUrl,
  requireIntegrationConfigString,
  resolveIntegrationBaseUrl,
  resolveRequestIntegration,
} from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';

const REQUEST_ACTIONS = new Set(['approve', 'decline']);

const jellyseerrHeaders = (apiKey: string) => ({
  'X-Api-Key': apiKey,
  'Content-Type': 'application/json',
});

export async function GET(request: Request) {
  try {
    const integration = await resolveRequestIntegration(request, 'jellyseerr');
    const baseUrl = await resolveIntegrationBaseUrl(integration);
    const apiKey = requireIntegrationConfigString(integration, 'apiKey');
    const targetUrl = buildIntegrationUrl(baseUrl, '/api/v1/request');
    targetUrl.searchParams.set('take', '25');
    targetUrl.searchParams.set('filter', 'all');
    targetUrl.searchParams.set('sort', 'added');

    const response = await fetchOutbound(
      targetUrl,
      { headers: jellyseerrHeaders(apiKey), cache: 'no-store' },
      { policy: 'trusted-integration' },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: `Jellyseerr API error (${response.status})` },
        { status: response.status },
      );
    }
    return NextResponse.json(await response.json());
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch Jellyseerr requests');
  }
}

export async function POST(request: Request) {
  try {
    const integration = await resolveRequestIntegration(request, 'jellyseerr', 'edit');
    const baseUrl = await resolveIntegrationBaseUrl(integration);
    const apiKey = requireIntegrationConfigString(integration, 'apiKey');
    const body = await request.json() as { requestId?: unknown; action?: unknown };
    const requestId = typeof body.requestId === 'number' ? body.requestId : Number.NaN;
    const action = typeof body.action === 'string' ? body.action : '';

    if (!Number.isSafeInteger(requestId) || requestId <= 0 || !REQUEST_ACTIONS.has(action)) {
      throw new ApiSecurityError('Invalid request action', 400, 'invalid_request_action');
    }

    const targetUrl = buildIntegrationUrl(
      baseUrl,
      `/api/v1/request/${requestId}/${action}`,
    );
    const response = await fetchOutbound(
      targetUrl,
      {
        method: 'POST',
        headers: jellyseerrHeaders(apiKey),
        cache: 'no-store',
      },
      { policy: 'trusted-integration' },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: `Jellyseerr API error (${response.status})` },
        { status: response.status },
      );
    }

    const text = await response.text();
    return text
      ? new NextResponse(text, {
          status: response.status,
          headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
        })
      : NextResponse.json({ success: true });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to manage Jellyseerr request');
  }
}
