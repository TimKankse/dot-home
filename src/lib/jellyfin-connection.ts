import { ApiSecurityError, requireApiUser } from '@/lib/api-security';
import { resolveAuthorizedIntegration } from '@/lib/integration-access';
import { validateOutboundUrl } from '@/lib/outbound-http';

export type JellyfinConnection = {
  url: URL;
  apiKey: string;
  userId?: string;
  source: 'integration';
};

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export async function resolveJellyfinConnection(
  request: Request,
): Promise<JellyfinConnection> {
  const user = await requireApiUser();
  const requestUrl = new URL(request.url);
  const integrationId =
    request.headers.get('x-integration-id') ||
    requestUrl.searchParams.get('integrationId');

  const integration = await resolveAuthorizedIntegration({
    integrationId,
    user,
    expectedTypes: ['jellyfin'],
    requiredPermission: 'view',
  });
  const rawUrl = readString(integration.config.externalUrl) || readString(integration.config.url);
  const apiKey = readString(integration.config.apiKey);
  if (!rawUrl || !apiKey) {
    throw new ApiSecurityError(
      'Jellyfin integration is incomplete',
      500,
      'invalid_integration_config',
    );
  }

  return {
    url: await validateOutboundUrl(rawUrl, 'trusted-integration'),
    apiKey,
    userId: readString(integration.config.userId),
    source: 'integration',
  };
}
