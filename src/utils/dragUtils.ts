/**
 * Shared drag-and-drop utilities for section/folder shortcut reordering.
 */

import type { DragRect, ShortcutDragData } from '@/types';
import type { Widget } from '@/types/widget';

/**
 * Sets a transparent 1x1 pixel as the native drag image and activates
 * the CustomDragGhost component via a window event.
 */
export function setTransparentDragImage(
  e: React.DragEvent,
  shortcutId: string,
  sourceRect?: DragRect,
): void {
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  e.dataTransfer.setDragImage(img, 0, 0);
  window.dispatchEvent(new CustomEvent('custom-ghost-drag-start', {
    detail: { shortcutId, startX: e.clientX, startY: e.clientY, sourceRect }
  }));
}

export function setShortcutDragData(dataTransfer: DataTransfer, data: ShortcutDragData): void {
  dataTransfer.setData('application/json', JSON.stringify(data));
}

export function getShortcutDragData(dataTransfer: DataTransfer | null): ShortcutDragData | null {
  if (!dataTransfer) return null;

  const rawData = dataTransfer.getData('application/json');
  if (!rawData) return null;

  try {
    const data = JSON.parse(rawData) as Partial<ShortcutDragData>;
    if (data.type !== 'section-shortcut-drag' || !data.shortcutId || !data.sectionId) {
      return null;
    }

    return {
      type: 'section-shortcut-drag',
      shortcutId: data.shortcutId,
      sectionId: data.sectionId,
    };
  } catch {
    return null;
  }
}

/**
 * Calculates the insertion index for a dragged item within a CSS-grid container,
 * based on cursor position relative to the grid's visible children.
 *
 * Filters out placeholder elements (data-placeholder) and currently-dragged
 * elements (data-dragged="true").
 */
export function calcInsertIndex(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
): number {
  const metrics = getGridMetrics(grid);
  if (!metrics) return 0;

  const { itemCount, cols, columnGap, rowGap, cellWidth, cellHeight, gridRect, scrollTop } = metrics;
  const localX = Math.max(0, Math.min(clientX - gridRect.left, gridRect.width - 1));
  const localY = Math.max(0, clientY - gridRect.top + scrollTop);
  const col = Math.max(0, Math.min(cols - 1, Math.floor(localX / (cellWidth + columnGap))));
  const row = Math.max(0, Math.floor(localY / (cellHeight + rowGap)));
  const slotStartX = col * (cellWidth + columnGap);
  const withinSlotX = Math.max(0, localX - slotStartX);
  const baseIndex = row * cols + col;
  const insertIndex = withinSlotX > cellWidth / 2 ? baseIndex + 1 : baseIndex;

  return Math.max(0, Math.min(itemCount, insertIndex));
}

export function measureGridSlotRect(grid: HTMLElement, index: number): DragRect | undefined {
  const metrics = getGridMetrics(grid);
  if (!metrics) {
    const rect = grid.getBoundingClientRect();
    const size = Math.min(rect.width, 96);
    return {
      left: rect.left,
      top: rect.top,
      width: size,
      height: size,
    };
  }

  const clampedIndex = Math.max(0, Math.min(index, metrics.itemCount));
  const row = Math.floor(clampedIndex / metrics.cols);
  const col = clampedIndex % metrics.cols;
  const top = metrics.gridRect.top - metrics.scrollTop + row * (metrics.cellHeight + metrics.rowGap);
  const left = metrics.gridRect.left + col * (metrics.cellWidth + metrics.columnGap);

  return {
    left,
    top,
    width: metrics.cellWidth,
    height: metrics.cellHeight,
  };
}

function getGridMetrics(grid: HTMLElement) {
  const children = Array.from(grid.children).filter(child =>
    !child.hasAttribute('data-placeholder') &&
    child.getAttribute('data-dragged') !== 'true'
  ) as HTMLElement[];

  if (children.length === 0) return null;

  const gridRect = grid.getBoundingClientRect();
  const firstRect = children[0].getBoundingClientRect();
  const styles = window.getComputedStyle(grid);
  const columnGap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
  const rowGap = parseFloat(styles.rowGap || styles.gap || '0') || 0;
  const cellWidth = firstRect.width;
  const cellHeight = firstRect.height;
  const cols = Math.max(1, Math.round((gridRect.width + columnGap) / (cellWidth + columnGap)));

  return {
    itemCount: children.length,
    cols,
    columnGap,
    rowGap,
    cellWidth,
    cellHeight,
    gridRect,
    scrollTop: grid.scrollTop,
  };
}

export function getDashboardCellRect(
  gridRect: DOMRect,
  cols: number,
  rowHeight: number,
  target: { x: number; y: number; w: number; h: number },
): DragRect {
  const cellWidth = gridRect.width / cols;

  return {
    left: gridRect.left + target.x * cellWidth,
    top: gridRect.top + target.y * rowHeight,
    width: cellWidth * target.w,
    height: rowHeight * target.h,
  };
}

const hasOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => {
  return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
};

export function resolveDashboardDropPosition(
  items: Widget[],
  preferred: { x: number; y: number; w: number; h: number },
  maxCols: number,
  maxRows: number,
): { x: number; y: number; w: number; h: number } | null {
  const startX = Math.max(0, Math.min(preferred.x, maxCols - preferred.w));
  const startY = Math.max(0, preferred.y);

  for (let y = startY; y <= maxRows - preferred.h; y += 1) {
    for (let x = y === startY ? startX : 0; x <= maxCols - preferred.w; x += 1) {
      const next = { x, y, w: preferred.w, h: preferred.h };
      const collides = items.some(item => hasOverlap(next, item.grid));
      if (!collides) return next;
    }
  }

  return null;
}
