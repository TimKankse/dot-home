import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const JELLYFIN_URL = request.headers.get('x-jellyfin-url');
  const JELLYFIN_API_KEY = request.headers.get('x-jellyfin-apikey');

  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    return NextResponse.json(
      { error: 'Jellyfin configuration missing' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${JELLYFIN_URL}/Sessions?ActiveWithinSeconds=300`,
      {
        headers: {
          'X-Emby-Token': JELLYFIN_API_KEY,
        },
        next: { revalidate: 10 }, // Cache for 10 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Jellyfin API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Jellyfin sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
