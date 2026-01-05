import { Widget } from "@/types/widget";

/**
 * Recalculates widget positions for a given column count.
 * Preserves visual order (top-left to bottom-right) and packs widgets tightly.
 */
export function getResponsiveLayout(widgets: Widget[], maxCols: number): Widget[] {
  if (widgets.length === 0) return [];
  
  // Sort widgets by Y then X to preserve visual order
  const sorted = [...widgets].sort((a, b) => {
    if (a.grid.y !== b.grid.y) return a.grid.y - b.grid.y;
    return a.grid.x - b.grid.x;
  });

  // Track placed widgets for rectangle intersection
  const placedWidgets: Array<{ x: number; y: number; w: number; h: number }> = [];

  // Helper: Check if rectangle overlaps with any placed widget
  const hasOverlap = (x: number, y: number, w: number, h: number): boolean => {
    for (const placed of placedWidgets) {
      if (!(x + w <= placed.x || x >= placed.x + placed.w || 
            y + h <= placed.y || y >= placed.y + placed.h)) {
        return true;
      }
    }
    return false;
  };

  return sorted.map(widget => {
    // Clamp width to maxCols
    const w = Math.min(widget.grid.w, maxCols);
    const h = widget.grid.h;

    // Find first available position
    let foundX = 0;
    let foundY = 0;
    let found = false;

    // Search with a reasonable max height limit (prevent infinite loop)
    const maxSearchRows = 1000;
    
    for (let y = 0; y < maxSearchRows && !found; y++) {
      for (let x = 0; x <= maxCols - w; x++) {
        if (!hasOverlap(x, y, w, h)) {
          foundX = x;
          foundY = y;
          found = true;
          break;
        }
      }
    }

    // Add to placed widgets for future collision checks
    placedWidgets.push({ x: foundX, y: foundY, w, h });

    return {
      ...widget,
      grid: { ...widget.grid, x: foundX, y: foundY, w, h }
    };
  });
}