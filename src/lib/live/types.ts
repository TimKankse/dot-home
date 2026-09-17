export const LIVE_CHANNELS = ['queue', 'sessions', 'libraries'] as const;
export type LiveChannel = typeof LIVE_CHANNELS[number];
export type LiveTopic = { integrationId: string; channel: LiveChannel };
export type LiveUpdate = { data?: unknown; error?: string };
export type LiveResult = { data: unknown; intervalMs: number };
export interface LiveSource {
  poll: (signal: AbortSignal) => Promise<LiveResult>;
  connect?: (publish: (data: unknown) => void, signal: AbortSignal) => void;
}
export const topicKey = (topic: LiveTopic) => JSON.stringify([topic.integrationId, topic.channel]);
