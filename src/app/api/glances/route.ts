import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Ensure URL has protocol
    const baseUrl = url.startsWith('http') ? url : `http://${url}`;
    // Remove trailing slash if present
    const cleanUrl = baseUrl.replace(/\/$/, '');

    console.log(`[Glances] Fetching data from: ${cleanUrl}`);

    // Fetch data from multiple endpoints in parallel
    const [cpuRes, memRes, fsRes, sensorsRes, processRes, networkRes] = await Promise.all([
      fetch(`${cleanUrl}/api/4/cpu`, { signal: AbortSignal.timeout(5000) }).catch(e => ({ ok: false, status: 500, statusText: e.message, url: 'cpu' } as Response)),
      fetch(`${cleanUrl}/api/4/mem`, { signal: AbortSignal.timeout(5000) }).catch(e => ({ ok: false, status: 500, statusText: e.message, url: 'mem' } as Response)),
      fetch(`${cleanUrl}/api/4/fs`, { signal: AbortSignal.timeout(5000) }).catch(e => ({ ok: false, status: 500, statusText: e.message, url: 'fs' } as Response)),
      fetch(`${cleanUrl}/api/4/sensors`, { signal: AbortSignal.timeout(5000) }).catch(e => ({ ok: false, status: 500, statusText: e.message, url: 'sensors' } as Response)),
      fetch(`${cleanUrl}/api/4/processlist`, { signal: AbortSignal.timeout(5000) }).catch(e => ({ ok: false, status: 500, statusText: e.message, url: 'processlist' } as Response)),
      fetch(`${cleanUrl}/api/4/network`, { signal: AbortSignal.timeout(5000) }).catch(e => ({ ok: false, status: 500, statusText: e.message, url: 'network' } as Response))
    ]);

    if (!cpuRes.ok || !memRes.ok || !fsRes.ok) {
        console.error('[Glances] Fetch failed:', {
            cpu: { ok: cpuRes.ok, status: cpuRes.status, statusText: cpuRes.statusText },
            mem: { ok: memRes.ok, status: memRes.status, statusText: memRes.statusText },
            fs: { ok: fsRes.ok, status: fsRes.status, statusText: fsRes.statusText },
            sensors: { ok: sensorsRes.ok, status: sensorsRes.status, statusText: sensorsRes.statusText },
            process: { ok: processRes.ok, status: processRes.status, statusText: processRes.statusText },
            network: { ok: networkRes.ok, status: networkRes.status, statusText: networkRes.statusText }
        });
        
        // Try to get more specific error info
        const status = !cpuRes.ok ? cpuRes.status : (!memRes.ok ? memRes.status : fsRes.status);
        return NextResponse.json({ error: `Failed to fetch data from Glances. Status: ${status}` }, { status: 502 });
    }

    const [cpu, mem, fs, sensors, processList, network] = await Promise.all([
      cpuRes.json(),
      memRes.json(),
      fsRes.json(),
      sensorsRes.ok ? sensorsRes.json() : [],
      processRes.ok ? processRes.json() : [],
      networkRes.ok ? networkRes.json() : []
    ]);

    return NextResponse.json({
      cpu,
      mem,
      fs,
      sensors,
      processList,
      network
    });

  } catch (error) {
    console.error('Glances API Error:', error);
    return NextResponse.json({ error: 'Failed to connect to Glances' }, { status: 500 });
  }
}
