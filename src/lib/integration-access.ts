import { prisma } from '@/lib/db';
import { ApiSecurityError, type ApiUser } from '@/lib/api-security';
import { decryptSensitiveFields } from '@/utils/crypto';
import {
  resolvePermission,
  type AccessLevel,
  type EffectivePermission,
} from '@/utils/permissions';

export type IntegrationConfig = Record<string, unknown>;

export type AuthorizedIntegration = {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  permission: Exclude<EffectivePermission, 'none'>;
  config: IntegrationConfig;
};

type ResolveIntegrationOptions = {
  integrationId: string | null | undefined;
  user: ApiUser;
  expectedTypes: readonly string[];
  requiredPermission?: 'view' | 'edit';
};

const hasRequiredPermission = (
  actual: EffectivePermission,
  required: 'view' | 'edit',
) => actual === 'edit' || (required === 'view' && actual === 'view');

export async function resolveAuthorizedIntegration({
  integrationId,
  user,
  expectedTypes,
  requiredPermission = 'view',
}: ResolveIntegrationOptions): Promise<AuthorizedIntegration> {
  if (!integrationId) {
    throw new ApiSecurityError(
      'Integration ID is required',
      400,
      'integration_required',
    );
  }

  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  });

  // Use one response for missing, inaccessible, and wrong-type integrations so
  // IDs cannot be used to enumerate another user's configuration.
  if (!integration || !expectedTypes.includes(integration.type)) {
    throw new ApiSecurityError(
      'Integration not found',
      404,
      'integration_not_found',
    );
  }

  const permission = await resolvePermission(
    {
      objectType: 'integration',
      objectId: integration.id,
      ownerId: integration.userId,
      accessLevel: integration.accessLevel as AccessLevel,
    },
    user.id,
  );

  if (!hasRequiredPermission(permission, requiredPermission)) {
    throw new ApiSecurityError(
      'Integration not found',
      404,
      'integration_not_found',
    );
  }

  let parsedConfig: IntegrationConfig;
  try {
    parsedConfig = JSON.parse(integration.config) as IntegrationConfig;
  } catch {
    throw new ApiSecurityError(
      'Integration configuration is invalid',
      500,
      'invalid_integration_config',
    );
  }

  return {
    id: integration.id,
    ownerId: integration.userId,
    name: integration.name,
    type: integration.type,
    permission: permission as Exclude<EffectivePermission, 'none'>,
    config: decryptSensitiveFields(parsedConfig),
  };
}
