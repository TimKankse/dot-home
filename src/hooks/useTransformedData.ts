import { useMemo } from 'react';
import get from 'lodash/get';
import { WidgetConfig, WidgetMapping } from '@/types/widget';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useTransformedData = (rawData: any, config: WidgetConfig | undefined) => {
  return useMemo(() => {
    if (!rawData || !config) return null;

    let data = rawData;

    // Apply data extractor if specified
    if (config.dataExtractor) {
      data = get(rawData, config.dataExtractor, rawData);
    }

    // Apply transformations based on visualization type
    if (config.visualizationType === 'chart' && config.transform?.arrayToChart) {
      data = transformArrayToChart(data, config.transform.arrayToChart);
    }

    // Apply field mappings if specified
    if (config.mappings) {
      data = applyMappings(data, config.mappings);
    }

    return data;
  }, [rawData, config]);
};

// Transform array data to chart format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformArrayToChart(data: any, transform: NonNullable<NonNullable<WidgetConfig['transform']>['arrayToChart']>) {
  if (!Array.isArray(data)) {
    // Handle special cases like CoinGecko's { prices: [[timestamp, price]] }
    // This might be better handled by a more generic "array extractor" but keeping for now as common case
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((data as any)?.prices && Array.isArray((data as any).prices)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any).prices.map(([timestamp, value]: [number, number]) => ({
        name: formatTimestamp(timestamp, transform.timestampFormat),
        value: value,
        timestamp: timestamp
      }));
    }
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((item: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    
    if (transform.xField) {
      // Handle array indices (e.g. "0") or object keys
      result[transform.xField] = get(item, transform.xField);
      
      if (transform.timestampField && transform.xField === transform.timestampField) {
        result.name = formatTimestamp(result[transform.xField], transform.timestampFormat);
      } else {
        result.name = result[transform.xField];
      }
    }
    
    if (transform.yField) {
      result[transform.yField] = get(item, transform.yField);
      result.value = result[transform.yField];
    }
    
    return result;
  });
}

function formatTimestamp(timestamp: number, format?: string | number) {
  let date: Date;
  
  if (format === 'iso') {
    date = new Date(timestamp);
  } else if (typeof format === 'number') {
    date = new Date(timestamp / format);
  } else {
    // Default: assume unix milliseconds
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

// Apply field mappings to transform data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMappings(data: any, mappings: WidgetMapping[]) {
  if (Array.isArray(data)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: any) => applyMappingsToItem(item, mappings));
  }
  return applyMappingsToItem(data, mappings);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMappingsToItem(item: any, mappings: WidgetMapping[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = { ...item };
  
  mappings.forEach(mapping => {
    let value = get(item, mapping.field);
    
    // Apply remapping
    if (mapping.remap && value !== undefined) {
      const remapRule = mapping.remap.find(r => 
        'any' in r ? r.any : r.value === value
      );
      if (remapRule) {
        value = remapRule.to;
      }
    }
    
    // Apply scaling
    if (mapping.scale && typeof value === 'number') {
      const scale = typeof mapping.scale === 'string' 
        ? eval(mapping.scale) 
        : mapping.scale;
      value = value * scale;
    }
    
    // Apply prefix/suffix
    if (mapping.prefix) value = `${mapping.prefix}${value}`;
    if (mapping.suffix) value = `${value}${mapping.suffix}`;
    
    // Store with label or field name
    const key = mapping.label || mapping.field;
    result[key] = value;
  });
  
  return result;
}
