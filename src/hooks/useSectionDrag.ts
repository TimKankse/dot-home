import { useEffect, useMemo, useRef, useState } from 'react';
import { Widget } from '@/types/widget';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import { useWidgetStore } from '@/store/useWidgetStore';
import { useGridStackShortcutDrag } from '@/hooks/useGridStackShortcutDrag';
import { useGridStackContext } from '@/gridstack-react/grid-stack-context';
import { calcInsertIndex, measureGridSlotRect } from '@/utils/dragUtils';
import {
  bootstrapGridStackShortcutDrag,
  resolveDashboardShortcutGridTarget,
} from '@/utils/shortcutGridStackHandoff';

interface UseSectionDragOptions {
  sectionId: string;
  pageId?: string;
  dashboardHandoff?: 'immediate' | 'disabled';
  isEditing: boolean;
  gridRef: React.RefObject<HTMLDivElement | null>;
  shortcuts: Widget[];
  pageShortcuts?: Widget[];
}

function pointIsInsideRect(
  point: { x: number; y: number },
  rect: DOMRect,
) {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function resolveAbsoluteInsertIndex(
  visualIndex: number,
  visibleShortcuts: Widget[],
  currentIds: string[],
  excludedShortcutId?: string | null,
): number {
  const filteredIds = excludedShortcutId
    ? currentIds.filter(id => id !== excludedShortcutId)
    : currentIds;
  const visibleItems = excludedShortcutId
    ? visibleShortcuts.filter(shortcut => shortcut.id !== excludedShortcutId)
    : visibleShortcuts;

  if (visualIndex < visibleItems.length) {
    const nextItem = visibleItems[visualIndex];
    const absoluteIndex = filteredIds.indexOf(nextItem.id);
    return absoluteIndex !== -1 ? absoluteIndex : filteredIds.length;
  }

  return filteredIds.length;
}

export function useSectionDrag({
  sectionId,
  pageId,
  dashboardHandoff = 'disabled',
  isEditing,
  gridRef,
  shortcuts,
  pageShortcuts,
}: UseSectionDragOptions) {
  const { gridStack } = useGridStackContext();
  const widgets = useWidgetStore(state => state.widgets);
  const moveShortcut = useWidgetStore(state => state.moveShortcut);
  const draggedShortcutId = useShortcutDragStore(state => state.activeDrag?.shortcutId ?? null);
  const dragPointer = useShortcutDragStore(state => state.activeDrag?.pointer ?? null);
  const gridStackDrag = useGridStackShortcutDrag();
  const sectionTarget = useShortcutDragStore((state) => {
    const target = state.activeDrag?.target;
    if (target?.kind !== 'section' || target.sectionId !== sectionId) {
      return null;
    }

    return target;
  });
  const dashboardTarget = useShortcutDragStore((state) => {
    const target = state.activeDrag?.target;
    if (target?.kind !== 'dashboard' || target.pageId !== pageId) {
      return null;
    }

    return target;
  });
  const setDragTarget = useShortcutDragStore(state => state.setTarget);
  const clearDragTarget = useShortcutDragStore(state => state.clearTarget);
  const endDrag = useShortcutDragStore(state => state.endDrag);
  const [externalTargetIndex, setExternalTargetIndex] = useState<number | null>(null);
  const isHandingOffRef = useRef(false);

  const placeholderAbsoluteIndex = sectionTarget?.index ?? externalTargetIndex;

  const placeholderIndex = useMemo(() => {
    if (placeholderAbsoluteIndex === null) return null;

    if (!pageShortcuts) {
      return placeholderAbsoluteIndex;
    }

    const filteredIds = shortcuts
      .map(shortcut => shortcut.id)
      .filter(id => id !== draggedShortcutId && id !== gridStackDrag.shortcutId);
    const visibleIds = pageShortcuts
      .map(shortcut => shortcut.id)
      .filter(id => id !== draggedShortcutId && id !== gridStackDrag.shortcutId);

    for (let index = 0; index < visibleIds.length; index += 1) {
      const absoluteIndex = filteredIds.indexOf(visibleIds[index]);
      if (placeholderAbsoluteIndex <= absoluteIndex) {
        return index;
      }
    }

    return visibleIds.length;
  }, [draggedShortcutId, gridStackDrag.shortcutId, pageShortcuts, placeholderAbsoluteIndex, shortcuts]);

  useEffect(() => {
    if (!isEditing || !dragPointer || !draggedShortcutId || !gridRef.current) return;

    const grid = gridRef.current;
    const gridRect = grid.getBoundingClientRect();
    const { x, y } = dragPointer;
    const isOver =
      x >= gridRect.left && x <= gridRect.right &&
      y >= gridRect.top && y <= gridRect.bottom;

    if (!isOver) {
      const activeTarget = useShortcutDragStore.getState().activeDrag?.target;
      if (activeTarget?.kind === 'section' && activeTarget.sectionId === sectionId) {
        clearDragTarget();
      }
      return;
    }

    const edgeThreshold = 32;
    if (y < gridRect.top + edgeThreshold) {
      grid.scrollTop -= 18;
    } else if (y > gridRect.bottom - edgeThreshold) {
      grid.scrollTop += 18;
    }

    const visualIndex = calcInsertIndex(grid, x, y);
    const currentIds = shortcuts.map(shortcut => shortcut.id);

    const targetIndex = pageShortcuts
      ? resolveAbsoluteInsertIndex(visualIndex, pageShortcuts, currentIds, draggedShortcutId)
      : Math.max(0, Math.min(visualIndex, currentIds.filter(id => id !== draggedShortcutId).length));

    setDragTarget({
      kind: 'section',
      sectionId,
      index: targetIndex,
      rect: measureGridSlotRect(grid, visualIndex),
    });
  }, [
    clearDragTarget,
    dragPointer,
    draggedShortcutId,
    gridRef,
    isEditing,
    pageShortcuts,
    sectionId,
    sectionTarget,
    setDragTarget,
    shortcuts,
  ]);

  useEffect(() => {
    let nextTargetIndex: number | null = null;

    if (isEditing && !draggedShortcutId && gridRef.current && gridStackDrag.pointer) {
      const grid = gridRef.current;
      const gridRect = grid.getBoundingClientRect();
      const { x, y } = gridStackDrag.pointer;
      const isOver =
        x >= gridRect.left && x <= gridRect.right &&
        y >= gridRect.top && y <= gridRect.bottom;

      if (isOver) {
        const visualIndex = calcInsertIndex(grid, x, y);
        const currentIds = shortcuts.map(shortcut => shortcut.id);

        nextTargetIndex = pageShortcuts
          ? resolveAbsoluteInsertIndex(visualIndex, pageShortcuts, currentIds)
          : Math.max(0, Math.min(visualIndex, currentIds.length));
      }
    }

    const frame = window.requestAnimationFrame(() => {
      setExternalTargetIndex((current) => (current === nextTargetIndex ? current : nextTargetIndex));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [draggedShortcutId, gridRef, gridStackDrag.pointer, isEditing, pageShortcuts, shortcuts]);

  useEffect(() => {
    if (!draggedShortcutId) {
      isHandingOffRef.current = false;
    }
  }, [draggedShortcutId]);

  useEffect(() => {
    if (
      dashboardHandoff !== 'immediate' ||
      !isEditing ||
      !draggedShortcutId ||
      !dragPointer ||
      !pageId ||
      !gridRef.current ||
      !gridStack ||
      isHandingOffRef.current
    ) {
      return;
    }

    const grid = gridRef.current;
    const sectionRect = grid.getBoundingClientRect();
    const isInsideSectionGrid = pointIsInsideRect(dragPointer, sectionRect);

    if (isInsideSectionGrid) return;

    const sectionWidget = grid.closest('[data-widget-id]') as HTMLElement | null;
    const isInsideSectionWidget = sectionWidget
      ? pointIsInsideRect(dragPointer, sectionWidget.getBoundingClientRect())
      : false;

    if (isInsideSectionWidget) return;

    const dashboardRect = gridStack.el.getBoundingClientRect();
    const isInsideDashboard = pointIsInsideRect(dragPointer, dashboardRect);

    if (!isInsideDashboard) return;

    const elements = document.elementsFromPoint(dragPointer.x, dragPointer.y);
    const isOverDifferentSectionWidget = elements.some((el) => {
      const sectionElement = el.closest('[data-widget-type="section"]') as HTMLElement | null;
      return Boolean(sectionElement && sectionElement.getAttribute('data-widget-id') !== sectionId);
    });
    const isOverShortcutDropzone = elements.some((el) => {
      const shortcutDropzone = el.closest('[data-shortcut-dropzone]') as HTMLElement | null;
      if (shortcutDropzone) {
        return shortcutDropzone.getAttribute('data-section-id') !== sectionId;
      }

      return Boolean(el.closest('[role="dialog"]'));
    });

    if (isOverDifferentSectionWidget) return;
    if (isOverShortcutDropzone) return;

    const targetGrid = dashboardTarget?.grid ?? resolveDashboardShortcutGridTarget({
      widgets,
      pageId,
      shortcutId: draggedShortcutId,
      gridStack,
      clientX: dragPointer.x,
      clientY: dragPointer.y,
    });

    if (!targetGrid) return;

    isHandingOffRef.current = true;
    moveShortcut(draggedShortcutId, {
      container: {
        type: 'dashboard',
        pageId,
      },
      grid: targetGrid,
    });

    endDrag();
    void bootstrapGridStackShortcutDrag(gridStack, draggedShortcutId, dragPointer).finally(() => {
      isHandingOffRef.current = false;
    });
  }, [
    dashboardHandoff,
    dragPointer,
    draggedShortcutId,
    dashboardTarget,
    endDrag,
    gridRef,
    gridStack,
    isEditing,
    moveShortcut,
    pageId,
    sectionId,
    widgets,
  ]);

  return {
    placeholderIndex,
    placeholderAbsoluteIndex,
    draggedShortcutId,
  };
}
