import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import {
  buildIntegrationUrl,
  requireIntegrationConfigString,
  resolveIntegrationBaseUrl,
  resolveRequestIntegration,
} from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';

const CONTAINER_ACTIONS = new Set(['start', 'stop', 'restart']);
const CONTAINER_ID_PATTERN = /^[a-zA-Z0-9_.-]{1,128}$/;
const ENDPOINT_ID_PATTERN = /^[1-9]\d{0,9}$/;

const getEndpointId = (request: Request, configured: unknown): string => {
  const requested = new URL(request.url).searchParams.get('endpointId');
  const value = requested || (typeof configured === 'string' ? configured : '') || '1';
  if (!ENDPOINT_ID_PATTERN.test(value)) {
    throw new ApiSecurityError('Invalid endpoint ID', 400, 'invalid_endpoint_id');
  }
  return value;
};

export async function GET(request: Request) {
  try {
    const integration = await resolveRequestIntegration(request, 'portainer');
    const baseUrl = await resolveIntegrationBaseUrl(integration);
    const apiKey = requireIntegrationConfigString(integration, 'apiKey');
    const endpointId = getEndpointId(request, integration.config.endpointId);
    const apiUrl = buildIntegrationUrl(
      baseUrl,
      `/api/endpoints/${endpointId}/docker/containers/json`,
    );
    apiUrl.searchParams.set('all', '1');

    const response = await fetchOutbound(
      apiUrl,
      { headers: { 'X-API-Key': apiKey }, cache: 'no-store' },
      { policy: 'trusted-integration' },
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: `Portainer API error (${response.status})` },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch Portainer containers');
  }
}

export async function POST(request: Request) {
  try {
    const integration = await resolveRequestIntegration(request, 'portainer', 'edit');
    const baseUrl = await resolveIntegrationBaseUrl(integration);
    const apiKey = requireIntegrationConfigString(integration, 'apiKey');
    const endpointId = getEndpointId(request, integration.config.endpointId);
    const body = await request.json() as { id?: unknown; action?: unknown };
    const id = typeof body.id === 'string' ? body.id : '';
    const action = typeof body.action === 'string' ? body.action : '';

    if (!CONTAINER_ID_PATTERN.test(id) || !CONTAINER_ACTIONS.has(action)) {
      throw new ApiSecurityError('Invalid container action', 400, 'invalid_container_action');
    }

    const apiUrl = buildIntegrationUrl(
      baseUrl,
      `/api/endpoints/${endpointId}/docker/containers/${encodeURIComponent(id)}/${action}`,
    );
    const response = await fetchOutbound(
      apiUrl,
      { method: 'POST', headers: { 'X-API-Key': apiKey }, cache: 'no-store' },
      { policy: 'trusted-integration' },
    );

    if (!response.ok) {
      let message = `Portainer API error (${response.status})`;
      try {
        const data = await response.json() as { message?: unknown };
        if (typeof data.message === 'string') message = data.message;
      } catch {
        // Upstream errors are not guaranteed to be JSON.
      }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to perform Portainer action');
  }
}
