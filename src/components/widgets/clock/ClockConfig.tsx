'use client';

import React from 'react';
import { WidgetConfigProps } from '@/components/item-editor/forms/types';
import type { ClockWidgetConfig } from '@/types';
import { CITIES } from '@/constants/cities';
import { renderField } from '@/components/item-editor/forms/config-form-builder';
import type { FieldDefinition } from '@/components/item-editor/forms/config-form-builder';

export const ClockConfig: React.FC<WidgetConfigProps<ClockWidgetConfig>> = ({ config, onChange, styles }) => {
  const variant = config.variant || 'digital';

  const cityOptions = [
    { value: '', label: 'Use App Settings' },
    ...CITIES.map(c => ({ value: c.id, label: c.name }))
  ];

  const commonFields: FieldDefinition<ClockWidgetConfig>[] = [
    { 
      type: 'toggle', 
      key: 'variant', 
      label: 'Variant', 
      options: [
        { value: 'digital', label: 'Digital' },
        { value: 'analog', label: 'Analog' }
      ]
    }
  ];

  const analogFields: FieldDefinition<ClockWidgetConfig>[] = [
    { 
      type: 'toggle', 
      key: 'showHands', 
      label: 'Show Hands', 
      options: [
        { value: 'hour', label: 'Hour' },
        { value: 'minute', label: 'Minute' },
        { value: 'all', label: 'All' }
      ]
    },
    { 
      type: 'toggle', 
      key: 'analogStyle', 
      label: 'Clock Face', 
      options: [
        { value: 'squircle', label: 'Squircle' },
        { value: 'classic', label: 'Classic' }
      ]
    },
    { 
      type: 'select', 
      key: 'classicDigits', 
      label: 'Digit Display', 
      options: [
        { value: 'none', label: 'None (Ticks Only)' },
        { value: 'cardinal', label: 'Cardinal (12, 3, 6, 9)' },
        { value: 'all', label: 'All (1-12)' },
        { value: 'dynamic', label: 'Dynamic (Hand Positions)' }
      ],
      fullWidth: true,
      condition: (c) => c.analogStyle === 'classic'
    },
    { 
      type: 'searchableSelect', 
      key: 'city', 
      label: 'City / Timezone', 
      options: cityOptions
    },
    { 
      type: 'switch', 
      key: 'showCityName', 
      label: 'Show City Name', 
      inline: true
    },
    { 
      type: 'switch', 
      key: 'showDate', 
      label: 'Show Date', 
      inline: true
    }
  ];

  const digitalFields: FieldDefinition<ClockWidgetConfig>[] = [
    { 
      type: 'toggle', 
      key: 'justification', 
      label: 'Justification', 
      options: [
        { value: 'left', label: 'Left (Start)' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right (End)' }
      ]
    },
    { 
      type: 'appSettingsBooleanSelect', 
      key: 'hour12', 
      label: 'Time Format', 
      options: [
        { value: 'app', label: 'Use App Settings' },
        { value: '24h', label: '24 Hour' },
        { value: '12h', label: '12 Hour' }
      ],
      appSettingsValue: 'app',
      trueValue: '12h',
      falseValue: '24h',
      fullWidth: true
    },
    { 
      type: 'searchableSelect', 
      key: 'city', 
      label: 'City / Timezone', 
      options: cityOptions
    },
    { 
      type: 'switch', 
      key: 'showCityName', 
      label: 'Show City Name', 
      inline: true
    },
    { 
      type: 'toggle', 
      key: 'cityFormat', 
      label: 'City Name Format', 
      options: [
        { value: 'short', label: 'Short (NYC)' },
        { value: 'long', label: 'Long (New York)' }
      ],
      condition: (c) => !!c.city
    },
    { 
      type: 'switch', 
      key: 'includeDate', 
      label: 'Show Date', 
      inline: true,
      defaultValue: true
    },
    { 
      type: 'select', 
      key: 'dateFormat', 
      label: 'Date Format', 
      options: [
        { value: 'short', label: 'Short (Mon, Jan 1)' },
        { value: 'long', label: 'Long (Monday, January 1)' }
      ],
      fullWidth: true,
      condition: (c) => c.includeDate !== false
    }
  ];

  const fieldsToRender = [
    ...commonFields,
    ...(variant === 'analog' ? analogFields : digitalFields)
  ];

  return (
    <>
      {fieldsToRender.map((field) =>
        renderField({ field, config, onChange, styles })
      )}
    </>
  );
};
