// app/api/jellyfin/image/route.ts
import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse } from '@/lib/api-security';
import { jellyfinAuthHeaders, resolveJellyfinConnection } from '@/lib/jellyfin-connection';
import { fetchOutbound } from '@/lib/outbound-http';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Image ID required', { status: 400 });
  }

  try {
    const connection = await resolveJellyfinConnection(request);
    const baseUrl = connection.url.toString().replace(/\/$/, '');
    // Fetch the primary image (Poster)
    // We limit width/height to save bandwidth on the widget
    const imageUrl = `${baseUrl}/Items/${encodeURIComponent(id)}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`;
    
    const response = await fetchOutbound(
      imageUrl,
      {
        headers: jellyfinAuthHeaders(connection.apiKey),
        cache: 'no-store',
      },
      { policy: 'trusted-integration', timeoutMs: 10_000 },
    );

    if (!response.ok) {
      return new NextResponse('Image not found', { status: response.status });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return new NextResponse('Invalid image response', { status: 502 });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'private, max-age=3600');

    return new NextResponse(blob, { headers });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch Jellyfin image');
  }
}
