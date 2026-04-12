"use client";

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { GridStackNode, GridStackOptions } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { GridStackProvider } from '@/gridstack-react/grid-stack-provider';
import { GridStackRenderProvider } from '@/gridstack-react/grid-stack-render-provider';
import { useGridStackContext } from '@/gridstack-react/grid-stack-context';
import { Widget } from '@/types/widget';
import { getMinDimensions } from "@/constants/widget-definitions";
import { GRID_BREAKPOINTS, type BreakpointKey } from '@/constants/grid';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import {
  getDashboardCellRect,
  resolveDashboardDropPosition,
} from '@/utils/dragUtils';
import { getDashboardInteractiveRect } from '@/utils/shortcutGridStackHandoff';

interface ExtendedGridStack {
  _ignoreEvents?: boolean;
  engine?: {
    maxRow: number;
    nodes: GridStackNode[];
  };
  opts: GridStackOptions;
  el: HTMLElement;
  getColumn(): number;
  column(column: number): void;
  cellHeight(val: number): void;
  margin(val: string): void;
  float(val: boolean): void;
  enable(): void;
  disable(): void;
  getGridItems(): HTMLElement[];
  batchUpdate(): void;
  commit(): void;
  makeWidget(el: HTMLElement, opts?: GridStackOptions): HTMLElement;
  removeWidget(el: HTMLElement, removeDOM?: boolean): void;
  update(el: HTMLElement, opts: GridStackOptions): void;
  cancelDrag(): void;
  on(name: string, callback: (...args: unknown[]) => void): void;
  off(name: string, callback: (...args: unknown[]) => void): void;
}

interface ExtendedGridStackElement extends HTMLElement {
  gridstackNode?: GridStackNode;
}

interface DashboardGridProps {
  children: React.ReactNode;
  pageId: string;
  items: Widget[];
  isEditing?: boolean;
  onLayoutChange?: (layout: GridStackNode[], allLayouts: { [key: string]: GridStackNode[] }) => void;
  onWidgetDragStop?: (widgetId: string, mouseX: number, mouseY: number) => void;
  rowHeight?: number;
  gap?: number;
  breakpoint?: BreakpointKey;
}

const DashboardGridContent: React.FC<DashboardGridProps> = ({ 
  children, 
  pageId,
  items,
  isEditing = false, 
  onLayoutChange,
  onWidgetDragStop,
  rowHeight = 100, 
  gap = 8,
  breakpoint = 'desktop',
}) => {
  const { gridStack } = useGridStackContext();
  const layoutCache = useRef<string>("");
  const dragPointer = useShortcutDragStore(state => state.activeDrag?.pointer ?? null);
  const draggedShortcutId = useShortcutDragStore(state => state.activeDrag?.shortcutId ?? null);
  const draggedShortcutSource = useShortcutDragStore(state => state.activeDrag?.source ?? null);
  const dashboardTarget = useShortcutDragStore((state) => {
    const target = state.activeDrag?.target;
    if (target?.kind !== 'dashboard' || target.pageId !== pageId) {
      return null;
    }

    return target;
  });
  const setDragTarget = useShortcutDragStore(state => state.setTarget);
  const clearDragTarget = useShortcutDragStore(state => state.clearTarget);
  const startShortcutDrag = useShortcutDragStore(state => state.startDrag);

  const externalShortcutTarget = dashboardTarget
    ? dashboardTarget.grid
    : null;
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

    const grid = gridStack as unknown as ExtendedGridStack;
    const gridRect = getDashboardInteractiveRect(gridStack, rowHeight);
    const isInside =
      clientX >= gridRect.left && clientX <= gridRect.right &&
      clientY >= gridRect.top && clientY <= gridRect.bottom;

    if (!isInside) return null;

    const elements = document.elementsFromPoint(clientX, clientY);
    const sourceSectionId = draggedShortcutSource?.type === 'section'
      ? draggedShortcutSource.sectionId
      : null;
    const isOverShortcutDropzone = elements.some((el) =>
      !el.classList.contains('ui-draggable-dragging') &&
      !el.classList.contains('grid-stack-item-dragging') &&
      Boolean(el.closest('[data-shortcut-dropzone]'))
    );
    const isOverDialog = elements.some((el) =>
      !el.classList.contains('ui-draggable-dragging') &&
      !el.classList.contains('grid-stack-item-dragging') &&
      Boolean(el.closest('[role="dialog"]'))
    );
    const isOverBlockedSection = elements.some((el) => {
      if (el.classList.contains('ui-draggable-dragging') || el.classList.contains('grid-stack-item-dragging')) {
        return false;
      }

      const sectionEl = el.closest('[data-widget-type="section"]') as HTMLElement | null;
      if (!sectionEl) return false;

      const hoveredSectionId = sectionEl.getAttribute('data-widget-id');
      return hoveredSectionId !== sourceSectionId;
    });

    if (isOverShortcutDropzone || isOverDialog || isOverBlockedSection) return null;

    const cols = gridStack.getColumn();
    const rawX = Math.max(0, Math.min(cols - 1, Math.floor((clientX - gridRect.left) / (gridRect.width / cols))));
    const rawY = Math.max(0, Math.floor((clientY - gridRect.top) / rowHeight));
    const maxRows = grid.opts.maxRow ?? GRID_BREAKPOINTS.desktop.rows;
    const visibleItems = items.filter(item => item.id !== draggedShortcutId);
    const resolved = resolveDashboardDropPosition(visibleItems, {
      x: rawX,
      y: rawY,
      w: 1,
      h: 1,
    }, cols, maxRows);

    if (!resolved) return null;

    return {
      pageId,
      ...resolved,
    };
  }, [draggedShortcutId, draggedShortcutSource, gridStack, items, pageId, rowHeight]);

  useEffect(() => {
    if (!gridStack) return;
    
    const grid = gridStack as unknown as ExtendedGridStack;
    
    // eslint-disable-next-line react-hooks/immutability
    grid._ignoreEvents = true;

    if (isEditing) gridStack.enable();
    else gridStack.disable();

    const { cols: newCol, rows: newMaxRow } = GRID_BREAKPOINTS[breakpoint];

    if (gridStack.opts.maxRow !== newMaxRow) {
        // eslint-disable-next-line react-hooks/immutability
        gridStack.opts.maxRow = newMaxRow;
        if (grid.engine) {
           grid.engine.maxRow = newMaxRow;
        }
    }

    if (gridStack.getColumn() !== newCol) {
        gridStack.column(newCol);
    }

    gridStack.cellHeight(rowHeight);
    gridStack.margin(`${gap}px`);
    gridStack.float(true);

    setTimeout(() => {
        if(grid) grid._ignoreEvents = false;
    }, 100);

  }, [breakpoint, gap, gridStack, isEditing, rowHeight]);


  useEffect(() => {
    if (!gridStack || !onLayoutChange) return;

    const handleChange = (_event: Event, _items: GridStackNode[]) => {
      const grid = gridStack as unknown as ExtendedGridStack;
      if (grid._ignoreEvents) return;

      const layout = gridStack.getGridItems().map(el => {
        const node = el.gridstackNode;
        return {
          i: node?.id || el.getAttribute('gs-id'),
          x: node?.x,
          y: node?.y,
          w: node?.w,
          h: node?.h
        };
      }).filter(item => item.i != null);

      const layoutString = JSON.stringify(layout);
      if (layoutString === layoutCache.current) return;
      layoutCache.current = layoutString;

      onLayoutChange(layout, { lg: layout });
    };

    gridStack.on('change', handleChange as (...args: unknown[]) => void);

    return () => {
      const grid = gridStack as unknown as ExtendedGridStack;
      grid.off('change', handleChange as (...args: unknown[]) => void);
    };
  }, [gridStack, onLayoutChange]);

  // Listen for dragstop to detect drops onto section widgets
  // Track mouse position during drag since gridstack event may not carry coordinates
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
    const trackMouse = (e: MouseEvent) => {
      if (!activeGridStackDrag) return;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      const elements = document.elementsFromPoint(lastMouseX, lastMouseY);
      const isOverShortcutDropzone = elements.some(el =>
        !el.classList.contains('ui-draggable-dragging') &&
        !el.classList.contains('grid-stack-item-dragging') &&
        Boolean(el.closest('[data-shortcut-dropzone]') || el.closest('[role="dialog"]'))
      );

      if (
        isOverShortcutDropzone &&
        activeGridStackDrag.widgetType === 'shortcut' &&
        !activeGridStackDrag.transferred &&
        !useShortcutDragStore.getState().activeDrag
      ) {
        const grid = gridStack as unknown as ExtendedGridStack;
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
        grid.cancelDrag();
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
        
        // Surface detection for GridStack dragged items
        const isOverSection = elements.some(el => 
            !el.classList.contains('ui-draggable-dragging') && 
            !el.classList.contains('grid-stack-item-dragging') &&
            (el.closest('[data-widget-type="section"]') || el.closest('[role="dialog"]'))
        );

        if (isOverSection) {
           document.body.classList.add('gs-over-section');
        } else {
           document.body.classList.remove('gs-over-section');
        }
      }
    };

    const handleDragStart = (_event: Event, el: HTMLElement) => {
      const node = (el as ExtendedGridStackElement).gridstackNode;
      const widgetId = node?.id || el.getAttribute('gs-id');

      activeGridStackDrag = widgetId
        ? {
            widgetId: String(widgetId),
            widgetType: el.getAttribute('data-widget-type'),
            element: el,
            transferred: false,
          }
        : null;

      document.addEventListener('mousemove', trackMouse);
    };

    const handleDragStop = (_event: Event, el: HTMLElement) => {
      document.removeEventListener('mousemove', trackMouse);
      document.body.classList.remove('gs-over-section');
      const didTransfer = activeGridStackDrag?.transferred ?? false;
      activeGridStackDrag = null;

      const node = (el as ExtendedGridStackElement).gridstackNode;
      const widgetId = node?.id || el.getAttribute('gs-id');
      if (!widgetId || !lastMouseX || !lastMouseY) {
        window.dispatchEvent(new CustomEvent('global-drag-stop'));
        return;
      }

      if (didTransfer) {
        window.dispatchEvent(new CustomEvent('global-drag-stop'));
        return;
      }

      // Temporarily hide the dragged element so elementsFromPoint can see through it
      const originalPointerEvents = el.style.pointerEvents;
      const originalVisibility = el.style.visibility;
      el.style.pointerEvents = 'none';
      el.style.visibility = 'hidden';

      // Call the drop handler BEFORE dispatching global-drag-stop so that
      // page.tsx can read data-placeholder-index from section grids before
      // the sections clear it.
      onWidgetDragStop(String(widgetId), lastMouseX, lastMouseY);

      // Restore
      el.style.pointerEvents = originalPointerEvents;
      el.style.visibility = originalVisibility;

      // Now clean up section placeholder state
      window.dispatchEvent(new CustomEvent('global-drag-stop'));
    };

    gridStack.on('dragstart', handleDragStart as (...args: unknown[]) => void);
    gridStack.on('dragstop', handleDragStop as (...args: unknown[]) => void);

    return () => {
      document.removeEventListener('mousemove', trackMouse);
      activeGridStackDrag = null;
      const grid = gridStack as unknown as ExtendedGridStack;
      grid.off('dragstart', handleDragStart as (...args: unknown[]) => void);
      grid.off('dragstop', handleDragStop as (...args: unknown[]) => void);
    };
  }, [gridStack, onWidgetDragStop, pageId, startShortcutDrag]);

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
      rect: getDashboardCellRect(gridStack.el.getBoundingClientRect(), gridStack.getColumn(), rowHeight, gridTarget),
    });
  }, [
    clearDragTarget,
    dashboardTarget,
    dragPointer,
    draggedShortcutId,
    gridStack,
    isEditing,
    pageId,
    resolveExternalShortcutTarget,
    rowHeight,
    setDragTarget,
  ]);

  useEffect(() => {
    if (!gridStack) return;
    const container = gridStack.el;
    if (!container) return;

    let hasChanges = false;
    const grid = gridStack as unknown as ExtendedGridStack;
    // eslint-disable-next-line react-hooks/immutability
    grid._ignoreEvents = true;

    const processedIds = new Set<string>();

    items.forEach((item) => {
      processedIds.add(item.id);
      const { w: minW, h: minH } = getMinDimensions(
        (item.type === 'widget' ? item.widgetType : item.type) || 'clock',
        item.config || {}
      );

      const node = grid.engine?.nodes.find((n) => n.id === item.id);

      if (node) {
        const x = item.grid.x;
        const y = item.grid.y;
        const w = item.grid.w;
        const h = item.grid.h;
        
        const needsUpdate = (
            node.x !== x || node.y !== y || node.w !== w || node.h !== h ||
            node.minW !== minW || node.minH !== minH
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

           gridStack.update(node.el!, {
             x, y, w, h,
             minW, minH,
           });
        }
      } else {
        const el = container.querySelector(`.widget-candidate[gs-id="${item.id}"]`);
        if (el && !el.classList.contains('grid-stack-item')) {
           if (!hasChanges) {
              gridStack.batchUpdate();
              hasChanges = true;
           }

           const options = {
             id: item.id,
             x: item.grid.x,
             y: item.grid.y,
             w: item.grid.w,
             h: item.grid.h,
             minW,
             minH,
             autoPosition: false
           };

           gridStack.makeWidget(el as HTMLElement, options);
        }
      }
    });

    const nodes = grid.engine?.nodes || [];
    nodes.forEach((node: GridStackNode) => {
      if (node.id && !processedIds.has(String(node.id))) {
         if (!hasChanges) {
            gridStack.batchUpdate();
            hasChanges = true;
         }
         gridStack.removeWidget(node.el!, false);
      }
    });

    nodes.forEach((node: GridStackNode) => {
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

    setTimeout(() => {
        if (grid) grid._ignoreEvents = false;
    }, 100);

  }, [gridStack, children, items]);

  return (
    <>
      {children}
      {externalShortcutTarget && externalShortcutRect && (
        <div
          key={`shortcut-placeholder-${externalShortcutTarget.x}-${externalShortcutTarget.y}`}
          className="shortcut-external-placeholder"
          style={{
            position: 'absolute',
            left: `${externalShortcutRect.left}px`,
            top: `${externalShortcutRect.top}px`,
            width: `${externalShortcutRect.width}px`,
            height: `${externalShortcutRect.height}px`,
            pointerEvents: 'none',
            zIndex: 90,
            border: '2px dashed var(--border-highlight)',
            borderRadius: 'var(--widget-radius, 24px)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            opacity: 0.8,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}
    </>
  );
};

export const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
  const initialOptions = useMemo<GridStackOptions>(() => ({
    column: GRID_BREAKPOINTS[props.breakpoint || 'desktop'].cols,
    maxRow: GRID_BREAKPOINTS[props.breakpoint || 'desktop'].rows,
    cellHeight: props.rowHeight,
    margin: `${props.gap}px`,
    disableResize: !props.isEditing,
    disableDrag: !props.isEditing,
    float: true, 
    animate: true,
    disableOneColumnMode: true,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally stable: these are init-only options
  }), []);

  return (
    <GridStackProvider initialOptions={initialOptions}>
      <style dangerouslySetInnerHTML={{ __html: `
        .grid-stack-item.ui-draggable-dragging,
        .grid-stack-item-dragging {
           z-index: 9999999 !important;
           pointer-events: none !important;
        }
        body.gs-over-section .grid-stack-placeholder {
           display: none !important;
        }
      `}} />
      <GridStackRenderProvider className="grid-stack">
        <DashboardGridContent {...props} />
      </GridStackRenderProvider>
    </GridStackProvider>
  );
};
