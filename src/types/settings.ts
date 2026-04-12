export interface BehaviorSettings {
  refreshInterval: number; // in minutes
  autoDetectLocation: boolean;
}

export interface CityData {
  name: string;           // "Stockholm"
  country: string;        // "Sweden"
  admin1?: string;        // State/region (optional)
  timezone: string;       // "Europe/Stockholm"
  latitude: number;
  longitude: number;
  abbreviation?: string;  // "STO" (optional, can be derived)
}

export interface DisplaySettings {
  is24Hour: boolean;
  temperatureUnit: 'C' | 'F';
  timezone: string;
  city?: CityData;        // Structured city data for weather, location display, etc.
  rowHeight?: number;
  gapSize?: number;
  borderRadius?: number;
  mobileBreakpointMaxWidth?: number;
  tabletBreakpointMaxWidth?: number;
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
