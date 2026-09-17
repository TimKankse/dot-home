import { NextResponse } from 'next/server';
import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import { resolveRequestIntegration } from '@/lib/integration-connection';
import { createQbittorrentReader, updateQbittorrent } from '@/lib/live/qbittorrent';
import { refreshLiveIntegration } from '@/lib/live/registry';

export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get('mode') !== 'queue') {
      throw new ApiSecurityError('Invalid mode', 400, 'invalid_mode');
    }
    const integration = await resolveRequestIntegration(request, 'qbittorrent');
    return NextResponse.json(await createQbittorrentReader(integration)(request.signal));
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch qBittorrent queue');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: unknown };
    if (body.action !== 'pause' && body.action !== 'resume') {
      throw new ApiSecurityError('Invalid queue action', 400, 'invalid_queue_action');
    }
    const integration = await resolveRequestIntegration(request, 'qbittorrent', 'edit');
    await updateQbittorrent(integration, body.action);
    refreshLiveIntegration(integration.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to update qBittorrent queue');
  }
}
