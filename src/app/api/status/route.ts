import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to minimize data transfer
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return NextResponse.json({ status: 'online' }, { status: 200 });
    } else {
      // Even if it returns 404 or 500, the service is technically "reachable" but maybe not "healthy"
      // For a simple uptime check, we might consider 5xx as offline, but 4xx as online.
      // Let's stick to simple reachable = online for now, or maybe differentiate.
      // If the user wants to know if the *service* is up, usually any response is good.
      // But let's say 200-299 is green, others might be orange?
      // For now, let's just return online if we got a response.
       return NextResponse.json({ status: 'online', code: response.status }, { status: 200 });
    }
  } catch {
    return NextResponse.json({ status: 'offline', error: 'Unreachable' }, { status: 503 });
  }
}
