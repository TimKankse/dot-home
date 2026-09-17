import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import {
  buildIntegrationUrl,
  requireIntegrationConfigString,
  resolveIntegrationBaseUrl,
  resolveRequestIntegration,
} from '@/lib/integration-connection';
import { refreshLiveIntegration } from '@/lib/live/registry';
import { sanitizeSabnzbdQueue } from '@/lib/live/sabnzbd';
import { fetchOutbound } from '@/lib/outbound-http';

async function callSabnzbd(request: Request, mode: 'queue' | 'pause' | 'resume') {
  const integration = await resolveRequestIntegration(
    request,
    'sabnzbd',
    mode === 'queue' ? 'view' : 'edit',
  );
  const baseUrl = await resolveIntegrationBaseUrl(integration);
  const apiKey = requireIntegrationConfigString(integration, 'apiKey');
  const targetUrl = buildIntegrationUrl(baseUrl, '/api');
  targetUrl.searchParams.set('output', 'json');
  targetUrl.searchParams.set('apikey', apiKey);
  targetUrl.searchParams.set('mode', mode);
  const response = await fetchOutbound(
    targetUrl,
    { cache: 'no-store' },
    { policy: 'trusted-integration' },
  );
  if (!response.ok) {
    return NextResponse.json(
      { error: `SABnzbd API error (${response.status})` },
      { status: response.status },
    );
  }
  if (mode === 'queue') {
    const data = await response.json();
    return NextResponse.json({ queue: sanitizeSabnzbdQueue(data.queue) });
  }
  refreshLiveIntegration(integration.id);
  return NextResponse.json(response.body ? await response.json() : { status: true });
}

export async function GET(request: Request) {
  try {
    const mode = new URL(request.url).searchParams.get('mode');
    if (mode !== 'queue') {
      throw new ApiSecurityError('Invalid mode', 400, 'invalid_mode');
    }
    return await callSabnzbd(request, mode);
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch SABnzbd queue');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: unknown };
    if (body.action !== 'pause' && body.action !== 'resume') {
      throw new ApiSecurityError('Invalid queue action', 400, 'invalid_queue_action');
    }
    return await callSabnzbd(request, body.action);
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to update SABnzbd queue');
  }
}
