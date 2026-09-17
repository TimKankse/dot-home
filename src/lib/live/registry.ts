import { createHash } from 'node:crypto';
import type { AuthorizedIntegration } from '@/lib/integration-access';
import { SharedLiveHub } from './hub';
import type { LiveChannel } from './types';

const globals = globalThis as typeof globalThis & { dotHomeLiveHub?: SharedLiveHub };
export const liveHub = globals.dotHomeLiveHub ??= new SharedLiveHub();
export const liveSourceKey = (integration: AuthorizedIntegration, channel: LiveChannel) => JSON.stringify([
  integration.id, channel,
  createHash('sha256').update(JSON.stringify([integration.type, integration.config])).digest('hex'),
]);
export const refreshLiveIntegration = (id: string) => liveHub.refresh((key) => JSON.parse(key)[0] === id);
