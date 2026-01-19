import { create } from 'zustand';
import { Integration, IntegrationType, IntegrationConfigMap } from '../types';

interface IntegrationState {
  integrations: Integration[];
  
  addIntegration: (integration: Integration) => void;
  removeIntegration: (id: string) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  setIntegrations: (integrations: Integration[]) => void;
  
  // Helper to get integration by ID
  getIntegration: (id: string) => Integration | undefined;
  
  // Helper to get integrations by type
  getIntegrationsByType: (type: IntegrationType) => Integration[];
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],

  addIntegration: (integration) => set((state) => ({
    integrations: [...state.integrations, integration]
  })),

  removeIntegration: (id) => set((state) => ({
    integrations: state.integrations.filter(i => i.id !== id)
  })),

  updateIntegration: (id, updates) => set((state) => ({
    integrations: state.integrations.map(i => 
      i.id === id ? { ...i, ...updates } : i
    )
  })),

  setIntegrations: (integrations) => set({ integrations }),

  getIntegration: (id) => {
    return get().integrations.find(i => i.id === id);
  },

  getIntegrationsByType: (type) => {
    return get().integrations.filter(i => i.type === type);
  },
}));

/**
 * Hook to get resolved integration config for a widget
 * Returns the integration config if an integrationId is provided, otherwise undefined
 */
export function useIntegrationConfig<T extends IntegrationType>(
  integrationId: string | undefined,
  type: T
): IntegrationConfigMap[T] | undefined {
  const integration = useIntegrationStore(
    (s) => s.integrations.find((i) => i.id === integrationId && i.type === type)
  );
  return integration?.config as IntegrationConfigMap[T] | undefined;
}
