import type { IntegrationCredentialField, IntegrationCredentialStatus } from '@/types/integration';
import { decryptValue, isEncrypted } from '@/utils/crypto';
import { MASKED_SECRET } from '@/utils/sensitive-config';

const credentialFields: IntegrationCredentialField[] = ['apiKey', 'password', 'clientSecret', 'secretUrl'];

export function getIntegrationCredentialStatus(config: Record<string, unknown>): IntegrationCredentialStatus {
  const status: IntegrationCredentialStatus = {};

  for (const field of credentialFields) {
    const stored = config[field];
    if (typeof stored !== 'string' || !stored) continue;

    const decrypted = decryptValue(stored);
    status[field] = isEncrypted(decrypted) || decrypted === MASKED_SECRET ? 'unreadable' : 'saved';
  }

  return status;
}
