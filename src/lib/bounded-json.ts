import { ApiSecurityError } from '@/lib/api-security';

export async function readBoundedJson(request: Request, limit = 64 * 1024): Promise<unknown> {
  if (!request.body) throw new ApiSecurityError('Missing request body', 400, 'invalid_body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let expired = false;
  const timeout = setTimeout(() => { expired = true; void reader.cancel(); }, 10_000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new ApiSecurityError('Request is too large', 413, 'request_too_large');
      chunks.push(value);
    }
    if (expired) throw new ApiSecurityError('Request body timed out', 408, 'request_timeout');
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new ApiSecurityError('Invalid JSON', 400, 'invalid_body'); }
  } finally { clearTimeout(timeout); await reader.cancel(); }
}
