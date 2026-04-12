export const GRID_BREAKPOINTS = {
  desktop: { cols: 8, rows: 8 },
  tablet: { cols: 4, rows: 16 },
  mobile: { cols: 2, rows: 32 },
} as const;

export type BreakpointKey = keyof typeof GRID_BREAKPOINTS;
export type ResponsiveBreakpointKey = Exclude<BreakpointKey, 'desktop'>;

export function getGridDimensions(breakpoint: BreakpointKey) {
  const { cols: maxCols, rows: maxRows } = GRID_BREAKPOINTS[breakpoint];
  return { maxCols, maxRows };
}

export function getBreakpointFromViewport(width: number, height: number): BreakpointKey {
  const isMobile = width < 768;
  const isTablet = (width >= 768 && width <= 975) || (height > width && !isMobile);

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
