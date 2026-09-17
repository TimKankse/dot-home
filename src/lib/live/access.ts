import { ApiSecurityError } from '@/lib/api-security';
import type { ApiUser } from '@/lib/api-security';
import { resolveAuthorizedIntegration } from '@/lib/integration-access';
import { LIVE_CHANNELS, type LiveChannel, type LiveTopic, topicKey } from './types';

export function parseLiveTopics(value: string | null): LiveTopic[] {
  if (!value || value.length > 8000) throw new ApiSecurityError('Invalid subscriptions', 400, 'invalid_subscriptions');
  let topics: unknown;
  try { topics = JSON.parse(value); } catch { /* handled below */ }
  if (!Array.isArray(topics) || !topics.length || topics.length > 24) {
    throw new ApiSecurityError('Invalid subscriptions', 400, 'invalid_subscriptions');
  }
  const unique = new Map<string, LiveTopic>();
  for (const topic of topics) {
    if (!topic || typeof topic.integrationId !== 'string' || !topic.integrationId || topic.integrationId.length > 128 ||
      !LIVE_CHANNELS.includes(topic.channel)) {
      throw new ApiSecurityError('Invalid subscription', 400, 'invalid_subscriptions');
    }
    const parsed = { integrationId: topic.integrationId, channel: topic.channel as LiveChannel };
    unique.set(topicKey(parsed), parsed);
  }
  return [...unique.values()];
}

export const authorizeLiveTopic = (topic: LiveTopic, user: ApiUser) => resolveAuthorizedIntegration({
  integrationId: topic.integrationId, user,
  expectedTypes: topic.channel === 'queue' ? ['qbittorrent', 'sabnzbd'] : ['jellyfin'],
});

const connections = new Map<string, number>();
let total = 0;
export function acquireLiveConnection(userId: string) {
  const count = connections.get(userId) || 0;
  if (count >= 8 || total >= 64) throw new ApiSecurityError('Too many live connections', 429, 'live_limit_exceeded');
  connections.set(userId, count + 1);
  total++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    total--;
    const remaining = (connections.get(userId) || 1) - 1;
    if (remaining) connections.set(userId, remaining);
    else connections.delete(userId);
  };
}
