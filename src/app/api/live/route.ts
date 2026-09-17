import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ApiSecurityError, apiSecurityErrorResponse } from '@/lib/api-security';
import { isSessionTokenCurrent } from '@/lib/session-revocation';
import { acquireLiveConnection, authorizeLiveTopic, parseLiveTopics } from '@/lib/live/access';
import { liveHub, liveSourceKey } from '@/lib/live/registry';
import { createLiveSource } from '@/lib/live/sources';
import { topicKey } from '@/lib/live/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let release: (() => void) | undefined;
  try {
    const topics = parseLiveTopics(request.nextUrl.searchParams.get('topics'));
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !(await isSessionTokenCurrent(token))) {
      throw new ApiSecurityError('Unauthorized', 401, 'unauthorized');
    }
    const user = { id: token.id, role: token.role };
    release = acquireLiveConnection(user.id);
    const authorized = await Promise.allSettled(topics.map((topic) => authorizeLiveTopic(topic, user)));
    const encoder = new TextEncoder();
    const unsubscribe: (() => void)[] = [];
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
      unsubscribe.forEach((stop) => stop());
      release?.();
      request.signal.removeEventListener('abort', abort);
    };
    let close = cleanup;
    const abort = () => close();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        close = () => { cleanup(); try { controller.close(); } catch { /* already closed */ } };
        const send = (event: string, data: unknown) => {
          if (closed) return;
          if (Date.now() >= authorizedUntil) { close(); return; }
          const bytes = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          if ((controller.desiredSize ?? 0) < bytes.byteLength) { close(); return; }
          controller.enqueue(bytes);
        };
        request.signal.addEventListener('abort', abort, { once: true });
        if (request.signal.aborted) { close(); return; }
        try {
          topics.forEach((topic, index) => {
            if (closed) return;
            const result = authorized[index];
            if (result.status !== 'fulfilled') {
              send('update', { key: topicKey(topic), error: 'Integration unavailable', removed: true });
              return;
            }
            const integration = result.value;
            const stop = liveHub.subscribe(
              liveSourceKey(integration, topic.channel),
              () => createLiveSource(integration, topic.channel),
              (update) => send('update', { key: topicKey(topic), ...update }),
            );
            if (closed) stop();
            else unsubscribe.push(stop);
          });
        } catch { close(); return; }
        if (closed) return;
        timer = setInterval(() => {
          if (checking || closed) return;
          checking = true;
          void (async () => {
            try {
              if ((typeof token.exp === 'number' && Date.now() >= token.exp * 1000) || !(await isSessionTokenCurrent(token))) {
                send('reset', {}); close(); return;
              }
              const current = await Promise.allSettled(topics.map((topic) => authorizeLiveTopic(topic, user)));
              if (current.some((result, index) => {
                const previous = authorized[index];
                return result.status !== previous.status || (result.status === 'fulfilled' && previous.status === 'fulfilled' &&
                  liveSourceKey(result.value, topics[index].channel) !== liveSourceKey(previous.value, topics[index].channel));
              })) {
                send('reset', {}); close(); return;
              }
              authorizedUntil = Date.now() + 20_000;
              send('heartbeat', {});
            } catch { send('reset', {}); close(); }
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
    return apiSecurityErrorResponse(error, 'Failed to open live updates');
  }
}
