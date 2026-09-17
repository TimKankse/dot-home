// @vitest-environment node
import { createServer, type Server, type RequestListener } from 'node:http';
import { gzipSync } from 'node:zlib';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { fetchOutbound } from './outbound-http';

let server: Server | undefined;
afterEach(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
});
async function serve(handler: RequestListener) {
  server = createServer(handler);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe('pinned HTTP transport', () => {
  it.each([204, 205, 304])('returns a valid empty %s response without throwing from the HTTP callback', async (status) => {
    const url = await serve((_request, response) => { response.writeHead(status); response.end(); });
    const response = await fetchOutbound(url, {}, { policy: 'trusted-integration' });
    expect(response.status).toBe(status);
    expect(response.body).toBeNull();
    expect(await response.text()).toBe('');
  });
  it('supports HEAD responses', async () => {
    const url = await serve((_request, response) => { response.writeHead(200); response.end('ignored'); });
    const response = await fetchOutbound(url, { method: 'HEAD' }, { policy: 'trusted-integration' });
    expect(response.body).toBeNull();
  });
  it('limits decompressed bytes, including chunked responses without content-length', async () => {
    const url = await serve((_request, response) => {
      response.writeHead(200, { 'Content-Encoding': 'gzip' });
      response.write(gzipSync('a'.repeat(100_000)));
      response.end();
    });
    const response = await fetchOutbound(url, {}, { policy: 'trusted-integration', maxResponseBytes: 1024 });
    await expect(response.text()).rejects.toMatchObject({ code: 'upstream_response_too_large' });
  });
  it('reports corrupt compressed responses through the body reader', async () => {
    const url = await serve((_request, response) => {
      response.writeHead(200, { 'Content-Encoding': 'gzip' }); response.end('invalid gzip');
    });
    const response = await fetchOutbound(url, {}, { policy: 'trusted-integration' });
    await expect(response.text()).rejects.toBeDefined();
  });
});
