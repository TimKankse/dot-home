'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { topicKey, type LiveChannel, type LiveTopic, type LiveUpdate } from '@/lib/live/types';

type State = LiveUpdate & { loading: boolean };
type Entry = { topic: LiveTopic; state: State; listeners: Set<() => void> };
const empty: State = { loading: true };
const disabled: State = { loading: false };
const entries = new Map<string, Entry>();
let source: EventSource | undefined;
let restart: ReturnType<typeof setTimeout> | undefined;
let observingVisibility = false;

function notify(entry: Entry, state: State) {
  entry.state = state;
  entry.listeners.forEach((listener) => listener());
}

function connect() {
  source?.close();
  source = undefined;
  if (!entries.size || document.hidden) return;
  const topics = [...entries.values()].map((entry) => entry.topic);
  const params = new URLSearchParams({ topics: JSON.stringify(topics) });
  const current = new EventSource(`/api/live?${params}`);
  source = current;
  current.addEventListener('update', (event) => {
    if (source !== current) return;
    try {
      const update = JSON.parse((event as MessageEvent).data);
      const entry = entries.get(update.key);
      if (entry) notify(entry, {
        data: update.removed ? undefined : (update.data ?? entry.state.data),
        error: update.error, loading: false,
      });
    } catch { /* Ignore malformed events; a fresh snapshot follows reconnect. */ }
  });
  current.addEventListener('reset', () => {
    if (source !== current) return;
    entries.forEach((entry) => notify(entry, empty));
  });
  current.onerror = () => {
    if (source !== current) return;
    entries.forEach((entry) => notify(entry, { loading: false, error: 'Live updates disconnected; reconnecting' }));
  };
}

function scheduleConnection() {
  clearTimeout(restart);
  // Batch mounts/unmounts so a dashboard opens one stream with all topics.
  restart = setTimeout(connect, 50);
}

function onVisibilityChange() {
  source?.close();
  source = undefined;
  if (!document.hidden) scheduleConnection();
}

export function useLiveWidget<T>(integrationId: string | undefined, channel: LiveChannel, enabled = true) {
  const key = integrationId && enabled ? topicKey({ integrationId, channel }) : '';
  const subscribe = useCallback((listener: () => void) => {
    if (!key || !integrationId) return () => {};
    let entry = entries.get(key);
    if (!entry) {
      entry = { topic: { integrationId, channel }, state: empty, listeners: new Set() };
      entries.set(key, entry);
      scheduleConnection();
    }
    entry.listeners.add(listener);
    if (!observingVisibility) {
      document.addEventListener('visibilitychange', onVisibilityChange);
      observingVisibility = true;
    }
    return () => {
      entry.listeners.delete(listener);
      if (!entry.listeners.size) {
        entries.delete(key);
        scheduleConnection();
      }
      if (!entries.size) {
        source?.close();
        source = undefined;
        document.removeEventListener('visibilitychange', onVisibilityChange);
        observingVisibility = false;
      }
    };
  }, [key, integrationId, channel]);
  const getSnapshot = useCallback(() => key ? entries.get(key)?.state ?? empty : disabled, [key]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => key ? empty : disabled);
  return state as { data?: T; error?: string; loading: boolean };
}
