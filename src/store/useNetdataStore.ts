import { create } from 'zustand';
import { NetdataData, NetdataScopeState } from '../types';

interface InstanceState {
  data: NetdataData | null;
  loading: boolean;
  error: string | null;
  subscribers: number;
  scopes: NetdataScopeState; // scope -> reference count
  intervalId: NodeJS.Timeout | null;
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

    // Helper to start/restart polling with specific interval
    const startPolling = (instanceKey: string, intervalMs: number) => {
        const currentInstance = get().instances[instanceKey];
        if (currentInstance?.intervalId) {
            clearInterval(currentInstance.intervalId);
        }

        const intervalId = setInterval(async () => {
            const instance = get().instances[instanceKey];
            if (!instance) return;
            
            const activeScopes = getActiveScopes(instance.scopes);

            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (integrationId) headers['x-integration-id'] = integrationId;

                const res = await fetch('/api/netdata', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ 
                        url: integrationId ? undefined : url, 
                        _t: Date.now(),
                        scope: activeScopes
                    }),
                });
                
                if (!res.ok) throw new Error('Failed to fetch');
                
                const data = await res.json();
                
                set((state) => ({
                    instances: {
                        ...state.instances,
                        [instanceKey]: {
                            ...state.instances[instanceKey],
                            data,
                            loading: false,
                            error: null,
                        }
                    }
                }));
            } catch (err) {
                console.error(err);
                set((state) => ({
                    instances: {
                        ...state.instances,
                        [instanceKey]: {
                            ...state.instances[instanceKey],
                            error: 'Failed to fetch',
                            loading: false
                        }
                    }
                }));
            }
        }, intervalMs);

        return intervalId;
    };


    if (!instances[key]) {
      // First subscriber
      const initialScopes = { [scope]: 1 };
      const initialIntervals = [refreshInterval];

      // Initial fetch immediately
      (async () => {
        const activeScopes = getActiveScopes(initialScopes);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (integrationId) headers['x-integration-id'] = integrationId;

            const res = await fetch('/api/netdata', {
              method: 'POST',
              headers,
              body: JSON.stringify({ 
                  url: integrationId ? undefined : url, 
                  _t: Date.now(),
                  scope: activeScopes
              }),
            });
            
            if (!res.ok) throw new Error('Failed to fetch');
            
            const data = await res.json();
            
            set((state) => ({
              instances: {
                ...state.instances,
                [key]: {
                  ...state.instances[key],
                  data,
                  loading: false,
                  error: null,
                }
              }
            }));
          } catch (err) {
              console.error(err);
              set((state) => ({
                  instances: {
                    ...state.instances,
                    [key]: {
                      ...state.instances[key],
                      error: 'Failed to fetch',
                      loading: false
                    }
                  }
                }));
          }
      })();

      const intervalId = startPolling(key, refreshInterval);

      set((state) => ({
        instances: {
          ...state.instances,
          [key]: {
            data: null,
            loading: true,
            error: null,
            subscribers: 1,
            scopes: initialScopes,
            intervalId,
            intervals: initialIntervals
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

        let newIntervalId = instance.intervalId;
        if (newMinInterval < currentMinInterval) {
            // We need to speed up!
            newIntervalId = startPolling(key, newMinInterval);
        }

        return {
          instances: {
            ...state.instances,
            [key]: {
              ...instance,
              subscribers: instance.subscribers + 1,
              scopes: newScopes,
              intervals: newIntervals,
              intervalId: newIntervalId
            }
          }
        };
      });
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
      if (instance.intervalId) {
        clearInterval(instance.intervalId);
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
        } else {
            // Fallback just in case (e.g. default changed), remove the largest or just ignore?
            // Safest: don't remove if not found, but we should find it.
        }
        
        const oldMin = Math.min(...currentInstance.intervals);
        const newMin = newIntervals.length > 0 ? Math.min(...newIntervals) : 2000;
        
        let newIntervalId = currentInstance.intervalId;

        // Only restart if the *active* interval needs to change (i.e., we were the bottleneck)
        // Note: startPolling is defined inside subscribe... we need to access it or duplicate it.
        // Actually, since this is 'create', we can't easily access the closure function 'startPolling' from subscribe.
        // We should move 'startPolling' to be a helper outside or on the store, but store methods can't easily be private.
        // EASIER FIX: Duplicate the restart logic here or restructure.
        // Better: We can't duplicate startPolling easily because it needs 'get()' and 'set()'.
        // But we are inside the store definition so we can access `get` and `set`.
        // I'll inline the restart logic.

        // WARNING: Duplicate logic for polling.
        // Refactoring: Let's defer strict interval slowing down for now to keep it simple?
        // NO, the user wants configurability. If I have a 1s widget and I close it, I want the remaining 10s widgets to go back to 10s.
        
        // I will define startPolling as a standalone function inside the create callback scope (wait, I can't easily do that across methods in the object literal).
        // I'll just check if I need to restart.
        
        if (newMin !== oldMin && newIntervals.length > 0) {
             if (currentInstance.intervalId) clearInterval(currentInstance.intervalId);
             
             // ... Code to restart polling ...
             // Since I can't easily share the function without significant refactor, I will just paste the setInterval logic again.
             // It's not ideal D.R.Y. but it works cleanly for this specific file size.
             
             newIntervalId = setInterval(async () => {
                const liveInstance = get().instances[key];
                if (!liveInstance) return;
                
                // ... fetch logic ...
                // Re-implementing simplified fetch logic that relies on `activeScopes` helper
                 const getActiveScopes = (scopes: { [key: string]: number }) => {
                    const active = Object.keys(scopes).filter(k => k !== 'all');
                    return active.length > 0 ? active : undefined;
                 };
                 const activeScopes = getActiveScopes(liveInstance.scopes);

                 try {
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (integrationId) headers['x-integration-id'] = integrationId;
    
                    const res = await fetch('/api/netdata', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ 
                            url: integrationId ? undefined : url, 
                            _t: Date.now(),
                            scope: activeScopes
                        }),
                    });
                    
                    if (!res.ok) throw new Error('Failed to fetch');
                    const data = await res.json();
                    
                    set((s) => ({
                        instances: {
                            ...s.instances,
                            [key]: {
                                ...s.instances[key],
                                data,
                                loading: false,
                                error: null,
                            }
                        }
                    }));
                 } catch (err) {
                    set((s) => ({
                        instances: {
                            ...s.instances,
                            [key]: {
                                ...s.instances[key],
                                error: 'Failed to fetch',
                            }
                        }
                    }));
                 }
             }, newMin);
        }

        return {
            instances: {
            ...state.instances,
            [key]: {
                ...currentInstance,
                subscribers: currentInstance.subscribers - 1,
                scopes: newScopes,
                intervals: newIntervals,
                intervalId: newIntervalId
            }
            }
        };
      });
    }
  }
}));
