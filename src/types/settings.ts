export interface BehaviorSettings {
  confirmEdit: boolean;
  autoSave: boolean;
  refreshInterval: number; // in minutes
  autoDetectLocation: boolean;
}

export interface DisplaySettings {
  is24Hour: boolean;
  temperatureUnit: 'C' | 'F';
  dateFormat: 'MM/DD' | 'DD/MM' | 'YYYY-MM-DD';
  language: string;
  timezone: string;
  location: string;
}

export interface ShortcutBindings {
  toggleEdit: string;
  openSettings: string;
  addItem: string;
  saveChanges: string;
  prevPage: string;
  nextPage: string;
}

export interface GeneralSettings {
  behavior: BehaviorSettings;
  display: DisplaySettings;
  shortcuts: ShortcutBindings;
}
