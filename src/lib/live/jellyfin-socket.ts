import WebSocket from 'ws';
import { resolveOutboundTarget } from '@/lib/outbound-http';
import { jellyfinAuthHeaders, type JellyfinConnection } from '@/lib/jellyfin-connection';
import { buildIntegrationUrl } from '@/lib/integration-connection';

// WebSocket upgrades use the same vetted DNS result as HTTP, never follow
// redirects, and keep the API key in a server-only header.
export function watchJellyfinSessions(
  connection: JellyfinConnection,
  publish: (sessions: unknown[]) => void,
  signal: AbortSignal,
) {
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let failures = 0;
  let lastMessage = 0;

  const connect = async () => {
    if (signal.aborted) return;
    try {
      const target = await resolveOutboundTarget(
        buildIntegrationUrl(connection.url, '/socket'), 'trusted-integration',
      );
      if (signal.aborted) return;
      const url = new URL(target.url);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(url, {
        headers: jellyfinAuthHeaders(connection.apiKey),
        followRedirects: false,
        handshakeTimeout: 5000,
        maxPayload: 2 * 1024 * 1024,
        perMessageDeflate: false,
        lookup: (_host, options, callback) => {
          const addresses = target.addresses.filter((entry) => !options.family || entry.family === options.family);
          if (!addresses.length) {
            callback(new Error('No vetted address for this IP family'), '', 4);
          } else if (options.all) {
            callback(null, addresses);
          } else {
            callback(null, addresses[0].address, addresses[0].family);
          }
        },
      });
      socket = ws;
      let pong = true;
      ws.on('open', () => {
        ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '0,2000' }));
        heartbeat = setInterval(() => {
          if (!pong) { ws.terminate(); return; }
          pong = false;
          ws.ping();
        }, 20_000);
      });
      ws.on('pong', () => { pong = true; });
      ws.on('message', (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          if (message.MessageType === 'Sessions' && Array.isArray(message.Data)) {
            lastMessage = Date.now();
            failures = 0;
            publish(message.Data);
          } else if (message.MessageType === 'ForceKeepAlive') {
            ws.send(JSON.stringify({ MessageType: 'KeepAlive' }));
          }
        } catch { ws.terminate(); }
      });
      ws.on('error', () => { ws.terminate(); });
      ws.on('close', () => {
        clearInterval(heartbeat);
        lastMessage = 0;
        scheduleRetry();
      });
    } catch { scheduleRetry(); }
  };
  const scheduleRetry = () => {
    if (signal.aborted) return;
    clearTimeout(retry);
    retry = setTimeout(() => void connect(), Math.min(60_000, 2000 * 2 ** Math.min(++failures, 5)));
  };
  signal.addEventListener('abort', () => {
    clearTimeout(retry);
    clearInterval(heartbeat);
    socket?.terminate();
  }, { once: true });
  void connect();
  return { isReceiving: () => Date.now() - lastMessage < 30_000 };
}
