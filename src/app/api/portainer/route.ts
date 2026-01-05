import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.headers.get('x-portainer-url');
  const apiKey = request.headers.get('x-portainer-apikey');
  const endpointId = request.headers.get('x-portainer-endpoint-id') || '1';

  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  try {
    // Ensure URL doesn't end with slash
    const baseUrl = url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/endpoints/${endpointId}/docker/containers/json?all=1`;

    const res = await fetch(apiUrl, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Portainer API error: ${res.statusText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Portainer proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const url = request.headers.get('x-portainer-url');
  const apiKey = request.headers.get('x-portainer-apikey');
  const endpointId = request.headers.get('x-portainer-endpoint-id') || '1';

  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
        return NextResponse.json({ error: 'Missing container ID or action' }, { status: 400 });
    }

    // Ensure URL doesn't end with slash
    const baseUrl = url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/api/endpoints/${endpointId}/docker/containers/${id}/${action}`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!res.ok) {
        // Try to read error message
        try {
            const errData = await res.json();
             return NextResponse.json({ error: errData.message || res.statusText }, { status: res.status });
        } catch {
             return NextResponse.json({ error: `Portainer API error: ${res.statusText}` }, { status: res.status });
        }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portainer action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
