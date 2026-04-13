import { describe, expect, it } from 'vitest';
import {
  BREAKPOINT_THRESHOLD_GAP,
  DEFAULT_BREAKPOINT_THRESHOLDS,
  DEFAULT_GRID_COLUMN_WIDTH,
  getBreakpointFromViewport,
  getGridContentWidth,
  getGridDimensions,
  getResponsivePreviewWidth,
  normalizeBreakpointThresholds,
} from './grid';

describe('normalizeBreakpointThresholds', () => {
  it('keeps defaults when no overrides are provided', () => {
    expect(normalizeBreakpointThresholds()).toEqual(DEFAULT_BREAKPOINT_THRESHOLDS);
  });

  it('keeps mobile below tablet by the required gap', () => {
    const normalized = normalizeBreakpointThresholds({
      mobileMaxWidth: 980,
      tabletMaxWidth: 990,
    });

    expect(normalized.tabletMaxWidth - normalized.mobileMaxWidth).toBeGreaterThanOrEqual(BREAKPOINT_THRESHOLD_GAP);
  });
});

describe('getBreakpointFromViewport', () => {
  it('uses the default responsive max widths', () => {
    expect(getBreakpointFromViewport(767, 900)).toBe('mobile');
    expect(getBreakpointFromViewport(768, 900)).toBe('tablet');
    expect(getBreakpointFromViewport(975, 900)).toBe('tablet');
    expect(getBreakpointFromViewport(976, 900)).toBe('desktop');
  });

  it('respects custom responsive max widths', () => {
    const thresholds = {
      mobileMaxWidth: 640,
      tabletMaxWidth: 900,
    };

    expect(getBreakpointFromViewport(640, 900, thresholds)).toBe('mobile');
    expect(getBreakpointFromViewport(641, 900, thresholds)).toBe('tablet');
    expect(getBreakpointFromViewport(900, 900, thresholds)).toBe('tablet');
    expect(getBreakpointFromViewport(901, 900, thresholds)).toBe('desktop');
  });
});

describe('getResponsivePreviewWidth', () => {
  it('returns the configured preview width for each responsive target', () => {
    const thresholds = {
      mobileMaxWidth: 600,
      tabletMaxWidth: 920,
    };

    expect(getResponsivePreviewWidth('mobile', thresholds)).toBe(600);
    expect(getResponsivePreviewWidth('tablet', thresholds)).toBe(920);
  });
});

describe('getGridDimensions', () => {
  it('keeps the default column and row counts for each breakpoint', () => {
    expect(getGridDimensions('desktop')).toEqual({ maxCols: 8, maxRows: 8 });
    expect(getGridDimensions('tablet')).toEqual({ maxCols: 4, maxRows: 16 });
    expect(getGridDimensions('mobile')).toEqual({ maxCols: 2, maxRows: 32 });
  });
});

describe('getGridContentWidth', () => {
  it('scales the rendered grid width without changing the layout dimensions', () => {
    expect(getGridContentWidth('desktop', DEFAULT_GRID_COLUMN_WIDTH)).toBe(1200);
    expect(getGridContentWidth('desktop', 240)).toBe(1920);
    expect(getGridContentWidth('tablet', 100)).toBe(400);
    expect(getGridContentWidth('mobile', 220)).toBe(440);
  });
});
