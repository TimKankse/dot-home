'use client';

import React from 'react';
import type { WidgetConfigValue } from '@/components/item-editor/forms/types';
import { Input } from '@/components/primitives/input';
import { Select } from '@/components/primitives/select';
import { SearchableSelect } from '@/components/primitives/searchable-select';
import { Switch } from '@/components/primitives/switch';
import { ToggleGroup } from '@/components/primitives/toggle-group';
import { Button } from '@/components/primitives/button';
import { IconButton } from '@/components/primitives/icon-button';
import { X, Plus } from 'lucide-react';
import type {
  FieldDefinition,
  InputField,
  SelectField,
  SearchableSelectField,
  AppSettingsSelectField,
  AppSettingsBooleanSelectField,
  SwitchField,
  ToggleField,
  UrlListField,
  CustomField,
} from './types';

interface FieldRendererProps<T> {
  field: FieldDefinition<T>;
  config: Partial<T>;
  onChange: (key: string, value: WidgetConfigValue) => void;
  styles: Record<string, string>;
}

/**
 * Renders an input field (text, number, password).
 */
function renderInputField<T>(
  field: InputField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  
  return (
    <div className={styles.formGroup} key={field.key}>
      <label className={styles.label}>{field.label}</label>
      <Input
        type={field.inputType || 'text'}
        value={value !== undefined ? String(value) : ''}
        onChange={(e) => {
          const newValue = field.inputType === 'number'
            ? (e.target.value ? Number(e.target.value) : undefined)
            : (e.target.value || undefined);
          onChange(field.key, newValue);
        }}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
      />
    </div>
  );
}

/**
 * Renders a dropdown select field.
 */
function renderSelectField<T>(
  field: SelectField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  const options = typeof field.options === 'function' 
    ? field.options(config) 
    : field.options;
  
  return (
    <div className={styles.formGroup} key={field.key}>
      <label className={styles.label}>{field.label}</label>
      <Select
        options={options}
        value={value !== undefined ? String(value) : ''}
        onChange={(val) => onChange(field.key, val || undefined)}
        className={field.fullWidth ? styles.fullWidthSelect : undefined}
      />
    </div>
  );
}

/**
 * Renders a searchable select field.
 */
function renderSearchableSelectField<T>(
  field: SearchableSelectField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  
  return (
    <div className={styles.formGroup} key={field.key}>
      <label className={styles.label}>{field.label}</label>
      <SearchableSelect
        options={field.options}
        value={value !== undefined ? String(value) : ''}
        onChange={(val) => onChange(field.key, val || undefined)}
      />
    </div>
  );
}

/**
 * Renders a select field with "Use App Settings" support.
 * Maps 'app' (or custom appSettingsValue) to undefined in the config.
 */
function renderAppSettingsSelectField<T>(
  field: AppSettingsSelectField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  const appSettingsValue = field.appSettingsValue || 'app';
  const options = typeof field.options === 'function' 
    ? field.options(config) 
    : field.options;
  
  // Map undefined config value to the app settings display value
  const displayValue = value === undefined ? appSettingsValue : String(value);
  
  const handleChange = (selectedValue: string) => {
    // Map app settings display value back to undefined
    if (selectedValue === appSettingsValue) {
      onChange(field.key, undefined);
    } else {
      onChange(field.key, selectedValue || undefined);
    }
  };
  
  return (
    <div className={styles.formGroup} key={field.key}>
      <label className={styles.label}>{field.label}</label>
      <Select
        options={options}
        value={displayValue}
        onChange={handleChange}
        className={field.fullWidth ? styles.fullWidthSelect : undefined}
      />
    </div>
  );
}

/**
 * Renders a select field for boolean config with "Use App Settings" support.
 * Maps: undefined <-> appSettingsValue, true <-> trueValue, false <-> falseValue
 */
function renderAppSettingsBooleanSelectField<T>(
  field: AppSettingsBooleanSelectField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  const appSettingsValue = field.appSettingsValue || 'app';
  const trueValue = field.trueValue || 'true';
  const falseValue = field.falseValue || 'false';
  
  // Map config value to display value
  let displayValue: string;
  if (value === undefined) {
    displayValue = appSettingsValue;
  } else if (value === true) {
    displayValue = trueValue;
  } else {
    displayValue = falseValue;
  }
  
  const handleChange = (selectedValue: string) => {
    if (selectedValue === appSettingsValue) {
      onChange(field.key, undefined);
    } else if (selectedValue === trueValue) {
      onChange(field.key, true);
    } else {
      onChange(field.key, false);
    }
  };
  
  return (
    <div className={styles.formGroup} key={field.key}>
      <label className={styles.label}>{field.label}</label>
      <Select
        options={field.options}
        value={displayValue}
        onChange={handleChange}
        className={field.fullWidth ? styles.fullWidthSelect : undefined}
      />
    </div>
  );
}

/**
 * Renders a toggle switch field.
 */
function renderSwitchField<T>(
  field: SwitchField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  const checked = value !== undefined ? Boolean(value) : (field.defaultValue ?? false);
  
  if (field.inline) {
    return (
      <div 
        className={styles.formGroup} 
        key={field.key}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <label className={styles.label} style={{ marginBottom: 0 }}>{field.label}</label>
        <Switch
          checked={checked}
          onCheckedChange={(val) => onChange(field.key, val)}
        />
      </div>
    );
  }
  
  return (
    <div className={styles.formGroup} key={field.key}>
      <Switch
        label={field.label}
        checked={checked}
        onCheckedChange={(val) => onChange(field.key, val)}
      />
    </div>
  );
}

/**
 * Renders a toggle group (segmented control).
 */
function renderToggleField<T>(
  field: ToggleField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  
  return (
    <div className={styles.formGroup} key={field.key}>
      <label className={styles.label}>{field.label}</label>
      <ToggleGroup
        value={value !== undefined ? String(value) : field.options[0]?.value || ''}
        onChange={(val) => onChange(field.key, val)}
        options={field.options}
      />
    </div>
  );
}

/**
 * Renders a URL list field with add/remove controls.
 */
function renderUrlListField<T>(
  field: UrlListField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  const value = config[field.key as keyof T];
  const legacyValue = field.legacySingleKey 
    ? config[field.legacySingleKey as keyof T] 
    : undefined;
  
  // Get URLs from array field or fall back to legacy single field
  const urls: string[] = Array.isArray(value) 
    ? value 
    : (legacyValue ? [String(legacyValue)] : ['']);

  const handleUrlChange = (index: number, newValue: string) => {
    const newUrls = [...urls];
    newUrls[index] = newValue;
    onChange(field.key, newUrls);
    // Sync legacy field for backward compatibility
    if (field.legacySingleKey && index === 0) {
      onChange(field.legacySingleKey, newValue || undefined);
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = [...urls];
    newUrls.splice(index, 1);
    onChange(field.key, newUrls.length > 0 ? newUrls : undefined);
    // Sync legacy field
    if (field.legacySingleKey) {
      if (index === 0 && newUrls.length > 0) {
        onChange(field.legacySingleKey, newUrls[0]);
      }
      if (newUrls.length === 0) {
        onChange(field.legacySingleKey, undefined);
      }
    }
  };

  const handleAdd = () => {
    onChange(field.key, [...urls, '']);
  };

  return (
    <div className={styles.formGroup} key={field.key}>
      <label className={styles.label}>{field.label}</label>
      {urls.map((url, index) => (
        <div 
          key={index} 
          style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}
        >
          <Input
            value={url}
            onChange={(e) => handleUrlChange(index, e.target.value)}
            placeholder={field.placeholder || 'https://...'}
            className={styles.flexInput}
          />
          <IconButton
            onClick={() => handleRemove(index)}
            variant="ghost"
            size="sm"
            icon={<X size={16} />}
            title="Remove URL"
            className={styles.removeButton}
          />
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<Plus size={14} />}
        onClick={handleAdd}
        style={{ width: '100%' }}
      >
        {field.addLabel || 'Add URL'}
      </Button>
    </div>
  );
}

/**
 * Renders a custom field using the provided render function.
 */
function renderCustomField<T>(
  field: CustomField<T>,
  config: Partial<T>,
  onChange: (key: string, value: WidgetConfigValue) => void,
  styles: Record<string, string>
): React.ReactNode {
  return (
    <React.Fragment key={field.key}>
      {field.render({ 
        config, 
        onChange: onChange as (key: keyof T & string, value: WidgetConfigValue) => void, 
        styles 
      })}
    </React.Fragment>
  );
}

/**
 * Main field renderer that dispatches to specific field type renderers.
 */
export function renderField<T>(
  props: FieldRendererProps<T>
): React.ReactNode {
  const { field, config, onChange, styles } = props;

  // Check condition
  if (field.condition && !field.condition(config)) {
    return null;
  }

  switch (field.type) {
    case 'input':
      return renderInputField(field, config, onChange, styles);
    case 'select':
      return renderSelectField(field, config, onChange, styles);
    case 'searchableSelect':
      return renderSearchableSelectField(field, config, onChange, styles);
    case 'appSettingsSelect':
      return renderAppSettingsSelectField(field, config, onChange, styles);
    case 'appSettingsBooleanSelect':
      return renderAppSettingsBooleanSelectField(field, config, onChange, styles);
    case 'switch':
      return renderSwitchField(field, config, onChange, styles);
    case 'toggle':
      return renderToggleField(field, config, onChange, styles);
    case 'urlList':
      return renderUrlListField(field, config, onChange, styles);
    case 'custom':
      return renderCustomField(field, config, onChange, styles);
    default:
      return null;
  }
}
