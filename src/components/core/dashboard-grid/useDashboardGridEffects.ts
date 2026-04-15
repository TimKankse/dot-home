"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { GridStack, GridStackNode, GridStackWidget } from 'gridstack';
import { getMinDimensions } from '@/constants/widget-definitions';
import {
  GRID_BREAKPOINTS,
  getGridDimensions,
  type BreakpointKey,
} from '@/constants/grid';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import type { Widget } from '@/types/widget';
import {
  getDashboardCellRect,
  resolveDashboardDropPosition,
} from '@/utils/dragUtils';
import { getDashboardInteractiveRect } from '@/utils/shortcutGridStackHandoff';

export type ExtendedGridStack = GridStack & {
  _ignoreEvents?: boolean;
  cancelDrag?: () => void;
};

interface ExtendedGridStackElement extends HTMLElement {
  gridstackNode?: GridStackNode;
}

const releaseIgnoreEvents = (grid: ExtendedGridStack) => {
  window.setTimeout(() => {
    grid._ignoreEvents = false;
  }, 100);
};

const setIgnoreEvents = (grid: ExtendedGridStack, value: boolean) => {
  grid._ignoreEvents = value;
};

const syncMaxRows = (grid: ExtendedGridStack, maxRows: number) => {
  grid.opts.maxRow = maxRows;
  if (grid.engine) {
    grid.engine.maxRow = maxRows;
  }
};

export const useGridStackConfiguration = (
  gridStack: ExtendedGridStack | null,
  options: {
    breakpoint: BreakpointKey;
    isEditing: boolean;
    rowHeight: number;
    gap: number;
  },
) => {
  const { breakpoint, gap, isEditing, rowHeight } = options;

  useEffect(() => {
    if (!gridStack) return;

    setIgnoreEvents(gridStack, true);

    if (isEditing) gridStack.enable();
    else gridStack.disable();

    const { maxCols, maxRows } = getGridDimensions(breakpoint);

    if (gridStack.opts.maxRow !== maxRows) {
      syncMaxRows(gridStack, maxRows);
    }

    if (gridStack.getColumn() !== maxCols) {
      gridStack.column(maxCols);
    }

    gridStack.cellHeight(rowHeight);
    gridStack.margin(`${gap}px`);
    gridStack.float(true);
    gridStack.onResize?.(gridStack.el.clientWidth);

    releaseIgnoreEvents(gridStack);
  }, [breakpoint, gap, gridStack, isEditing, rowHeight]);
};

export const useGridStackLayoutChange = (
  gridStack: ExtendedGridStack | null,
  onLayoutChange?: (layout: GridStackNode[], allLayouts: { [key: string]: GridStackNode[] }) => void,
) => {
  const layoutCache = useRef('');

  useEffect(() => {
    if (!gridStack || !onLayoutChange) return;

    const handleChange = (_event: Event, _items: GridStackNode[]) => {
      if (gridStack._ignoreEvents) return;

      const layout = gridStack
        .getGridItems()
        .map((element) => {
          const node = (element as ExtendedGridStackElement).gridstackNode;
          return {
            i: node?.id || element.getAttribute('gs-id'),
            x: node?.x,
            y: node?.y,
            w: node?.w,
            h: node?.h,
          };
        })
        .filter((item) => item.i != null);

      const layoutString = JSON.stringify(layout);
      if (layoutString === layoutCache.current) return;
      layoutCache.current = layoutString;

      onLayoutChange(layout, { lg: layout });
    };

    gridStack.on('change', handleChange as (...args: unknown[]) => void);

    return () => {
      gridStack.off('change');
    };
  }, [gridStack, onLayoutChange]);
};

export const useGridStackDragLifecycle = (
  gridStack: ExtendedGridStack | null,
  options: {
    onWidgetDragStop?: (widgetId: string, mouseX: number, mouseY: number) => void;
    pageId: string;
  },
) => {
  const { onWidgetDragStop, pageId } = options;
  const startShortcutDrag = useShortcutDragStore((state) => state.startDrag);

  useEffect(() => {
    if (!gridStack || !onWidgetDragStop) return;

    let lastMouseX = 0;
    let lastMouseY = 0;
    let activeGridStackDrag: {
      widgetId: string;
      widgetType: string | null;
      element: HTMLElement;
      transferred: boolean;
    } | null = null;

    let lastEventTime = 0;
    const trackMouse = (event: MouseEvent) => {
      if (!activeGridStackDrag) return;

      lastMouseX = event.clientX;
      lastMouseY = event.clientY;

      const elements = document.elementsFromPoint(lastMouseX, lastMouseY);
      const isOverShortcutDropzone = elements.some((element) =>
        !element.classList.contains('ui-draggable-dragging') &&
        !element.classList.contains('grid-stack-item-dragging') &&
        Boolean(element.closest('[data-shortcut-dropzone]') || element.closest('[role="dialog"]'))
      );

      if (
        isOverShortcutDropzone &&
        activeGridStackDrag.widgetType === 'shortcut' &&
        !activeGridStackDrag.transferred &&
        !useShortcutDragStore.getState().activeDrag
      ) {
        const sourceRect = activeGridStackDrag.element.getBoundingClientRect();
        startShortcutDrag({
          shortcutId: activeGridStackDrag.widgetId,
          source: {
            type: 'dashboard',
            pageId,
          },
          pointer: {
            x: lastMouseX,
            y: lastMouseY,
          },
          sourceRect: {
            left: sourceRect.left,
            top: sourceRect.top,
            width: sourceRect.width,
            height: sourceRect.height,
          },
        });

        activeGridStackDrag.transferred = true;
        gridStack.cancelDrag?.();
        document.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX: lastMouseX,
          clientY: lastMouseY,
          button: 0,
        }));
        return;
      }

      const now = Date.now();
      if (now - lastEventTime > 50) {
        lastEventTime = now;
        window.dispatchEvent(new CustomEvent('global-drag-move', {
          detail: {
            x: lastMouseX,
            y: lastMouseY,
            widgetId: activeGridStackDrag.widgetId,
            widgetType: activeGridStackDrag.widgetType,
          },
        }));

        const isOverSection = elements.some((element) =>
          !element.classList.contains('ui-draggable-dragging') &&
          !element.classList.contains('grid-stack-item-dragging') &&
          Boolean(element.closest('[data-widget-type="section"]') || element.closest('[role="dialog"]'))
        );

        document.body.classList.toggle('gs-over-section', isOverSection);
      }
    };

    const handleDragStart = (_event: Event, element: HTMLElement) => {
      const node = (element as ExtendedGridStackElement).gridstackNode;
      const widgetId = node?.id || element.getAttribute('gs-id');

      activeGridStackDrag = widgetId
        ? {
            widgetId: String(widgetId),
            widgetType: element.getAttribute('data-widget-type'),
            element,
            transferred: false,
          }
        : null;

      document.addEventListener('mousemove', trackMouse);
    };

    const handleDragStop = (_event: Event, element: HTMLElement) => {
      document.removeEventListener('mousemove', trackMouse);
      document.body.classList.remove('gs-over-section');
      const didTransfer = activeGridStackDrag?.transferred ?? false;
      activeGridStackDrag = null;

      const node = (element as ExtendedGridStackElement).gridstackNode;
      const widgetId = node?.id || element.getAttribute('gs-id');
      if (!widgetId || !lastMouseX || !lastMouseY) {
        window.dispatchEvent(new CustomEvent('global-drag-stop'));
        return;
      }

      if (didTransfer) {
        window.dispatchEvent(new CustomEvent('global-drag-stop'));
        return;
      }

      const originalPointerEvents = element.style.pointerEvents;
      const originalVisibility = element.style.visibility;
      element.style.pointerEvents = 'none';
      element.style.visibility = 'hidden';

      onWidgetDragStop(String(widgetId), lastMouseX, lastMouseY);

      element.style.pointerEvents = originalPointerEvents;
      element.style.visibility = originalVisibility;

      window.dispatchEvent(new CustomEvent('global-drag-stop'));
    };

    gridStack.on('dragstart', handleDragStart as (...args: unknown[]) => void);
    gridStack.on('dragstop', handleDragStop as (...args: unknown[]) => void);

    return () => {
      document.removeEventListener('mousemove', trackMouse);
      document.body.classList.remove('gs-over-section');
      activeGridStackDrag = null;
      gridStack.off('dragstart');
      gridStack.off('dragstop');
    };
  }, [gridStack, onWidgetDragStop, pageId, startShortcutDrag]);
};

export const useExternalShortcutPreview = (
  gridStack: ExtendedGridStack | null,
  options: {
    pageId: string;
    items: Widget[];
    isEditing: boolean;
    rowHeight: number;
  },
) => {
  const { isEditing, items, pageId, rowHeight } = options;
  const dragPointer = useShortcutDragStore((state) => state.activeDrag?.pointer ?? null);
  const draggedShortcutId = useShortcutDragStore((state) => state.activeDrag?.shortcutId ?? null);
  const draggedShortcutSource = useShortcutDragStore((state) => state.activeDrag?.source ?? null);
  const dashboardTarget = useShortcutDragStore((state) => {
    const target = state.activeDrag?.target;
    if (target?.kind !== 'dashboard' || target.pageId !== pageId) {
      return null;
    }

    return target;
  });
  const setDragTarget = useShortcutDragStore((state) => state.setTarget);
  const clearDragTarget = useShortcutDragStore((state) => state.clearTarget);

  const externalShortcutTarget = dashboardTarget ? dashboardTarget.grid : null;
  const externalShortcutRect = useMemo(() => {
    if (!gridStack || !externalShortcutTarget) return null;

    const containerRect = gridStack.el.getBoundingClientRect();
    const targetRect = dashboardTarget?.rect ?? getDashboardCellRect(
      containerRect,
      gridStack.getColumn(),
      rowHeight,
      externalShortcutTarget,
    );

    return {
      left: targetRect.left - containerRect.left,
      top: targetRect.top - containerRect.top,
      width: targetRect.width,
      height: targetRect.height,
    };
  }, [dashboardTarget, externalShortcutTarget, gridStack, rowHeight]);

  const resolveExternalShortcutTarget = useCallback((clientX: number, clientY: number) => {
    if (!gridStack || !draggedShortcutId) return null;

    const gridRect = getDashboardInteractiveRect(gridStack, rowHeight);
    const isInside =
      clientX >= gridRect.left && clientX <= gridRect.right &&
      clientY >= gridRect.top && clientY <= gridRect.bottom;

    if (!isInside) return null;

    const elements = document.elementsFromPoint(clientX, clientY);
    const sourceSectionId = draggedShortcutSource?.type === 'section'
      ? draggedShortcutSource.sectionId
      : null;
    const isOverShortcutDropzone = elements.some((element) =>
      !element.classList.contains('ui-draggable-dragging') &&
      !element.classList.contains('grid-stack-item-dragging') &&
      Boolean(element.closest('[data-shortcut-dropzone]'))
    );
    const isOverDialog = elements.some((element) =>
      !element.classList.contains('ui-draggable-dragging') &&
      !element.classList.contains('grid-stack-item-dragging') &&
      Boolean(element.closest('[role="dialog"]'))
    );
    const isOverBlockedSection = elements.some((element) => {
      if (
        element.classList.contains('ui-draggable-dragging') ||
        element.classList.contains('grid-stack-item-dragging')
      ) {
        return false;
      }

      const sectionElement = element.closest('[data-widget-type="section"]') as HTMLElement | null;
      if (!sectionElement) return false;

      return sectionElement.getAttribute('data-widget-id') !== sourceSectionId;
    });

    if (isOverShortcutDropzone || isOverDialog || isOverBlockedSection) {
      return null;
    }

    const columns = gridStack.getColumn();
    const rawX = Math.max(
      0,
      Math.min(columns - 1, Math.floor((clientX - gridRect.left) / (gridRect.width / columns))),
    );
    const rawY = Math.max(0, Math.floor((clientY - gridRect.top) / rowHeight));
    const maxRows = gridStack.opts.maxRow ?? GRID_BREAKPOINTS.desktop.rows;
    const visibleItems = items.filter((item) => item.id !== draggedShortcutId);
    const resolved = resolveDashboardDropPosition(
      visibleItems,
      { x: rawX, y: rawY, w: 1, h: 1 },
      columns,
      maxRows,
    );

    if (!resolved) return null;

    return {
      pageId,
      ...resolved,
    };
  }, [draggedShortcutId, draggedShortcutSource, gridStack, items, pageId, rowHeight]);

  useEffect(() => {
    if (!isEditing || !gridStack || !dragPointer || !draggedShortcutId) return;

    const target = resolveExternalShortcutTarget(dragPointer.x, dragPointer.y);
    if (!target) {
      const activeTarget = useShortcutDragStore.getState().activeDrag?.target;
      if (activeTarget?.kind === 'dashboard' && activeTarget.pageId === pageId) {
        clearDragTarget();
      }
      return;
    }

    const { pageId: _targetPageId, ...gridTarget } = target;
    setDragTarget({
      kind: 'dashboard',
      pageId,
      grid: gridTarget,
      rect: getDashboardCellRect(
        gridStack.el.getBoundingClientRect(),
        gridStack.getColumn(),
        rowHeight,
        gridTarget,
      ),
    });
  }, [
    clearDragTarget,
    dragPointer,
    draggedShortcutId,
    gridStack,
    isEditing,
    pageId,
    resolveExternalShortcutTarget,
    rowHeight,
    setDragTarget,
  ]);

  return {
    externalShortcutTarget,
    externalShortcutRect,
  };
};

export const useGridStackItemSynchronization = (
  gridStack: ExtendedGridStack | null,
  options: {
    children: ReactNode;
    items: Widget[];
  },
) => {
  const { children, items } = options;

  useEffect(() => {
    if (!gridStack) return;

    const container = gridStack.el;
    if (!container) return;

    let hasChanges = false;
    setIgnoreEvents(gridStack, true);

    const processedIds = new Set<string>();

    items.forEach((item) => {
      processedIds.add(item.id);
      const { w: minW, h: minH } = getMinDimensions(
        (item.type === 'widget' ? item.widgetType : item.type) || 'clock',
        item.config || {},
      );

      const node = gridStack.engine?.nodes.find((candidate) => candidate.id === item.id);

      if (node) {
        const { x, y, w, h } = item.grid;
        const needsUpdate = (
          node.x !== x ||
          node.y !== y ||
          node.w !== w ||
          node.h !== h ||
          node.minW !== minW ||
          node.minH !== minH
        );

        if (needsUpdate) {
          if (!hasChanges) {
            gridStack.batchUpdate();
            hasChanges = true;
          }

          if (node.el) {
            node.el.setAttribute('gs-min-w', String(minW));
            node.el.setAttribute('gs-min-h', String(minH));
            node.el.setAttribute('data-gs-min-w', String(minW));
            node.el.setAttribute('data-gs-min-h', String(minH));
          }

          const nextWidget: GridStackWidget = { x, y, w, h, minW, minH };
          gridStack.update(node.el!, nextWidget);
        }
        return;
      }

      const element = container.querySelector(`.widget-candidate[gs-id="${item.id}"]`);
      if (element && !element.classList.contains('grid-stack-item')) {
        if (!hasChanges) {
          gridStack.batchUpdate();
          hasChanges = true;
        }

        const newWidget: GridStackWidget = {
          id: item.id,
          x: item.grid.x,
          y: item.grid.y,
          w: item.grid.w,
          h: item.grid.h,
          minW,
          minH,
          autoPosition: false,
        };

        gridStack.makeWidget(element as HTMLElement, newWidget);
      }
    });

    const nodes = gridStack.engine?.nodes || [];
    nodes.forEach((node) => {
      if (node.id && !processedIds.has(String(node.id))) {
        if (!hasChanges) {
          gridStack.batchUpdate();
          hasChanges = true;
        }
        gridStack.removeWidget(node.el!, false);
      }
    });

    nodes.forEach((node) => {
      if (node.el && !container.contains(node.el)) {
        if (!hasChanges) {
          gridStack.batchUpdate();
          hasChanges = true;
        }
        gridStack.removeWidget(node.el, false);
      }
    });

    if (hasChanges) {
      gridStack.commit();
    }

    releaseIgnoreEvents(gridStack);
  }, [children, gridStack, items]);
};
