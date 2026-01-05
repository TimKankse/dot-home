import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useWidgetStore } from './useWidgetStore';
import { Widget } from '@/types/widget';
import { usePageStore, Page } from './usePageStore';
import { useIntegrationStore } from './useIntegrationStore';
import { useSettingsStore } from './useSettingsStore';

interface PersistenceState {
  isLoaded: boolean;
  isEditing: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  fetchConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  toggleEdit: () => void;
}

export const usePersistenceStore = create<PersistenceState>((set, get) => ({
  isLoaded: false,
  isEditing: false,
  saveStatus: 'idle',

  fetchConfig: async () => {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      const data = await res.json();
      
      let pages: Page[] = [];
      let widgets: Widget[] = [];
      let integrations = [];

      if (data.pages) {
        // New format
        pages = data.pages;
        widgets = data.widgets || [];
        integrations = data.integrations || [];
        
        if (data.settings) {
          // Merge with defaults to ensure all fields exist
          const currentSettings = useSettingsStore.getState().settings;
          const mergedSettings = {
            behavior: { ...currentSettings.behavior, ...data.settings.behavior },
            display: { ...currentSettings.display, ...data.settings.display },
            shortcuts: { ...currentSettings.shortcuts, ...(data.settings.shortcuts || {}) }
          };
          useSettingsStore.getState().setSettings(mergedSettings);
        }
      } else {
        // Migration from legacy format
        const legacyWidgets = data.widgets || [];
        const totalPages = data.totalPages || 1;
        
        // Create pages
        for (let i = 0; i < totalPages; i++) {
          pages.push({ id: uuidv4() });
        }

        // Map widgets to new page IDs
        widgets = legacyWidgets.map((w: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          ...w,
          pageId: pages[w.page || 0]?.id || pages[0].id,
          page: undefined // Remove legacy prop
        }));
      }

      // Sanitize widget bounds to prevent recursion errors
      // Ensure no widget exceeds the 8-row limit
      widgets = widgets.map(w => {
        const maxRows = 8;
        const { x, w: width } = w.grid;
        let { y, h: height } = w.grid;
        
        // Clamp height to max rows
        if (height > maxRows) height = maxRows;
        
        // Clamp Y position
        if (y + height > maxRows) {
           y = Math.max(0, maxRows - height);
        }
        
        return {
          ...w,
          grid: { x, y, w: width, h: height }
        };
      });

      // Update all stores
      usePageStore.setState({ 
        pages,
        scrollDirection: data.scrollDirection || 'vertical',
        defaultPageId: data.defaultPageId,
        currentPageIndex: data.defaultPageId 
          ? Math.max(0, pages.findIndex(p => p.id === data.defaultPageId)) 
          : 0
      });

      useWidgetStore.getState().setWidgets(widgets);
      useIntegrationStore.getState().setIntegrations(integrations);

      // Auto-link widgets to integrations if not already linked
      if (integrations.length > 0) {
        useIntegrationStore.getState().autoLinkWidgets();
      }

      set({ isLoaded: true });
    } catch (err) {
      console.error('Failed to load config:', err);
      usePageStore.getState().setPages([{ id: uuidv4() }]);
      set({ isLoaded: true });
    }
  },

  saveConfig: async () => {
    const { isLoaded } = get();
    if (!isLoaded) return;

    set({ saveStatus: 'saving' });

    try {
      // Gather data from all stores
      const widgets = useWidgetStore.getState().widgets;
      const { pages, scrollDirection, defaultPageId } = usePageStore.getState();
      const { integrations } = useIntegrationStore.getState();
      const { settings } = useSettingsStore.getState();

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          widgets, 
          scrollDirection, 
          pages, 
          integrations,
          settings,
          defaultPageId 
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      set({ saveStatus: 'saved' });
      setTimeout(() => set({ saveStatus: 'idle' }), 2000);
    } catch (err) {
      console.error('Failed to save config:', err);
      set({ saveStatus: 'error' });
    }
  },

  toggleEdit: () => set((state) => ({ isEditing: !state.isEditing }))
}));
