import { create } from 'zustand';
import { NetdataData, NetdataScopeState } from '../types';

interface InstanceState {
  data: NetdataData | null;
  loading: boolean;
  error: string | null;
  subscribers: number;
  scopes: NetdataScopeState; // scope -> reference count
  intervalId: NodeJS.Timeout | null;
}



interface NetdataStore {
  instances: Record<string, InstanceState>;
  subscribe: (params: { url?: string, integrationId?: string, scope?: string }) => void;
  unsubscribe: (params: { url?: string, integrationId?: string, scope?: string }) => void;
}

export const useNetdataStore = create<NetdataStore>((set, get) => ({
  instances: {},

  subscribe: ({ url, integrationId, scope = 'all' }) => {
    const { instances } = get();
    const key = integrationId || url;

    if (!key) return;
    
    // Helper to get active scopes
    const getActiveScopes = (scopes: { [key: string]: number }) => {
       const active = Object.keys(scopes).filter(k => k !== 'all');
       return active.length > 0 ? active : undefined;
    };

    if (!instances[key]) {
      // First subscriber, start polling
      const initialScopes = { [scope]: 1 };

      const intervalId = setInterval(async () => {
        // dynamic grab of latest scopes from state
        const currentInstance = get().instances[key];
        if (!currentInstance) return;
        
        const activeScopes = getActiveScopes(currentInstance.scopes);

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
      }, 2000);

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

      set((state) => ({
        instances: {
          ...state.instances,
          [key]: {
            data: null,
            loading: true,
            error: null,
            subscribers: 1,
            scopes: initialScopes,
            intervalId
          }
        }
      }));
    } else {
      // Already exists, increment subscribers and update scopes
      set((state) => {
        const instance = state.instances[key];
        const newScopes = { ...instance.scopes };
        newScopes[scope] = (newScopes[scope] || 0) + 1;

        return {
          instances: {
            ...state.instances,
            [key]: {
              ...instance,
              subscribers: instance.subscribers + 1,
              scopes: newScopes
            }
          }
        };
      });
    }
  },

  unsubscribe: ({ url, integrationId, scope = 'all' }) => {
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
      
      // Remove instance from store
      const newInstances = { ...instances };
      delete newInstances[key];
      
      set({ instances: newInstances });
    } else {
      // Decrement subscribers and update scopes
      set((state) => {
        const currentInstance = state.instances[key];
        const newScopes = { ...currentInstance.scopes };
        
        if (newScopes[scope]) {
            newScopes[scope] -= 1;
            if (newScopes[scope] <= 0) {
                delete newScopes[scope];
            }
        }

        return {
            instances: {
            ...state.instances,
            [key]: {
                ...currentInstance,
                subscribers: currentInstance.subscribers - 1,
                scopes: newScopes
            }
            }
        };
      });
    }
  }
}));
