import { create } from 'zustand';
import { NetdataData, NetdataScopeState } from '../types';

type Subscription = { integrationId?: string; scope?: string; refreshInterval?: number };
interface InstanceState {
  data: NetdataData | null;
  loading: boolean;
  error: string | null;
  subscribers: number;
  scopes: NetdataScopeState;
  eventSource: EventSource | null;
  intervals: number[];
  connectionKey?: string;
}
interface NetdataStore {
  instances: Record<string, InstanceState>;
  subscribe: (params: Subscription) => void;
  unsubscribe: (params: Subscription) => void;
}
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const boundedInterval = (value = 2000) => Number.isFinite(value) ? Math.max(2000, Math.min(60_000, value)) : 2000;

function scheduleConnection(key: string) {
  clearTimeout(pending.get(key));
  pending.set(key, setTimeout(() => {
    pending.delete(key);
    const store = useNetdataStore;
    const instance = store.getState().instances[key];
    if (!instance) return;
    const scope = instance.scopes.all ? 'all' : Object.keys(instance.scopes).sort().join(',');
    const params = new URLSearchParams({ integrationId: key, scope, interval: String(Math.min(...instance.intervals)) });
    const connectionKey = params.toString();
    if (instance.connectionKey === connectionKey && instance.eventSource) return;
    instance.eventSource?.close();
    const eventSource = new EventSource(`/api/netdata?${connectionKey}`);
    const update = (patch: Partial<InstanceState>) => store.setState((state) => {
      const current = state.instances[key];
      if (!current || current.eventSource !== eventSource) return state;
      return { instances: { ...state.instances, [key]: { ...current, ...patch } } };
    });
    store.setState((state) => ({ instances: { ...state.instances, [key]: { ...instance, eventSource, connectionKey } } }));
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        update({ data: data.error ? null : data, loading: false, error: data.error || null });
      } catch { /* Ignore malformed upstream frames. */ }
    };
    eventSource.addEventListener('reset', () => update({ data: null, loading: true, error: null }));
    eventSource.onerror = () => update({ data: null, loading: false, error: 'Reconnecting...' });
  }, 50));
}

export const useNetdataStore = create<NetdataStore>((set, get) => ({
  instances: {},
  subscribe: ({ integrationId: key, scope = 'all', refreshInterval }) => {
    if (!key) return;
    const instance = get().instances[key] || {
      data: null, loading: true, error: null, subscribers: 0, scopes: {}, eventSource: null, intervals: [],
    };
    set({ instances: { ...get().instances, [key]: {
      ...instance, subscribers: instance.subscribers + 1,
      scopes: { ...instance.scopes, [scope]: (instance.scopes[scope] || 0) + 1 },
      intervals: [...instance.intervals, boundedInterval(refreshInterval)],
    } } });
    scheduleConnection(key);
  },
  unsubscribe: ({ integrationId: key, scope = 'all', refreshInterval }) => {
    if (!key) return;
    const instance = get().instances[key];
    if (!instance) return;
    if (instance.subscribers === 1) {
      clearTimeout(pending.get(key));
      pending.delete(key);
      instance.eventSource?.close();
      const instances = { ...get().instances };
      delete instances[key];
      set({ instances });
      return;
    }
    const scopes = { ...instance.scopes };
    if (--scopes[scope] <= 0) delete scopes[scope];
    const intervals = [...instance.intervals];
    const index = intervals.indexOf(boundedInterval(refreshInterval));
    if (index !== -1) intervals.splice(index, 1);
    set({ instances: { ...get().instances, [key]: {
      ...instance, subscribers: instance.subscribers - 1, scopes, intervals,
    } } });
    // Removing a fast or expensive widget must also reduce the upstream work.
    scheduleConnection(key);
  },
}));
