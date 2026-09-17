import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import { resolveIntegrationBaseUrl, resolveRequestIntegration } from '@/lib/integration-connection';
import { resolveAuthorizedIntegration, type AuthorizedIntegration } from '@/lib/integration-access';
import { isSessionTokenCurrent } from '@/lib/session-revocation';
import { acquireLiveConnection } from '@/lib/live/access';
import { liveHub } from '@/lib/live/registry';
import { readBoundedJson } from '@/lib/bounded-json';
import { fetchNetdataData } from './data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_SCOPES = new Set([
    'all', 'cpu', 'ram', 'storage', 'processes', 'network',
    'system', 'cpu-cores', 'gpu', 'sensors',
]);
const parseScopes = (value: string | null): string[] => {
    const scopes = [...new Set((value || 'all').split(',').filter(Boolean))].sort();
    if (!scopes.length || scopes.some((scope) => !VALID_SCOPES.has(scope))) {
        throw new ApiSecurityError('Invalid Netdata scope', 400, 'invalid_scope');
    }
    return scopes.includes('all') ? ['all'] : scopes;
};
const boundedInteger = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const integrationKey = (integration: AuthorizedIntegration) => JSON.stringify([
    integration.id, 'netdata', createHash('sha256').update(JSON.stringify(integration.config)).digest('hex'),
]);

export async function GET(request: NextRequest) {
    let release: (() => void) | undefined;
    try {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (!token || !(await isSessionTokenCurrent(token))) {
            throw new ApiSecurityError('Unauthorized', 401, 'unauthorized');
        }
        const user = { id: token.id, role: token.role };
        const integrationId = request.nextUrl.searchParams.get('integrationId');
        const authorize = () => resolveAuthorizedIntegration({ integrationId, user, expectedTypes: ['netdata'] });
        const integration = await authorize();
        const scopes = parseScopes(request.nextUrl.searchParams.get('scope'));
        const interval = boundedInteger(request.nextUrl.searchParams.get('interval'), 2000, 2000, 60_000);
        const limit = boundedInteger(request.nextUrl.searchParams.get('processLimit'), 10, 1, 50);
        const key = integrationKey(integration);
        const url = (await resolveIntegrationBaseUrl(integration)).toString().replace(/\/$/, '');
        release = acquireLiveConnection(user.id);
        const encoder = new TextEncoder();
        let unsubscribe: (() => void) | undefined;
        let timer: ReturnType<typeof setInterval> | undefined;
        let lifetime: ReturnType<typeof setTimeout> | undefined;
        let closed = false;
        let checking = false;
        let authorizedUntil = Date.now() + 20_000;
        const cleanup = () => {
            if (closed) return;
            closed = true;
            clearInterval(timer);
            clearTimeout(lifetime);
            unsubscribe?.();
            release?.();
            request.signal.removeEventListener('abort', abort);
        };
        let close = cleanup;
        const abort = () => close();
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                close = () => { cleanup(); try { controller.close(); } catch { /* already closed */ } };
                const send = (frame: string) => {
                    if (closed) return;
                    const bytes = encoder.encode(frame);
                    if (Date.now() >= authorizedUntil || (controller.desiredSize ?? 0) < bytes.byteLength) {
                        close(); return;
                    }
                    controller.enqueue(bytes);
                };
                request.signal.addEventListener('abort', abort, { once: true });
                if (request.signal.aborted) { close(); return; }
                try {
                    const stop = liveHub.subscribe(JSON.stringify([key, scopes, limit, interval]), () => ({
                        poll: async (signal) => ({
                            data: { ...await fetchNetdataData({ url, key, signal }, scopes, limit), _sampledAt: Date.now() },
                            intervalMs: interval,
                        }),
                    }), (update) => send(`data: ${JSON.stringify(update.error ? { error: update.error } : update.data)}\n\n`));
                    if (closed) stop(); else unsubscribe = stop;
                } catch { close(); return; }
                if (closed) return;
                timer = setInterval(() => {
                    if (checking || closed) return;
                    checking = true;
                    void (async () => {
                        try {
                            if ((typeof token.exp === 'number' && token.exp * 1000 <= Date.now()) ||
                                !(await isSessionTokenCurrent(token)) || integrationKey(await authorize()) !== key) {
                                send('event: reset\ndata: {}\n\n'); close(); return;
                            }
                            authorizedUntil = Date.now() + 20_000;
                            send(': heartbeat\n\n');
                        } catch { send('event: reset\ndata: {}\n\n'); close(); }
                        finally { checking = false; }
                    })();
                }, 15_000);
                lifetime = setTimeout(close, 5 * 60_000);
            },
            cancel: cleanup,
        }, { highWaterMark: 2.5 * 1024 * 1024, size: (chunk) => chunk.byteLength });
        return new Response(stream, { headers: {
            'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-cache, no-store',
            'X-Accel-Buffering': 'no',
        } });
    } catch (error) {
        release?.();
        return apiSecurityErrorResponse(error, 'Failed to open Netdata stream');
    }
}

export async function POST(request: Request) {
    try {
        const integration = await resolveRequestIntegration(request, 'netdata');
        const body = await readBoundedJson(request) as { processLimit?: unknown; scope?: unknown } | null;
        const scopes = Array.isArray(body?.scope) ? parseScopes(body.scope.join(',')) : ['all'];
        const url = (await resolveIntegrationBaseUrl(integration)).toString().replace(/\/$/, '');
        const data = await fetchNetdataData({ url, key: integrationKey(integration), signal: request.signal },
            scopes, boundedInteger(body?.processLimit, 10, 1, 50));
        return NextResponse.json(data);
    } catch (error) {
        return apiSecurityErrorResponse(error, 'Failed to connect to Netdata');
    }
}
