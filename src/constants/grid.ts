export const GRID_BREAKPOINTS = {
  desktop: { cols: 8, rows: 8 },
  tablet: { cols: 4, rows: 16 },
  mobile: { cols: 2, rows: 32 },
} as const;

export const GRID_COLUMN_WIDTH_STORAGE_KEY = 'grid-column-width';
export const DEFAULT_GRID_COLUMN_WIDTH = 150;
export const MIN_GRID_COLUMN_WIDTH = 40;
export const MAX_GRID_COLUMN_WIDTH = 240;

export type BreakpointKey = keyof typeof GRID_BREAKPOINTS;
export type ResponsiveBreakpointKey = Exclude<BreakpointKey, 'desktop'>;

export interface BreakpointThresholds {
  mobileMaxWidth: number;
  tabletMaxWidth: number;
}

export const DEFAULT_BREAKPOINT_THRESHOLDS: BreakpointThresholds = {
  mobileMaxWidth: 767,
  tabletMaxWidth: 975,
};

export const MIN_MOBILE_BREAKPOINT_MAX_WIDTH = 320;
export const MAX_TABLET_BREAKPOINT_MAX_WIDTH = 1600;
export const BREAKPOINT_THRESHOLD_GAP = 48;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getNormalizedColumnWidth(columnWidth?: number) {
  if (typeof columnWidth === 'number' && Number.isFinite(columnWidth)) {
    return clamp(Math.round(columnWidth), MIN_GRID_COLUMN_WIDTH, MAX_GRID_COLUMN_WIDTH);
  }

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(GRID_COLUMN_WIDTH_STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;

    if (Number.isFinite(parsed)) {
      return clamp(parsed, MIN_GRID_COLUMN_WIDTH, MAX_GRID_COLUMN_WIDTH);
    }
  }

  return DEFAULT_GRID_COLUMN_WIDTH;
}

export function getGridDimensions(breakpoint: BreakpointKey) {
  const { cols: maxCols, rows: maxRows } = GRID_BREAKPOINTS[breakpoint];
  return { maxCols, maxRows };
}

export function getGridContentWidth(breakpoint: BreakpointKey, columnWidth?: number) {
  const { maxCols } = getGridDimensions(breakpoint);
  return maxCols * getNormalizedColumnWidth(columnWidth);
}

export function normalizeBreakpointThresholds(
  value?: Partial<BreakpointThresholds>,
): BreakpointThresholds {
  const tabletMaxWidth = clamp(
    value?.tabletMaxWidth ?? DEFAULT_BREAKPOINT_THRESHOLDS.tabletMaxWidth,
    MIN_MOBILE_BREAKPOINT_MAX_WIDTH + BREAKPOINT_THRESHOLD_GAP,
    MAX_TABLET_BREAKPOINT_MAX_WIDTH,
  );
  const mobileMaxWidth = clamp(
    value?.mobileMaxWidth ?? DEFAULT_BREAKPOINT_THRESHOLDS.mobileMaxWidth,
    MIN_MOBILE_BREAKPOINT_MAX_WIDTH,
    tabletMaxWidth - BREAKPOINT_THRESHOLD_GAP,
  );

  return {
    mobileMaxWidth,
    tabletMaxWidth,
  };
}

export function getBreakpointFromViewport(
  width: number,
  _height: number,
  thresholds?: Partial<BreakpointThresholds>,
): BreakpointKey {
  const { mobileMaxWidth, tabletMaxWidth } = normalizeBreakpointThresholds(thresholds);
  const isMobile = width <= mobileMaxWidth;
  const isTablet = width <= tabletMaxWidth;

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

export function getResponsivePreviewWidth(
  breakpoint: ResponsiveBreakpointKey,
  thresholds?: Partial<BreakpointThresholds>,
) {
  const { mobileMaxWidth, tabletMaxWidth } = normalizeBreakpointThresholds(thresholds);
  return breakpoint === 'mobile' ? mobileMaxWidth : tabletMaxWidth;
}
