"use client";

import React from 'react';
import { DigitalClock } from './DigitalClock';
import { AnalogClock } from './AnalogClock';
import type { ClockWidgetConfig } from '@/types';

export interface ClockWidgetProps {
  config?: ClockWidgetConfig;
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({ config }) => {
  if (config?.variant === 'analog') {
    return <AnalogClock config={config} />;
  }
  return <DigitalClock config={config} />;
};
