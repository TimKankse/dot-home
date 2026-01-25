import { NextResponse } from 'next/server';

// Format speed with responsive units
const formatSpeed = (bytesPerSecond: number): string => {
  if (!bytesPerSecond || bytesPerSecond === 0) return 'Idle';
  
  if (bytesPerSecond >= 1024 * 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
  } else if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  } else if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
  }
  return `${bytesPerSecond.toFixed(0)} B/s`;
};

interface Torrent {
    name: string;
    state: string;
    size: number;
    completed: number;
    progress: number;
    eta: number;
    dlspeed: number;
}

interface Slot {
    filename: string;
    percentage: string;
    mbleft: string;
    mb: string;
    status: string;
    timeleft: string;
    index: number;
    speed: number;
}

import { prisma } from '@/lib/db';
import { decryptSensitiveFields } from '@/utils/crypto';

interface AuthCacheEntry {
    cookie: string;
    timestamp: number;
}
const authCache = new Map<string, AuthCacheEntry>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  // Try to get Integration ID first
  const integrationId = request.headers.get('x-integration-id');
  
  let qbUrl = request.headers.get('x-qbittorrent-url');
  let qbUsername = request.headers.get('x-qbittorrent-username');
  let qbPassword = request.headers.get('x-qbittorrent-password');

  if (integrationId) {
    const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
    });
    
    if (integration) {
        const config = decryptSensitiveFields(JSON.parse(integration.config));
        qbUrl = (config.externalUrl || config.url) as string;
        qbUsername = config.username as string;
        qbPassword = config.password as string;
    }
  }

  if (!qbUrl) {
    return NextResponse.json({ error: 'Configuration missing' }, { status: 500 });
  }

  try {
    // 1. Authenticate (if credentials provided)
    let cookie = '';
    if (qbUsername && qbPassword) {
        // Check cache first (valid for 30 minutes)
        const cached = authCache.get(qbUrl);
        if (cached && (Date.now() - cached.timestamp < 1800000)) {
            cookie = cached.cookie;
        } else {
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
            } else {
                const setCookie = authRes.headers.get('set-cookie');
                if (setCookie) {
                    // Extract SID
                    const match = setCookie.match(/(SID=[^;]+)/);
                    if (match) {
                        cookie = match[1];
                        // Cache the cookie
                        authCache.set(qbUrl, {
                            cookie,
                            timestamp: Date.now()
                        });
                    }
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
        // Fetch Main Data & Transfer Info in Parallel
        const syncUrl = new URL(`${qbUrl}/api/v2/sync/maindata`);
        const transferUrl = new URL(`${qbUrl}/api/v2/transfer/info`);

        const [syncRes, transferRes] = await Promise.all([
          fetch(syncUrl.toString(), { headers }),
          fetch(transferUrl.toString(), { headers })
        ]);
        
        if (!syncRes.ok) {
             if (syncRes.status === 401 || syncRes.status === 403) {
                 authCache.delete(qbUrl);
             }
             throw new Error(`Failed to fetch sync data: ${syncRes.statusText}`);
        }
        
        const syncData = await syncRes.json();
        const transferData = transferRes.ok ? await transferRes.json() : {};

        // Transform to match our widget needs (similar to SABnzbd structure)
        const torrents = syncData.torrents || {};

        // Calculate Global Time Left
        let totalLeft = 0;
        let anyDownloading = false;
        
        // Filter and map slots
        const slots = Object.keys(torrents).map((hash, index) => {
            const t = torrents[hash] as Torrent;
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
        }).filter((t: Slot) => 
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
                speed: formatSpeed(transferData.dl_info_speed || 0),
                timeleft: globalTimeleft,
                slots: slots,
                paused: !anyDownloading && slots.length > 0 && slots.some((s: Slot) => s.status === 'pausedDL'),
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
             if (actionRes.status === 401 || actionRes.status === 403) {
                 authCache.delete(qbUrl);
             }
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
