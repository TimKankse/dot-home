import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { decryptSensitiveFields } from '@/utils/crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (!mode) {
    return NextResponse.json({ error: 'Mode is required' }, { status: 400 });
  }

  // Try to get Integration ID first
  const integrationId = request.headers.get('x-integration-id');

  let sabnzbdUrl = request.headers.get('x-sabnzbd-url');
  let sabnzbdApiKey = request.headers.get('x-sabnzbd-apikey');

  if (integrationId) {
    const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
    });
    
    if (integration) {
        const config = decryptSensitiveFields(JSON.parse(integration.config));
        sabnzbdUrl = (config.externalUrl || config.url) as string;
        sabnzbdApiKey = config.apiKey as string;
    }
  }

  if (!sabnzbdUrl || !sabnzbdApiKey) {
    return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
  }

  try {
    // Construct the target URL
    // SABnzbd API structure: /api?mode=...&output=json&apikey=...
    const targetUrl = new URL(`${sabnzbdUrl}/api`);
    targetUrl.searchParams.append('output', 'json');
    targetUrl.searchParams.append('apikey', sabnzbdApiKey);
    
    // Append all other params from the request
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    const response = await fetch(targetUrl.toString());

    if (!response.ok) {
        console.error(`SABnzbd Error: ${response.status} at ${targetUrl.toString()}`);
        return NextResponse.json(
            { error: response.statusText },
            { status: response.status }
        );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from SABnzbd:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
