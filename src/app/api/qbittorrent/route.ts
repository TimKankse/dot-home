import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  const qbUrl = request.headers.get('x-qbittorrent-url');
  const qbUsername = request.headers.get('x-qbittorrent-username');
  const qbPassword = request.headers.get('x-qbittorrent-password');

  if (!qbUrl) {
    return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
  }

  try {
    // 1. Authenticate (if credentials provided)
    let cookie = '';
    if (qbUsername && qbPassword) {
      const authUrl = new URL(`${qbUrl}/api/v2/auth/login`);
      const authBody = new URLSearchParams();
      authBody.append('username', qbUsername);
      authBody.append('password', qbPassword);

      const authRes = await fetch(authUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: authBody,
      });

      if (!authRes.ok) {
         console.error(`qBittorrent Auth Error: ${authRes.status}`);
         // Continue anyway, maybe no auth needed? Or return error?
         // Let's try to continue, but if it fails later we know why.
      } else {
        const setCookie = authRes.headers.get('set-cookie');
        if (setCookie) {
            // Extract SID
            const match = setCookie.match(/(SID=[^;]+)/);
            if (match) {
                cookie = match[1];
            }
        }
      }
    }

    const headers: HeadersInit = {};
    if (cookie) {
        headers['Cookie'] = cookie;
    }

    if (mode === 'queue') {
        // Fetch Main Data (Sync)
        const syncUrl = new URL(`${qbUrl}/api/v2/sync/maindata`);
        const syncRes = await fetch(syncUrl.toString(), { headers });
        
        if (!syncRes.ok) {
             throw new Error(`Failed to fetch sync data: ${syncRes.statusText}`);
        }
        
        const syncData = await syncRes.json();
        
        // Fetch Transfer Info (for global speed)
        const transferUrl = new URL(`${qbUrl}/api/v2/transfer/info`);
        const transferRes = await fetch(transferUrl.toString(), { headers });
        const transferData = transferRes.ok ? await transferRes.json() : {};

        // Transform to match our widget needs (similar to SABnzbd structure)
        const torrents = syncData.torrents || {};

        // Calculate Global Time Left
        let totalLeft = 0;
        let anyDownloading = false;
        
        // Filter and map slots
        const slots = Object.keys(torrents).map((hash, index) => {
            const t = torrents[hash];
            const isDownloading = t.state === 'downloading' || t.state === 'stalledDL' || t.state === 'metaDL' || t.state === 'forcedDL';
            
            if (isDownloading) {
                totalLeft += (t.size - t.completed);
                if (t.state === 'downloading' || t.state === 'forcedDL') {
                    anyDownloading = true;
                }
            }

            return {
                filename: t.name,
                percentage: (t.progress * 100).toFixed(1),
                mbleft: ((t.size - t.completed) / 1024 / 1024).toFixed(2),
                mb: (t.size / 1024 / 1024).toFixed(2),
                status: t.state,
                timeleft: t.eta === 8640000 ? '∞' : new Date(t.eta * 1000).toISOString().substr(11, 8),
                index: index,
                speed: t.dlspeed,
            };
        }).filter((t: any) => 
            ['downloading', 'stalledDL', 'metaDL', 'queuedDL', 'forcingDL', 'pausedDL'].includes(t.status)
        );

        // Calculate global ETA
        let globalTimeleft = '00:00:00';
        if (transferData.dl_info_speed > 0 && totalLeft > 0) {
            const seconds = totalLeft / transferData.dl_info_speed;
            if (seconds < 86400) { // Less than a day
                globalTimeleft = new Date(seconds * 1000).toISOString().substr(11, 8);
            } else {
                globalTimeleft = '> 24h';
            }
        }

        const responseData = {
            queue: {
                status: syncData.server_state?.connection_status || 'unknown',
                speed: transferData.dl_info_speed ? (transferData.dl_info_speed / 1024 / 1024).toFixed(2) + ' MB/s' : '0 MB/s',
                timeleft: globalTimeleft,
                slots: slots,
                paused: !anyDownloading && slots.length > 0 && slots.some((s: any) => s.status === 'pausedDL'),
            }
        };

        return NextResponse.json(responseData);
    } else if (mode === 'pause' || mode === 'resume') {
        const command = mode === 'pause' ? 'pause' : 'resume';
        const actionUrl = new URL(`${qbUrl}/api/v2/torrents/${command}`);
        const body = new URLSearchParams();
        body.append('hashes', 'all');

        const actionRes = await fetch(actionUrl.toString(), { 
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });

        if (!actionRes.ok) {
             throw new Error(`Failed to ${command} torrents: ${actionRes.statusText}`);
        }
        
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Error fetching from qBittorrent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
