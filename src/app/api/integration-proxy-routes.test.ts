import { beforeEach, describe, expect, it, vi } from 'vitest';

const integrationConnectionMock = vi.hoisted(() => ({
  resolveRequestIntegration: vi.fn(),
  resolveIntegrationBaseUrl: vi.fn(),
  requireIntegrationConfigString: vi.fn(),
  buildIntegrationUrl: vi.fn(),
}));
const fetchOutboundMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/integration-connection', () => integrationConnectionMock);
vi.mock('@/lib/outbound-http', () => ({ fetchOutbound: fetchOutboundMock }));

import { GET as getJellyseerr } from './jellyseerr/route';
import { GET as getPortainer, POST as postPortainer } from './portainer/route';
import { POST as postSabnzbd } from './sabnzbd/route';

const integration = {
  id: 'integration-1',
  config: {
    url: 'http://trusted.internal:9000',
    apiKey: 'stored-secret',
    endpointId: '1',
  },
};

describe('typed integration proxy routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationConnectionMock.resolveRequestIntegration.mockResolvedValue(integration);
    integrationConnectionMock.resolveIntegrationBaseUrl.mockResolvedValue(
      new URL(integration.config.url),
    );
    integrationConnectionMock.requireIntegrationConfigString.mockImplementation(
      (resolved: typeof integration, field: keyof typeof integration.config) =>
        resolved.config[field],
    );
    integrationConnectionMock.buildIntegrationUrl.mockImplementation(
      (base: URL, pathname: string) => new URL(pathname, base),
    );
    fetchOutboundMock.mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('ignores legacy Portainer credential headers and uses the authorized integration', async () => {
    const response = await getPortainer(new Request(
      'https://home.example.test/api/portainer?integrationId=integration-1',
      {
        headers: {
          'x-portainer-url': 'http://attacker.invalid',
          'x-portainer-apikey': 'attacker-secret',
        },
      },
    ));

    expect(response.status).toBe(200);
    expect(integrationConnectionMock.resolveRequestIntegration).toHaveBeenCalledWith(
      expect.any(Request),
      'portainer',
    );
    const target = fetchOutboundMock.mock.calls[0][0] as URL;
    expect(target.origin).toBe('http://trusted.internal:9000');
    expect(target.pathname).toBe('/api/endpoints/1/docker/containers/json');
  });

  it('rejects non-allowlisted Portainer actions before contacting upstream', async () => {
    const response = await postPortainer(new Request(
      'https://home.example.test/api/portainer?integrationId=integration-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'container-1', action: 'delete' }),
      },
    ));

    expect(response.status).toBe(400);
    expect(integrationConnectionMock.resolveRequestIntegration).toHaveBeenCalledWith(
      expect.any(Request),
      'portainer',
      'edit',
    );
    expect(fetchOutboundMock).not.toHaveBeenCalled();
  });

  it('does not honor arbitrary Jellyseerr proxy paths', async () => {
    const response = await getJellyseerr(new Request(
      'https://home.example.test/api/jellyseerr?integrationId=integration-1&path=/settings/main',
    ));

    expect(response.status).toBe(200);
    const target = fetchOutboundMock.mock.calls[0][0] as URL;
    expect(target.pathname).toBe('/api/v1/request');
    expect(target.searchParams.get('path')).toBeNull();
  });

  it('requires edit permission for SABnzbd queue changes', async () => {
    const response = await postSabnzbd(new Request(
      'https://home.example.test/api/sabnzbd?integrationId=integration-1',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      },
    ));

    expect(response.status).toBe(200);
    expect(integrationConnectionMock.resolveRequestIntegration).toHaveBeenCalledWith(
      expect.any(Request),
      'sabnzbd',
      'edit',
    );
    const target = fetchOutboundMock.mock.calls[0][0] as URL;
    expect(target.searchParams.get('mode')).toBe('pause');
  });
});
