import type { GridStack } from 'gridstack';
import { GRID_BREAKPOINTS } from '@/constants/grid';
import type { Widget } from '@/types/widget';
import { resolveDashboardDropPosition } from './dragUtils';

interface GridStackLike extends GridStack {
  el: HTMLElement;
  opts: {
    maxRow?: number;
  };
}

interface ResolveDashboardShortcutGridTargetArgs {
  widgets: Widget[];
  pageId: string;
  shortcutId: string;
  gridStack: GridStackLike;
  clientX: number;
  clientY: number;
}

interface DashboardInteractiveRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export function getDashboardInteractiveRect(
  gridStack: GridStackLike,
  rowHeight = gridStack.getCellHeight(true),
): DashboardInteractiveRect {
  const gridRect = gridStack.el.getBoundingClientRect();
  const maxRows = gridStack.opts.maxRow ?? GRID_BREAKPOINTS.desktop.rows;
  const height = Math.max(gridRect.height, maxRows * rowHeight);

  return {
    left: gridRect.left,
    right: gridRect.right,
    top: gridRect.top,
    bottom: gridRect.top + height,
    width: gridRect.width,
    height,
  };
}

export function resolveDashboardShortcutGridTarget({
  widgets,
  pageId,
  shortcutId,
  gridStack,
  clientX,
  clientY,
}: ResolveDashboardShortcutGridTargetArgs) {
  const rowHeight = gridStack.getCellHeight(true);
  const gridRect = getDashboardInteractiveRect(gridStack, rowHeight);
  const isInside =
    clientX >= gridRect.left && clientX <= gridRect.right &&
    clientY >= gridRect.top && clientY <= gridRect.bottom;

  if (!isInside) return null;

  const cols = gridStack.getColumn();
  const maxRows = gridStack.opts.maxRow ?? GRID_BREAKPOINTS.desktop.rows;
  const visibleItems = getVisibleDashboardWidgets(widgets, pageId, shortcutId);
  const rawX = Math.max(0, Math.min(cols - 1, Math.floor((clientX - gridRect.left) / (gridRect.width / cols))));
  const rawY = Math.max(0, Math.floor((clientY - gridRect.top) / rowHeight));

  return resolveDashboardDropPosition(visibleItems, {
    x: rawX,
    y: rawY,
    w: 1,
    h: 1,
  }, cols, maxRows);
}

export function resolveDashboardShortcutPointerGridTarget(
  gridStack: GridStackLike,
  clientX: number,
  clientY: number,
) {
  const rowHeight = gridStack.getCellHeight(true);
  const gridRect = getDashboardInteractiveRect(gridStack, rowHeight);
  const isInside =
    clientX >= gridRect.left && clientX <= gridRect.right &&
    clientY >= gridRect.top && clientY <= gridRect.bottom;

  if (!isInside) return null;

  const cols = gridStack.getColumn();

  return {
    x: Math.max(0, Math.min(cols - 1, Math.floor((clientX - gridRect.left) / (gridRect.width / cols)))),
    y: Math.max(0, Math.floor((clientY - gridRect.top) / rowHeight)),
    w: 1,
    h: 1,
  };
}

export function bootstrapGridStackShortcutDrag(
  gridStack: GridStackLike,
  widgetId: string,
  pointer: { x: number; y: number },
  attemptsLeft = 24,
): Promise<boolean> {
  return new Promise((resolve) => {
    const tryBootstrap = () => {
      const widgetSelector = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? `.grid-stack-item[gs-id="${CSS.escape(widgetId)}"]`
        : `.grid-stack-item[gs-id="${widgetId.replace(/"/g, '\\"')}"]`;

      const gridItem = gridStack.el.querySelector(widgetSelector) as (HTMLElement & {
        ddElement?: {
          ddDraggable?: {
            disabled?: boolean;
          };
        };
      }) | null;
      const handle = (gridItem?.querySelector('.grid-stack-item-content') as HTMLElement | null) ?? gridItem;

      if (!gridItem || !handle || !gridItem.ddElement?.ddDraggable || gridItem.ddElement.ddDraggable.disabled) {
        if (attemptsLeft <= 0) {
          resolve(false);
          return;
        }

        window.requestAnimationFrame(() => {
          void bootstrapGridStackShortcutDrag(gridStack, widgetId, pointer, attemptsLeft - 1).then(resolve);
        });
        return;
      }

      const startPointer = {
        x: pointer.x - 14,
        y: pointer.y - 2,
      };
      const downEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: startPointer.x,
        clientY: startPointer.y,
        button: 0,
      });
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: pointer.x,
        clientY: pointer.y,
        buttons: 1,
      });
      const settleMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: pointer.x + 1,
        clientY: pointer.y + 1,
        buttons: 1,
      });

      handle.dispatchEvent(downEvent);
      document.dispatchEvent(moveEvent);
      document.dispatchEvent(settleMoveEvent);
      resolve(true);
    };

    window.requestAnimationFrame(tryBootstrap);
  });
}

function getVisibleDashboardWidgets(
  widgets: Widget[],
  pageId: string,
  shortcutId: string,
) {
  const hiddenShortcutIds = new Set<string>();

  widgets.forEach((widget) => {
    if (widget.type !== 'section' || !widget.config?.shortcutIds) return;

    (widget.config.shortcutIds as string[]).forEach((id) => {
      if (id !== shortcutId) {
        hiddenShortcutIds.add(id);
      }
    });
  });

  return widgets.filter((widget) =>
    widget.pageId === pageId &&
    widget.id !== shortcutId &&
    !hiddenShortcutIds.has(widget.id)
  );
}
