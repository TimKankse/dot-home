import { create } from 'zustand';
import { useWidgetStore } from './useWidgetStore';
import { usePageStore, Page } from './usePageStore';
import { useIntegrationStore } from './useIntegrationStore';
import { useSettingsStore } from './useSettingsStore';
import {
  clampWidgetsToMaxRows,
  parseStoredDashboardLayout,
} from '@/lib/dashboard-layout';

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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load dashboard configuration');
      }

      const layout = parseStoredDashboardLayout(data);
      const widgets = clampWidgetsToMaxRows(layout.widgets, 8);
      const pages = layout.pages as Page[];
      const integrations = Array.isArray(data.integrations) ? data.integrations : [];

      // Update all stores
      usePageStore.setState({ 
        pages,
        scrollDirection: layout.scrollDirection,
        defaultPageId: layout.defaultPageId,
        currentPageIndex: layout.defaultPageId 
          ? Math.max(0, pages.findIndex(p => p.id === layout.defaultPageId)) 
          : 0
      });

      useWidgetStore.getState().setDashboardState(widgets, layout.responsiveLayouts);
      useIntegrationStore.getState().setIntegrations(integrations);
      useSettingsStore.getState().setSettings(layout.settings);

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
      const widgets = [...useWidgetStore.getState().widgets];
      const responsiveLayouts = useWidgetStore.getState().responsiveLayouts;
      const { pages, scrollDirection, defaultPageId } = usePageStore.getState();
      const { settings } = useSettingsStore.getState();
      const layout = parseStoredDashboardLayout({
        widgets,
        responsiveLayouts,
        pages,
        scrollDirection,
        defaultPageId,
        settings,
      });

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...layout,
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
