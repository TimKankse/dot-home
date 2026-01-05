import { NextResponse } from 'next/server';

export async function GET() {
  const JELLYFIN_URL = process.env.JELLYFIN_URL;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;

  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    return NextResponse.json(
      { error: 'Jellyfin configuration missing' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: JELLYFIN_URL,
    apiKey: JELLYFIN_API_KEY,
  });
}
