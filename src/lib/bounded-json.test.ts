// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readBoundedJson } from './bounded-json';

describe('bounded JSON requests', () => {
  it('reads ordinary JSON and rejects oversized bodies without trusting content-length', async () => {
    const request = (body: string) => new Request('http://home.test', { method: 'POST', body });
    expect(await readBoundedJson(request('{"a":1}'))).toEqual({ a: 1 });
    await expect(readBoundedJson(request('{"a":"xxxxxxxxxx"}'), 8)).rejects.toMatchObject({ status: 413 });
    await expect(readBoundedJson(request('bad'))).rejects.toMatchObject({ status: 400 });
  });
});
