import { create } from 'zustand';
import { GeneralSettings } from '../types';

interface SettingsState {
  settings: GeneralSettings;
  
  updateSettings: (settings: Partial<GeneralSettings['behavior'] | GeneralSettings['display'] | GeneralSettings['shortcuts']>, section: 'behavior' | 'display' | 'shortcuts') => void;
  updateBehavior: (updates: Partial<GeneralSettings['behavior']>) => void;
  updateDisplay: (updates: Partial<GeneralSettings['display']>) => void;
  updateShortcuts: (updates: Partial<GeneralSettings['shortcuts']>) => void;
  resetSettings: () => void;
  setSettings: (settings: GeneralSettings) => void;
}

const defaultSettings: GeneralSettings = {
  behavior: {
    confirmEdit: false,
    autoSave: true,
    refreshInterval: 10,
    autoDetectLocation: false
  },
  display: {
    is24Hour: true,
    temperatureUnit: 'C',
    dateFormat: 'DD/MM',
    language: 'en',
    timezone: 'UTC',
    location: ''
  },
  shortcuts: {
    toggleEdit: 'Mod+E',
    openSettings: 'Mod+,',
    addItem: 'Mod+K',
    saveChanges: 'Mod+S',
    prevPage: 'Alt+ArrowLeft',
    nextPage: 'Alt+ArrowRight'
  }
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,

  updateSettings: (updates, section) => set((state) => ({
    settings: {
      ...state.settings,
      [section]: {
        ...state.settings[section],
        ...updates
      }
    }
  })),

  updateBehavior: (updates) => set((state) => ({
    settings: {
      ...state.settings,
      behavior: {
        ...state.settings.behavior,
        ...updates
      }
    }
  })),

  updateDisplay: (updates) => set((state) => ({
    settings: {
      ...state.settings,
      display: {
        ...state.settings.display,
        ...updates
      }
    }
  })),

  updateShortcuts: (updates) => set((state) => ({
    settings: {
      ...state.settings,
      shortcuts: {
        ...state.settings.shortcuts,
        ...updates
      }
    }
  })),

  resetSettings: () => set({ settings: defaultSettings }),

  setSettings: (settings) => set({ settings })
}));
