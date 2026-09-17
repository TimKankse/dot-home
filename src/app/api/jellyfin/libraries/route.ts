import { NextRequest, NextResponse } from 'next/server';
import { apiSecurityErrorResponse } from '@/lib/api-security';
import { resolveJellyfinConnection } from '@/lib/jellyfin-connection';
import { readJellyfinLibraries } from '@/lib/live/jellyfin-libraries';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await readJellyfinLibraries(await resolveJellyfinConnection(request), request.signal));
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch Jellyfin libraries');
  }
}
