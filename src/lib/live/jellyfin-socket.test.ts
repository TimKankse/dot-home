// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import { watchJellyfinSessions } from './jellyfin-socket';

let server: Server;
let sockets: WebSocketServer;
let abort: AbortController;
afterEach(async () => {
  abort?.abort();
  sockets?.clients.forEach((socket) => socket.terminate());
  if (sockets) await new Promise<void>((resolve) => sockets.close(() => resolve()));
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Jellyfin upstream subscription', () => {
  it('authenticates in headers, subscribes, receives sessions, and disconnects when unused', async () => {
    server = createServer();
    sockets = new WebSocketServer({ server });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    abort = new AbortController();
    let requestUrl = '';
    let token: string | string[] | undefined;
    let subscription: unknown;
    sockets.on('connection', (socket, request) => {
      requestUrl = request.url!;
      token = request.headers['x-emby-token'];
      socket.once('message', (message) => {
        subscription = JSON.parse(message.toString());
        socket.send(JSON.stringify({ MessageType: 'Sessions', Data: [{ Id: 'playing' }] }));
      });
    });
    let watcher!: ReturnType<typeof watchJellyfinSessions>;
    const data = await new Promise<unknown[]>((resolve) => {
      watcher = watchJellyfinSessions({
        url: new URL(`http://127.0.0.1:${port}/jellyfin`), apiKey: 'test-api-key', source: 'integration',
      }, resolve, abort.signal);
    });
    expect(data).toEqual([{ Id: 'playing' }]);
    expect(requestUrl).toBe('/jellyfin/socket');
    expect(token).toBe('test-api-key');
    expect(subscription).toEqual({ MessageType: 'SessionsStart', Data: '0,2000' });
    expect(watcher.isReceiving()).toBe(true);
    const closed = new Promise<void>((resolve) => [...sockets.clients][0].once('close', () => resolve()));
    abort.abort();
    await closed;
    expect(sockets.clients.size).toBe(0);
  });
});
