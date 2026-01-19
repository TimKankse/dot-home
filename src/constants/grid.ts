export const GRID_BREAKPOINTS = {
  desktop: { cols: 8, rows: 8 },
  medium: { cols: 4, rows: 16 },
  mobile: { cols: 2, rows: 32 },
} as const;

export type BreakpointKey = keyof typeof GRID_BREAKPOINTS;

export function getGridDimensions(isMedium: boolean, isMobile: boolean) {
  if (isMobile) return { maxCols: GRID_BREAKPOINTS.mobile.cols, maxRows: GRID_BREAKPOINTS.mobile.rows };
  if (isMedium) return { maxCols: GRID_BREAKPOINTS.medium.cols, maxRows: GRID_BREAKPOINTS.medium.rows };
  return { maxCols: GRID_BREAKPOINTS.desktop.cols, maxRows: GRID_BREAKPOINTS.desktop.rows };
}
