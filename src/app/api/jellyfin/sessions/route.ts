import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse } from '@/lib/api-security';
import { jellyfinAuthHeaders, resolveJellyfinConnection } from '@/lib/jellyfin-connection';
import { fetchOutbound } from '@/lib/outbound-http';

export async function GET(request: Request) {
  try {
    const connection = await resolveJellyfinConnection(request);
    const baseUrl = connection.url.toString().replace(/\/$/, '');
    const response = await fetchOutbound(
      `${baseUrl}/Sessions?ActiveWithinSeconds=300`,
      {
        headers: jellyfinAuthHeaders(connection.apiKey),
        cache: 'no-store',
      },
      { policy: 'trusted-integration', timeoutMs: 10_000 },
    );

    if (!response.ok) {
      throw new Error(`Jellyfin API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch Jellyfin sessions');
  }
}
