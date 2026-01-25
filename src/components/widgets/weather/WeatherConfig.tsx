'use client';

import React from 'react';
import { WidgetConfigProps } from '@/components/item-editor/forms/types';
import type { WeatherWidgetConfig, CityData } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { renderField } from '@/components/item-editor/forms/config-form-builder';
import type { FieldDefinition } from '@/components/item-editor/forms/config-form-builder';
import { CitySearch } from '@/components/primitives';

export const WeatherConfig: React.FC<WidgetConfigProps<WeatherWidgetConfig>> = ({ config, onChange, styles }) => {
  const { settings } = useSettingsStore();
  
  // Check if using app settings (no widget-specific city data)
  const useAppLocation = !config.cityData && !config.location;
  
  const handleCityChange = (city: CityData | undefined) => {
    onChange('cityData', city);
    // Clear legacy location field when using new CityData
    if (city) {
      onChange('location', undefined);
    }
  };

  const fields: FieldDefinition<WeatherWidgetConfig>[] = [
    { 
      type: 'custom', 
      key: 'cityData', 
      label: 'Location',
      render: ({ styles: s }) => (
        <div key="cityData" className={s.formGroup}>
          <label className={s.label}>Location</label>
          <CitySearch
            value={config.cityData}
            onChange={handleCityChange}
            placeholder={settings?.display?.city 
              ? `App: ${settings.display.city.name}` 
              : 'Search city...'}
          />
          <small style={{ 
            display: 'block', 
            marginTop: '4px',
            fontSize: '0.75rem', 
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            {useAppLocation 
              ? '✓ Using app settings location' 
              : 'Custom location (overrides app settings)'
            }
          </small>
        </div>
      )
    },
    { 
      type: 'select', 
      key: 'view', 
      label: 'View', 
      options: [
        { value: 'current', label: 'Current Weather' },
        { value: 'daily', label: '24-Hour Forecast' },
        { value: 'weekly', label: '7-Day Forecast' }
      ],
      fullWidth: true
    },
    { 
      type: 'appSettingsSelect', 
      key: 'unit', 
      label: 'Temperature Unit', 
      options: [
        { value: 'app', label: `Use App Settings (${settings?.display?.temperatureUnit === 'F' ? '°F' : '°C'})` },
        { value: 'metric', label: 'Metric (°C)' },
        { value: 'imperial', label: 'Imperial (°F)' }
      ],
      fullWidth: true
    },
    { 
      type: 'input', 
      key: 'apiKey', 
      label: 'API Key', 
      inputType: 'password',
      placeholder: 'Optional - uses Open-Meteo if empty'
    }
  ];

  return (
    <>
      {fields.map((field) =>
        renderField({ field, config, onChange, styles })
      )}
    </>
  );
};
