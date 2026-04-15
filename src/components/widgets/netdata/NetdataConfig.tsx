'use client';

import React from 'react';
import { WidgetConfigProps } from '@/components/item-editor/forms/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { renderField } from '@/components/item-editor/forms/config-form-builder';
import type { FieldDefinition } from '@/components/item-editor/forms/config-form-builder';
import type { NetdataWidgetConfig } from '@/types';
import { IntegrationSelect } from '@/components/primitives';

export const NetdataConfig: React.FC<WidgetConfigProps<NetdataWidgetConfig>> = ({ config, onChange, styles }) => {
  const { settings } = useSettingsStore();

  const fields: FieldDefinition<NetdataWidgetConfig>[] = [
    // Integration selector
    { 
      type: 'custom', 
      key: 'integrationId', 
      label: 'Connection',
      render: ({ config: c, onChange: onFieldChange, styles: s }) => (
        <div key="integrationId" className={s.formGroup}>
          <label className={s.label}>Connection</label>
          <IntegrationSelect
            type="netdata"
            value={c.integrationId}
            onChange={(id) => onFieldChange('integrationId', id)}
            placeholder="Select Netdata integration..."
          />
        </div>
      )
    },
    { 
      type: 'input', 
      key: 'url', 
      label: 'URL', 
      placeholder: 'http://...',
      condition: (c) => !c.integrationId
    },
    {
      type: 'input',
      key: 'refreshInterval',
      label: 'Refresh Rate (ms)',
      placeholder: '2000 (Default)',
      inputType: 'number',
    },
    { 
      type: 'select',  
      key: 'metricType', 
      label: 'Metric Type', 
      options: [
        { value: 'cpu', label: 'CPU' },
        { value: 'ram', label: 'RAM' },
        { value: 'storage', label: 'Storage' },
        { value: 'network', label: 'Network' },
        { value: 'processes', label: 'Processes' },
        { value: 'system', label: 'System' },
        { value: 'gpu', label: 'GPU' },
        { value: 'cpu-cores', label: 'CPU Cores' }
      ],
      fullWidth: true
    },
    // Storage-specific fields
    { 
      type: 'input', 
      key: 'mountPoints', 
      label: 'Mount Points (comma separated)', 
      placeholder: '/, /home',
      condition: (c) => c.metricType === 'storage'
    },
    { 
      type: 'select', 
      key: 'storageViewMode', 
      label: 'View Mode', 
      options: [
        { value: 'linear', label: 'Linear' },
        { value: 'circular', label: 'Circular' }
      ],
      fullWidth: true,
      condition: (c) => c.metricType === 'storage'
    },
    // Network-specific field
    { 
      type: 'input', 
      key: 'interfaceName', 
      label: 'Interface Name', 
      placeholder: 'eth0',
      condition: (c) => c.metricType === 'network'
    },
    // Processes-specific field
    { 
      type: 'input', 
      key: 'processLimit', 
      label: 'Process Limit', 
      inputType: 'number',
      condition: (c) => c.metricType === 'processes'
    },
    // GPU-specific field
    { 
      type: 'input', 
      key: 'gpuId', 
      label: 'GPU ID', 
      placeholder: 'gpu0',
      condition: (c) => c.metricType === 'gpu'
    },
    // Temperature unit (for CPU, GPU, CPU-cores)
    { 
      type: 'appSettingsSelect', 
      key: 'temperatureUnit', 
      label: 'Temperature Unit', 
      options: [
        { value: 'app', label: `Use App Settings (${settings?.display?.temperatureUnit === 'F' ? '°F' : '°C'})` },
        { value: 'C', label: 'Celsius (°C)' },
        { value: 'F', label: 'Fahrenheit (°F)' }
      ],
      fullWidth: true,
      condition: (c) => c.metricType === 'cpu' || c.metricType === 'gpu' || c.metricType === 'cpu-cores'
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
