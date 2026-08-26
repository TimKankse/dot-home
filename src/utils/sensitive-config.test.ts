import { describe, expect, it } from 'vitest';

import { redactSensitiveFields } from '@/utils/sensitive-config';

describe('sensitive config redaction', () => {
  const config = {
    url: 'http://service.local',
    apiKey: 'secret',
    nested: {
      clientSecret: 'client-secret',
      refreshInterval: '5000',
    },
  };

  it('omits sensitive values from widget-facing configuration', () => {
    expect(redactSensitiveFields(config)).toEqual({
      url: 'http://service.local',
      nested: { refreshInterval: '5000' },
    });
  });

  it('masks sensitive values for integration editing', () => {
    expect(redactSensitiveFields(config, 'mask')).toEqual({
      url: 'http://service.local',
      apiKey: '********',
      nested: {
        clientSecret: '********',
        refreshInterval: '5000',
      },
    });
  });
});
