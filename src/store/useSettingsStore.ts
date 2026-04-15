import { create } from 'zustand';
import { GeneralSettings } from '../types';
import {
  createDefaultSettings,
  mergeGeneralSettings,
} from '@/constants/default-settings';

interface SettingsState {
  settings: GeneralSettings;
  
  updateSettings: (settings: Partial<GeneralSettings['behavior'] | GeneralSettings['display'] | GeneralSettings['shortcuts']>, section: 'behavior' | 'display' | 'shortcuts') => void;
  updateBehavior: (updates: Partial<GeneralSettings['behavior']>) => void;
  updateDisplay: (updates: Partial<GeneralSettings['display']>) => void;
  updateShortcuts: (updates: Partial<GeneralSettings['shortcuts']>) => void;
  resetSettings: () => void;
  setSettings: (settings: GeneralSettings) => void;
}

const defaultSettings: GeneralSettings = createDefaultSettings();

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

  resetSettings: () => set({ settings: createDefaultSettings() }),

  setSettings: (settings) => set({ settings: mergeGeneralSettings(settings) })
}));
