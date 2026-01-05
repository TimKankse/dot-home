// app/api/jellyfin/image/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Image ID required', { status: 400 });
  }

  let JELLYFIN_URL = request.headers.get('x-jellyfin-url');
  
  if (!JELLYFIN_URL) {
    // Fallback to query params
    JELLYFIN_URL = searchParams.get('url');
  }
  
  if (!JELLYFIN_URL) {
    return new NextResponse('Configuration missing', { status: 500 });
  }

  try {
    // Fetch the primary image (Poster)
    // We limit width/height to save bandwidth on the widget
    const imageUrl = `${JELLYFIN_URL}/Items/${id}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`;
    
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new NextResponse('Image not found', { status: response.status });
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Error fetching Jellyfin image:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}