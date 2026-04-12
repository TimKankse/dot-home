import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { useWidgetStore } from './useWidgetStore';
import { ResponsiveLayouts, Widget } from '@/types/widget';
import { usePageStore, Page } from './usePageStore';
import { useIntegrationStore } from './useIntegrationStore';
import { useSettingsStore } from './useSettingsStore';
import { normalizeResponsiveLayouts } from '@/utils/gridUtils';

interface PersistenceState {
  isLoaded: boolean;
  isEditing: boolean;
  canEditDashboard: boolean;
  dashboardId: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  fetchConfig: (dashboardId?: string) => Promise<void>;
  saveConfig: () => Promise<void>;
  toggleEdit: () => void;
  loadDashboard: (id: string) => Promise<void>;
}

export const usePersistenceStore = create<PersistenceState>((set, get) => ({
  isLoaded: false,
  isEditing: false,
  canEditDashboard: true, // Default to true, will be updated on config fetch
  dashboardId: null,
  saveStatus: 'idle',

  fetchConfig: async (targetDashboardId?: string) => {
    try {
      const url = targetDashboardId 
        ? `/api/config?dashboardId=${targetDashboardId}`
        : '/api/config';
        
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      
      let pages: Page[] = [];
      let widgets: Widget[] = [];
      let responsiveLayouts: ResponsiveLayouts = {};
      let integrations = [];

      if (data.pages) {
        // New format
        pages = data.pages;
        widgets = data.widgets || [];
        responsiveLayouts = normalizeResponsiveLayouts(data.responsiveLayouts);
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
        widgets = legacyWidgets.map((w: Widget & { page?: number }) => ({
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

      // SAFEGUARD: Ensure pages array is consistent with widget pageIds
      // This prevents data corruption where pages array doesn't match widget references
      const existingPageIds = new Set(pages.map(p => p.id));
      const widgetPageIds = new Set(widgets.map(w => w.pageId).filter(Boolean));
      
      // Find pageIds referenced by widgets but missing from pages array
      const missingPageIds = [...widgetPageIds].filter(pid => !existingPageIds.has(pid));
      
      if (missingPageIds.length > 0) {
        console.warn(`[usePersistenceStore] Reconstructing ${missingPageIds.length} missing pages from widget references`);
        // Add missing pages to the pages array
        for (const pid of missingPageIds) {
          pages.push({ id: pid });
        }
      }
      
      // Ensure at least one page exists
      if (pages.length === 0) {
        pages.push({ id: uuidv4() });
      }
      
      // Fix widgets with null/undefined pageId - assign to first page
      const firstPageId = pages[0].id;
      widgets = widgets.map(w => {
        if (!w.pageId) {
          console.warn(`[usePersistenceStore] Widget "${w.name || w.id}" has no pageId, assigning to first page`);
          return { ...w, pageId: firstPageId };
        }
        return w;
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

      useWidgetStore.getState().setDashboardState(widgets, responsiveLayouts);
      useIntegrationStore.getState().setIntegrations(integrations);

      // Set edit permission from API response (default to true for owned dashboards)
      const canEditDashboard = data.canEditDashboard ?? true;

      set({ isLoaded: true, canEditDashboard, dashboardId: data.dashboardId });
    } catch (err) {
      console.error('Failed to load config:', err);
      // Do NOT set isLoaded: true, to prevent auto-save from overwriting valid data with empty state
      set({ saveStatus: 'error' });
      alert('Failed to load dashboard configuration. Auto-save disabled to protect data. Please refresh.');
    }
  },

  loadDashboard: async (id: string) => {
    return get().fetchConfig(id);
  },

  saveConfig: async () => {
    const { isLoaded } = get();
    if (!isLoaded) return;

    set({ saveStatus: 'saving' });

    try {
      // Gather data from all stores
      let widgets = [...useWidgetStore.getState().widgets];
      const responsiveLayouts = useWidgetStore.getState().responsiveLayouts;
      let { pages } = usePageStore.getState();
      const { scrollDirection, defaultPageId } = usePageStore.getState();
      const { integrations } = useIntegrationStore.getState();
      const { settings } = useSettingsStore.getState();

      // SAFEGUARD: Validate pages array matches widget pageIds before saving
      const existingPageIds = new Set(pages.map(p => p.id));
      const widgetPageIds = new Set(widgets.map(w => w.pageId).filter(Boolean));
      
      // Find pageIds referenced by widgets but missing from pages array
      const missingPageIds = [...widgetPageIds].filter(pid => !existingPageIds.has(pid));
      
      if (missingPageIds.length > 0) {
        console.warn(`[usePersistenceStore:save] Found ${missingPageIds.length} missing pages, reconstructing...`);
        // Add missing pages
        const updatedPages = [...pages, ...missingPageIds.map(id => ({ id }))];
        pages = updatedPages;
        // Also update the store to keep it in sync
        usePageStore.setState({ pages: updatedPages });
      }
      
      // Fix widgets with null/undefined pageId
      if (pages.length > 0) {
        const firstPageId = pages[0].id;
        widgets = widgets.map(w => {
          if (!w.pageId) {
            console.warn(`[usePersistenceStore:save] Widget "${w.name || w.id}" has no pageId, assigning to first page`);
            return { ...w, pageId: firstPageId };
          }
          return w;
        });
        // Update widget store if we made changes
        const hasNullPageIds = useWidgetStore.getState().widgets.some(w => !w.pageId);
        if (hasNullPageIds) {
          useWidgetStore.getState().setWidgets(widgets);
        }
      }

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          widgets, 
          responsiveLayouts,
          scrollDirection, 
          pages, 
          integrations,
          settings,
          defaultPageId,
          dashboardId: get().dashboardId
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
