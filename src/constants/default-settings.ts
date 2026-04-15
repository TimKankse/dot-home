import { DEFAULT_BREAKPOINT_THRESHOLDS } from '@/constants/grid';
import type {
  BehaviorSettings,
  DisplaySettings,
  GeneralSettings,
  ShortcutBindings,
} from '@/types/settings';

export interface PartialGeneralSettings {
  behavior?: Partial<BehaviorSettings>;
  display?: Partial<DisplaySettings>;
  shortcuts?: Partial<ShortcutBindings>;
}

const DEFAULT_BEHAVIOR_SETTINGS: BehaviorSettings = {
  refreshInterval: 10,
  autoDetectLocation: true,
  confirmEdit: false,
  autoSave: true,
};

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  is24Hour: true,
  temperatureUnit: 'C',
  timezone: 'auto',
  city: undefined,
  dateFormat: 'DD/MM',
  language: 'en',
  location: '',
  rowHeight: undefined,
  gapSize: undefined,
  borderRadius: undefined,
  mobileBreakpointMaxWidth: DEFAULT_BREAKPOINT_THRESHOLDS.mobileMaxWidth,
  tabletBreakpointMaxWidth: DEFAULT_BREAKPOINT_THRESHOLDS.tabletMaxWidth,
};

const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = {
  toggleEdit: 'Alt+E',
  openSettings: 'Alt+,',
  addItem: 'Alt+N',
  saveChanges: 'Alt+S',
  prevPage: 'Alt+ArrowLeft',
  nextPage: 'Alt+ArrowRight',
};

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  behavior: DEFAULT_BEHAVIOR_SETTINGS,
  display: DEFAULT_DISPLAY_SETTINGS,
  shortcuts: DEFAULT_SHORTCUT_BINDINGS,
};

export const createDefaultSettings = (): GeneralSettings => ({
  behavior: { ...DEFAULT_BEHAVIOR_SETTINGS },
  display: {
    ...DEFAULT_DISPLAY_SETTINGS,
    city: DEFAULT_DISPLAY_SETTINGS.city
      ? { ...DEFAULT_DISPLAY_SETTINGS.city }
      : undefined,
  },
  shortcuts: { ...DEFAULT_SHORTCUT_BINDINGS },
});

export const mergeGeneralSettings = (
  overrides?: PartialGeneralSettings | null,
): GeneralSettings => {
  const defaults = createDefaultSettings();

  return {
    behavior: {
      ...defaults.behavior,
      ...(overrides?.behavior ?? {}),
    },
    display: {
      ...defaults.display,
      ...(overrides?.display ?? {}),
      city: overrides?.display?.city
        ? { ...overrides.display.city }
        : defaults.display.city,
    },
    shortcuts: {
      ...defaults.shortcuts,
      ...(overrides?.shortcuts ?? {}),
    },
  };
};
