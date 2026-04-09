import { useEffect, useState } from 'react';
import type { DragPointer } from '@/types';

interface GlobalDragMoveDetail {
  x?: number;
  y?: number;
  widgetId?: string;
  widgetType?: string;
}

interface GridStackShortcutDragState {
  pointer: DragPointer | null;
  shortcutId: string | null;
}

const EMPTY_DRAG_STATE: GridStackShortcutDragState = {
  pointer: null,
  shortcutId: null,
};

export function useGridStackShortcutDrag() {
  const [dragState, setDragState] = useState<GridStackShortcutDragState>(EMPTY_DRAG_STATE);

  useEffect(() => {
    const clearDrag = () => {
      setDragState((current) => (
        current.pointer || current.shortcutId ? EMPTY_DRAG_STATE : current
      ));
    };

    const handleDragMove = (event: Event) => {
      const detail = (event as CustomEvent<GlobalDragMoveDetail>).detail;
      if (
        detail?.widgetType !== 'shortcut' ||
        typeof detail.x !== 'number' ||
        typeof detail.y !== 'number'
      ) {
        clearDrag();
        return;
      }

      const nextX = detail.x;
      const nextY = detail.y;
      const nextShortcutId = detail.widgetId ?? null;

      setDragState((current) => {
        if (
          current.pointer?.x === nextX &&
          current.pointer?.y === nextY &&
          current.shortcutId === nextShortcutId
        ) {
          return current;
        }

        return {
          pointer: {
            x: nextX,
            y: nextY,
          },
          shortcutId: nextShortcutId,
        };
      });
    };

    window.addEventListener('global-drag-move', handleDragMove as EventListener);
    window.addEventListener('global-drag-stop', clearDrag as EventListener);

    return () => {
      window.removeEventListener('global-drag-move', handleDragMove as EventListener);
      window.removeEventListener('global-drag-stop', clearDrag as EventListener);
    };
  }, []);

  return dragState;
}
