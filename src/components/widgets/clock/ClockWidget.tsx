"use client";

import React from 'react';
import { DigitalClock } from './DigitalClock';
import { AnalogClock } from './AnalogClock';

export interface ClockWidgetProps {
  config?: {
    justification?: 'left' | 'center' | 'right';
    hour12?: boolean;
    includeDate?: boolean;
    dateFormat?: 'short' | 'long';
    variant?: 'digital' | 'analog';
  };
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({ config }) => {
  if (config?.variant === 'analog') {
    return <AnalogClock config={config} />;
  }
  return <DigitalClock config={config} />;
};
