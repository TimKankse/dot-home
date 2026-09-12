import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBootstrapSecret, verifyBootstrapSecret } from './bootstrap-security';

describe('bootstrap secret validation', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts only the exact configured secret', () => {
    const secret = 'a-long-bootstrap-secret-with-enough-entropy';
    vi.stubEnv('BOOTSTRAP_SECRET', secret);

    expect(getBootstrapSecret()).toBe(secret);
    expect(verifyBootstrapSecret(secret)).toBe(true);
    expect(verifyBootstrapSecret(`${secret}-wrong`)).toBe(false);
    expect(verifyBootstrapSecret('')).toBe(false);
  });

  it('rejects weak configured secrets', () => {
    vi.stubEnv('BOOTSTRAP_SECRET', 'too-short');
    expect(() => getBootstrapSecret()).toThrow('at least 24 bytes');
  });
});
