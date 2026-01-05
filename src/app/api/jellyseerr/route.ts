import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  const jellyseerrUrl = request.headers.get('x-jellyseerr-url');
  const jellyseerrApiKey = request.headers.get('x-jellyseerr-apikey');

  if (!jellyseerrUrl || !jellyseerrApiKey) {
    return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
  }

  try {
    const targetUrl = new URL(`${jellyseerrUrl}/api/v1${path}`);
    
    // Fix: Only append parameters that actually exist in the incoming request.
    // Do not force defaults like 'take' or 'filter' here, because they break 
    // single-item requests (like /movie/123).
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        targetUrl.searchParams.append(key, value);
      }
    });

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'X-Api-Key': jellyseerrApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
        // Log the actual error from Jellyseerr for easier debugging
        console.error(`Jellyseerr Error: ${response.status} at ${targetUrl.toString()}`);
        return NextResponse.json(
            { error: response.statusText },
            { status: response.status }
        );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from Jellyseerr:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  const jellyseerrUrl = request.headers.get('x-jellyseerr-url');
  const jellyseerrApiKey = request.headers.get('x-jellyseerr-apikey');

  if (!jellyseerrUrl || !jellyseerrApiKey) {
    return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
  }

  try {
    const targetUrl = new URL(`${jellyseerrUrl}/api/v1${path}`);
    
    // Append any extra query params
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        targetUrl.searchParams.append(key, value);
      }
    });

    // Get body if present
    let body;
    try {
        body = await request.json();
    } catch {
        // Body might be empty
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'X-Api-Key': jellyseerrApiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        console.error(`Jellyseerr Error: ${response.status} at ${targetUrl.toString()}`);
        return NextResponse.json(
            { error: response.statusText },
            { status: response.status }
        );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error posting to Jellyseerr:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}