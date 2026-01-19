import { ReactNode } from 'react';

/**
 * Field types supported by the config form builder.
 */
export type FieldType = 'input' | 'select' | 'appSettingsSelect' | 'appSettingsBooleanSelect' | 'switch' | 'toggle' | 'urlList' | 'searchableSelect' | 'custom';

/**
 * Base field definition shared by all field types.
 */
interface BaseField<T> {
  /** Config key to read/write */
  key: keyof T & string;
  /** Label displayed above the field */
  label: string;
  /** Conditional visibility based on current config state */
  condition?: (config: Partial<T>) => boolean;
}

/**
 * Text/number/password input field.
 */
export interface InputField<T> extends BaseField<T> {
  type: 'input';
  inputType?: 'text' | 'number' | 'password';
  placeholder?: string;
  min?: number;
  max?: number;
}

/**
 * Dropdown select field.
 */
export interface SelectField<T> extends BaseField<T> {
  type: 'select';
  options: Array<{ value: string; label: string }> | ((config: Partial<T>) => Array<{ value: string; label: string }>);
  fullWidth?: boolean;
}

/**
 * Searchable select field (city picker, etc).
 */
export interface SearchableSelectField<T> extends BaseField<T> {
  type: 'searchableSelect';
  options: Array<{ value: string; label: string }>;
}

/**
 * Select field with "Use App Settings" option.
 * When the user selects the app settings option (represented by 'app' in the UI),
 * the stored value is set to undefined. All other values are stored as-is.
 * 
 * This handles the common pattern: undefined = use app settings, explicit value = override.
 */
export interface AppSettingsSelectField<T> extends BaseField<T> {
  type: 'appSettingsSelect';
  /** Options to display. The first option should typically be the "Use App Settings" option with value 'app'. */
  options: Array<{ value: string; label: string }> | ((config: Partial<T>) => Array<{ value: string; label: string }>);
  /** The display value that represents "use app settings" (default: 'app'). This value maps to undefined in config. */
  appSettingsValue?: string;
  fullWidth?: boolean;
}

/**
 * Select field for boolean configs with "Use App Settings" option.
 * Maps: undefined -> appSettingsValue, true -> trueValue, false -> falseValue
 * 
 * Example: hour12 where undefined = app settings, true = 12h, false = 24h
 */
export interface AppSettingsBooleanSelectField<T> extends BaseField<T> {
  type: 'appSettingsBooleanSelect';
  /** Options to display. Must include app settings, true value, and false value options. */
  options: Array<{ value: string; label: string }>;
  /** Display value for "use app settings" (undefined in config). Default: 'app' */
  appSettingsValue?: string;
  /** Display value for true. Default: 'true' */
  trueValue?: string;
  /** Display value for false. Default: 'false' */
  falseValue?: string;
  fullWidth?: boolean;
}

/**
 * Toggle switch field.
 */
export interface SwitchField<T> extends BaseField<T> {
  type: 'switch';
  defaultValue?: boolean;
  /** If true, renders inline (row layout) */
  inline?: boolean;
}

/**
 * Toggle group (segmented control).
 */
export interface ToggleField<T> extends BaseField<T> {
  type: 'toggle';
  options: Array<{ value: string; label: string }>;
}

/**
 * Multi-URL list with add/remove buttons.
 */
export interface UrlListField<T> extends BaseField<T> {
  type: 'urlList';
  /** Label for the add button */
  addLabel?: string;
  placeholder?: string;
  /** Legacy single-value key for backward compatibility */
  legacySingleKey?: keyof T & string;
}

/**
 * Custom render function for complex fields.
 */
export interface CustomField<T> extends BaseField<T> {
  type: 'custom';
  render: (props: FieldRenderProps<T>) => ReactNode;
}

/**
 * Props passed to custom field render functions.
 */
export interface FieldRenderProps<T> {
  config: Partial<T>;
  onChange: (key: keyof T & string, value: unknown) => void;
  styles: Record<string, string>;
}

/**
 * Union of all field definition types.
 */
export type FieldDefinition<T> =
  | InputField<T>
  | SelectField<T>
  | SearchableSelectField<T>
  | AppSettingsSelectField<T>
  | AppSettingsBooleanSelectField<T>
  | SwitchField<T>
  | ToggleField<T>
  | UrlListField<T>
  | CustomField<T>;

/**
 * Section definition for grouping fields.
 */
export interface SectionDefinition<T> {
  title?: string;
  fields: FieldDefinition<T>[];
  condition?: (config: Partial<T>) => boolean;
}

/**
 * Tab definition for tabbed config forms.
 */
export interface TabDefinition<T> {
  value: string;
  label: string;
  sections?: SectionDefinition<T>[];
  fields?: FieldDefinition<T>[];
}

/**
 * Config form schema - either flat fields, sections, or tabs.
 */
export type ConfigFormSchema<T> =
  | { fields: FieldDefinition<T>[] }
  | { sections: SectionDefinition<T>[] }
  | { tabs: TabDefinition<T>[] };
