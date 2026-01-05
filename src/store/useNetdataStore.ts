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
  subscribe: (url: string, scope?: string) => void;
  unsubscribe: (url: string, scope?: string) => void;
}

export const useNetdataStore = create<NetdataStore>((set, get) => ({
  instances: {},

  subscribe: (url: string, scope: string = 'all') => {
    const { instances } = get();
    
    // Helper to get active scopes
    const getActiveScopes = (scopes: { [key: string]: number }) => {
       const active = Object.keys(scopes).filter(k => k !== 'all');
       return active.length > 0 ? active : undefined;
    };

    if (!instances[url]) {
      // First subscriber, start polling
      const initialScopes = { [scope]: 1 };

      const intervalId = setInterval(async () => {
        // dynamic grab of latest scopes from state
        const currentInstance = get().instances[url];
        if (!currentInstance) return;
        
        const activeScopes = getActiveScopes(currentInstance.scopes);

        try {
          const res = await fetch('/api/netdata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url, 
                _t: Date.now(),
                scope: activeScopes
            }),
          });
          
          if (!res.ok) throw new Error('Failed to fetch');
          
          const data = await res.json();
          
          set((state) => ({
            instances: {
              ...state.instances,
              [url]: {
                ...state.instances[url],
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
                  [url]: {
                    ...state.instances[url],
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
            const res = await fetch('/api/netdata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  url, 
                  _t: Date.now(),
                  scope: activeScopes
              }),
            });
            
            if (!res.ok) throw new Error('Failed to fetch');
            
            const data = await res.json();
            
            set((state) => ({
              instances: {
                ...state.instances,
                [url]: {
                  ...state.instances[url],
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
                    [url]: {
                      ...state.instances[url],
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
          [url]: {
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
        const instance = state.instances[url];
        const newScopes = { ...instance.scopes };
        newScopes[scope] = (newScopes[scope] || 0) + 1;

        return {
          instances: {
            ...state.instances,
            [url]: {
              ...instance,
              subscribers: instance.subscribers + 1,
              scopes: newScopes
            }
          }
        };
      });
    }
  },

  unsubscribe: (url: string, scope: string = 'all') => {
    const { instances } = get();
    const instance = instances[url];

    if (!instance) return;

    if (instance.subscribers <= 1) {
      // Last subscriber, cleanup
      if (instance.intervalId) {
        clearInterval(instance.intervalId);
      }
      
      // Remove instance from store
      const newInstances = { ...instances };
      delete newInstances[url];
      
      set({ instances: newInstances });
    } else {
      // Decrement subscribers and update scopes
      set((state) => {
        const currentInstance = state.instances[url];
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
            [url]: {
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
