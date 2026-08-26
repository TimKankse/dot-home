import { ApiSecurityError, requireApiUser } from '@/lib/api-security';
import {
  resolveAuthorizedIntegration,
  type AuthorizedIntegration,
} from '@/lib/integration-access';
import { validateOutboundUrl } from '@/lib/outbound-http';

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const getRequestIntegrationId = (request: Request): string | null => {
  const requestUrl = new URL(request.url);
  return (
    request.headers.get('x-integration-id') ||
    requestUrl.searchParams.get('integrationId')
  );
};

export const requireIntegrationConfigString = (
  integration: AuthorizedIntegration,
  field: string,
): string => {
  const value = readString(integration.config[field]);
  if (!value || value.startsWith('enc:')) {
    throw new ApiSecurityError(
      `${integration.type} integration is incomplete`,
      500,
      'invalid_integration_config',
    );
  }
  return value;
};

export async function resolveRequestIntegration(
  request: Request,
  expectedType: string,
  requiredPermission: 'view' | 'edit' = 'view',
): Promise<AuthorizedIntegration> {
  const user = await requireApiUser();
  return resolveAuthorizedIntegration({
    integrationId: getRequestIntegrationId(request),
    user,
    expectedTypes: [expectedType],
    requiredPermission,
  });
}

export async function resolveIntegrationBaseUrl(
  integration: AuthorizedIntegration,
): Promise<URL> {
  const rawUrl =
    readString(integration.config.externalUrl) ||
    requireIntegrationConfigString(integration, 'url');
  const url = await validateOutboundUrl(rawUrl, 'trusted-integration');
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

export function buildIntegrationUrl(baseUrl: URL, pathname: string): URL {
  const url = new URL(baseUrl);
  const basePath = url.pathname.replace(/\/$/, '');
  const childPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  url.pathname = `${basePath}${childPath}`;
  return url;
}
