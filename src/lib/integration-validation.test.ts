import { describe, expect, it } from 'vitest';

import {
  parseCreateIntegrationRequest,
  parseIntegrationConfig,
  parseUpdateIntegrationRequest,
} from '@/lib/integration-validation';

describe('integration validation', () => {
  it('accepts private HTTP URLs for explicitly stored integrations', () => {
    expect(parseIntegrationConfig('qbittorrent', {
      url: 'http://192.168.1.19:8096',
      username: 'admin',
      password: 'secret',
    })).toEqual({
      url: 'http://192.168.1.19:8096',
      username: 'admin',
      password: 'secret',
    });
  });

  it('rejects unknown service types and arbitrary config fields', () => {
    expect(() => parseCreateIntegrationRequest({
      name: 'Generic API',
      type: 'generic',
      config: { url: 'https://example.test' },
    })).toThrow('Unsupported integration type');

    expect(() => parseIntegrationConfig('netdata', {
      url: 'http://192.168.1.20:19999',
      headers: { Authorization: 'secret' },
    })).toThrow('Unsupported netdata config field: headers');
  });

  it('rejects URL credentials and non-HTTP protocols', () => {
    expect(() => parseIntegrationConfig('netdata', {
      url: 'http://admin:secret@192.168.1.20:19999',
    })).toThrow('without embedded credentials');
    expect(() => parseIntegrationConfig('netdata', {
      url: 'file:///etc/passwd',
    })).toThrow('valid HTTP or HTTPS URL');
  });

  it('accepts a private authenticated RSS URL only as an encrypted integration secret', () => {
    const feedUrl = 'http://192.168.1.19:3033/i/?a=rss&token=secret&p=password';
    expect(parseIntegrationConfig('rss', { secretUrl: feedUrl })).toEqual({ secretUrl: feedUrl });
    expect(() => parseIntegrationConfig('rss', {
      secretUrl: 'file:///etc/passwd',
    })).toThrow('valid HTTP or HTTPS URL');
  });

  it('preserves omitted or masked secrets during an update', () => {
    const existing = {
      url: 'http://192.168.1.19:8096',
      apiKey: 'stored-secret',
      userId: 'user-1',
    };

    expect(parseUpdateIntegrationRequest({
      id: 'integration-1',
      name: 'Updated Jellyfin',
      type: 'jellyfin',
      config: {
        url: 'http://192.168.1.20:8096',
        apiKey: '********',
      },
    }, 'jellyfin', existing).config).toEqual({
      url: 'http://192.168.1.20:8096',
      apiKey: 'stored-secret',
    });
  });

  it('preserves a masked RSS feed URL during an update', () => {
    const feedUrl = 'http://192.168.1.19:3033/i/?token=stored-secret';
    expect(parseUpdateIntegrationRequest({
      id: 'rss-1',
      name: 'FreshRSS',
      type: 'rss',
      config: { secretUrl: '********' },
    }, 'rss', { secretUrl: feedUrl }).config).toEqual({ secretUrl: feedUrl });
  });

  it('requires qBittorrent credentials as a pair', () => {
    expect(() => parseIntegrationConfig('qbittorrent', {
      url: 'http://192.168.1.19:8096',
      username: 'admin',
    })).toThrow('must be provided together');
  });

  it('prevents changing an integration type', () => {
    expect(() => parseUpdateIntegrationRequest({
      id: 'integration-1',
      name: 'Changed',
      type: 'sonarr',
      config: { url: 'http://sonarr:8989', apiKey: 'secret' },
    }, 'radarr', {
      url: 'http://radarr:7878',
      apiKey: 'secret',
    })).toThrow('cannot be changed');
  });
});
