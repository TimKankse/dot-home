import { create } from 'zustand';
import { NetdataData, NetdataScopeState } from '../types';

interface InstanceState {
  data: NetdataData | null;
  loading: boolean;
  error: string | null;
  subscribers: number;
  scopes: NetdataScopeState; // scope -> reference count
  eventSource: EventSource | null;
  intervals: number[];
}

interface NetdataStore {
  instances: Record<string, InstanceState>;
  subscribe: (params: { url?: string, integrationId?: string, scope?: string, refreshInterval?: number }) => void;
  unsubscribe: (params: { url?: string, integrationId?: string, scope?: string, refreshInterval?: number }) => void;
}

export const useNetdataStore = create<NetdataStore>((set, get) => ({
  instances: {},

  subscribe: ({ url, integrationId, scope = 'all', refreshInterval = 2000 }) => {
    const { instances } = get();
    const key = integrationId || url;

    if (!key) return;
    
    // Helper to get active scopes
    const getActiveScopes = (scopes: { [key: string]: number }) => {
       const active = Object.keys(scopes).filter(k => k !== 'all');
       return active.length > 0 ? active : undefined;
    };

    // Helper to start SSE connection
    const startSSE = (instanceKey: string, intervalMs: number) => {
        const currentInstance = get().instances[instanceKey];
        if (currentInstance?.eventSource) {
            currentInstance.eventSource.close();
        }

        const activeScopes = getActiveScopes(currentInstance?.scopes || { [scope]: 1 });
        const scopeParam = activeScopes ? activeScopes.join(',') : 'all';
        
        // Build SSE URL
        const params = new URLSearchParams({
            interval: intervalMs.toString(),
            scope: scopeParam,
        });
        
        if (integrationId) {
            params.set('integrationId', integrationId);
        } else if (url) {
            // Direct URL mode - pass URL as query param
            params.set('url', url);
        }
        
        const eventSource = new EventSource(`/api/netdata?${params.toString()}`);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                set((state) => ({
                    instances: {
                        ...state.instances,
                        [instanceKey]: {
                            ...state.instances[instanceKey],
                            data,
                            loading: false,
                            error: data.error || null,
                        }
                    }
                }));
            } catch (e) {
                console.error('Failed to parse SSE data:', e);
            }
        };
        
        eventSource.onerror = () => {
            set((state) => ({
                instances: {
                    ...state.instances,
                    [instanceKey]: {
                        ...state.instances[instanceKey],
                        error: 'Connection lost',
                        loading: false
                    }
                }
            }));
            
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                const instance = get().instances[instanceKey];
                if (instance && instance.subscribers > 0) {
                    const minInterval = Math.min(...instance.intervals);
                    startSSE(instanceKey, minInterval);
                }
            }, 5000);
        };

        return eventSource;
    };


    if (!instances[key]) {
      // First subscriber
      const initialScopes = { [scope]: 1 };
      const initialIntervals = [refreshInterval];

      set((state) => ({
        instances: {
          ...state.instances,
          [key]: {
            data: null,
            loading: true,
            error: null,
            subscribers: 1,
            scopes: initialScopes,
            eventSource: null,
            intervals: initialIntervals
          }
        }
      }));

      // Start SSE after state is set
      const eventSource = startSSE(key, refreshInterval);
      
      set((state) => ({
        instances: {
          ...state.instances,
          [key]: {
            ...state.instances[key],
            eventSource
          }
        }
      }));
    } else {
      // Already exists
      set((state) => {
        const instance = state.instances[key];
        const newScopes = { ...instance.scopes };
        newScopes[scope] = (newScopes[scope] || 0) + 1;
        
        const newIntervals = [...instance.intervals, refreshInterval];
        const newMinInterval = Math.min(...newIntervals);
        const currentMinInterval = Math.min(...instance.intervals);

        return {
          instances: {
            ...state.instances,
            [key]: {
              ...instance,
              subscribers: instance.subscribers + 1,
              scopes: newScopes,
              intervals: newIntervals,
            }
          }
        };
      });
      
      // Check if we need to restart SSE (new scope or faster interval)
      const instance = get().instances[key];
      const newMinInterval = Math.min(...instance.intervals);
      const currentMinInterval = instance.intervals.length > 1 
          ? Math.min(...instance.intervals.slice(0, -1)) 
          : instance.intervals[0];
      
      // Check if this is a new scope that wasn't previously subscribed
      const previousScopes = Object.keys(instances[key].scopes);
      const isNewScope = !previousScopes.includes(scope);
          
      if (newMinInterval < currentMinInterval || isNewScope) {
          if (instance.eventSource) {
              instance.eventSource.close();
          }
          const eventSource = startSSE(key, newMinInterval);
          set((state) => ({
            instances: {
              ...state.instances,
              [key]: {
                ...state.instances[key],
                eventSource
              }
            }
          }));
      }
    }
  },

  unsubscribe: ({ url, integrationId, scope = 'all', refreshInterval = 2000 }) => {
    const { instances } = get();
    const key = integrationId || url;
    if (!key) return;

    const instance = instances[key];
    if (!instance) return;

    if (instance.subscribers <= 1) {
      // Last subscriber, cleanup
      if (instance.eventSource) {
        instance.eventSource.close();
      }
      
      const newInstances = { ...instances };
      delete newInstances[key];
      
      set({ instances: newInstances });
    } else {
      set((state) => {
        const currentInstance = state.instances[key];
        const newScopes = { ...currentInstance.scopes };
        
        if (newScopes[scope]) {
            newScopes[scope] -= 1;
            if (newScopes[scope] <= 0) {
                delete newScopes[scope];
            }
        }

        // Remove one instance of this interval
        const intervalIndex = currentInstance.intervals.indexOf(refreshInterval);
        const newIntervals = [...currentInstance.intervals];
        if (intervalIndex > -1) {
            newIntervals.splice(intervalIndex, 1);
        }

        return {
            instances: {
                ...state.instances,
                [key]: {
                    ...currentInstance,
                    subscribers: currentInstance.subscribers - 1,
                    scopes: newScopes,
                    intervals: newIntervals,
                }
            }
        };
      });
    }
  }
}));
