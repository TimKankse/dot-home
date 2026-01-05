import { create } from 'zustand';
import { useWidgetStore } from './useWidgetStore';
import { Integration } from '../types';

interface IntegrationState {
  integrations: Integration[];
  
  addIntegration: (integration: Integration) => void;
  removeIntegration: (id: string) => void;
  updateIntegration: (id: string, updates: Partial<Integration>) => void;
  setIntegrations: (integrations: Integration[]) => void;
  autoLinkWidgets: () => void;
}

export const useIntegrationStore = create<IntegrationState>((set, get) => ({
  integrations: [],

  addIntegration: (integration) => set((state) => ({
    integrations: [...state.integrations, integration]
  })),

  removeIntegration: (id) => set((state) => {
    // Unlink widgets before removing integration
    const widgets = useWidgetStore.getState().widgets;
    widgets.forEach(widget => {
      if (widget.integrationId === id) {
        useWidgetStore.getState().updateWidget(widget.id, { integrationId: undefined });
      }
    });

    return {
      integrations: state.integrations.filter(i => i.id !== id)
    };
  }),

  updateIntegration: (id, updates) => set((state) => {
    // 1. Update the integration itself
    const newIntegrations = state.integrations.map(i => 
      i.id === id ? { ...i, ...updates } : i
    );

    // 2. Find the updated integration object
    const updatedIntegration = newIntegrations.find(i => i.id === id);
    
    // 3. If we have the updated integration, propagate changes to linked widgets
    if (updatedIntegration) {
      const widgets = useWidgetStore.getState().widgets;
      
      widgets.forEach(widget => {
        if (widget.integrationId === id) {
          // Merge updates
          const newConfig = { ...widget.config };
          
          // 1. URL & Internal URL
          let updatedUrl = widget.url;
          let updatedInternalUrl = widget.internalUrl;

          if (widget.type === 'shortcut') {
             // For Shortcuts:
             // url -> External URL (preferred) or Internal URL
             // internalUrl -> Internal URL (config.url)
             
             if (updatedIntegration.config.externalUrl) {
               updatedUrl = updatedIntegration.config.externalUrl;
             } else if (updatedIntegration.config.url) {
               updatedUrl = updatedIntegration.config.url;
             }

             if (updatedIntegration.config.url) {
               updatedInternalUrl = updatedIntegration.config.url;
             }
          } else {
             // For Widgets:
             // url -> External URL (preferred) or Internal URL (config.url)
             if (updatedIntegration.config.externalUrl) {
               updatedUrl = updatedIntegration.config.externalUrl;
             } else if (updatedIntegration.config.url) {
               updatedUrl = updatedIntegration.config.url;
             }
          }

          // 2. Config fields
          // We iterate over the integration config and update matching fields in widget config
          if (updatedIntegration.config) {
             Object.entries(updatedIntegration.config).forEach(([key, value]) => {
               // Map integration config keys to widget config keys
                 if (key === 'url') {
                 if (newConfig) newConfig.url = value as string;
               } else if (key === 'externalUrl') {
                 // No-op for config object usually
               } else if (key === 'apiKey') {
                 if (newConfig) newConfig.apiKey = value as string;
               } else if (key === 'feedUrl') {
                 if (newConfig) newConfig.feedUrl = value as string; // RSS
               } else {
                 // Direct mapping for custom fields and other matching keys
                 if (newConfig) newConfig[key] = value;
               }
             });
          }

          useWidgetStore.getState().updateWidget(widget.id, {
            url: updatedUrl,
            internalUrl: updatedInternalUrl,
            config: newConfig
          });
        }
      });
    }

    return {
      integrations: newIntegrations
    };
  }),

  setIntegrations: (integrations) => set({ integrations }),

  autoLinkWidgets: () => {
    const { integrations } = get();
    const widgets = useWidgetStore.getState().widgets;
    
    if (integrations.length === 0) return;

    widgets.forEach(widget => {
      if (widget.integrationId) return; // Already linked

      // Try to find a matching integration
      // 1. Match by URL (strongest signal)
      // 2. Match by Type + some other config (weaker)
      
      let matchedIntegration: Integration | undefined;

      // Check URL match
      const widgetUrl = widget.url || widget.internalUrl || (widget.config?.url as string);
      if (widgetUrl) {
        // Normalize URL for comparison (remove trailing slash)
        const normalize = (u: string) => u.replace(/\/$/, '').toLowerCase();
        const target = normalize(widgetUrl);

        matchedIntegration = integrations.find(i => {
          const iUrl = i.config.url ? normalize(i.config.url) : '';
          const iExtUrl = i.config.externalUrl ? normalize(i.config.externalUrl) : '';
          return iUrl === target || iExtUrl === target;
        });
      }

      // If no URL match, check for Type match if it's a specific widget type (not shortcut)
      if (!matchedIntegration && widget.type !== 'shortcut') {
         // Only if there is exactly one integration of this type to avoid ambiguity
         const typeIntegrations = integrations.filter(i => i.type === widget.type || i.type === widget.widgetType);
         if (typeIntegrations.length === 1) {
           matchedIntegration = typeIntegrations[0];
         }
      }

      if (matchedIntegration) {
        useWidgetStore.getState().updateWidget(widget.id, {
          integrationId: matchedIntegration.id
        });
      }
    });
  }
}));
