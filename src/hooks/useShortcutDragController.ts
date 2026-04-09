import { useEffect } from 'react';
import { useWidgetStore } from '@/store/useWidgetStore';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';

export function useShortcutDragController(enabled: boolean) {
  const activeShortcutId = useShortcutDragStore(state => state.activeDrag?.shortcutId);
  const moveShortcut = useWidgetStore(state => state.moveShortcut);

  useEffect(() => {
    if (!enabled || !activeShortcutId) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const handlePointerMove = (event: PointerEvent) => {
      const dragStore = useShortcutDragStore.getState();
      if (!dragStore.activeDrag) return;

      dragStore.updatePointer({
        x: event.clientX,
        y: event.clientY,
      });
    };

    const finishDrag = (shouldCommit: boolean) => {
      const dragStore = useShortcutDragStore.getState();
      const activeDrag = dragStore.activeDrag;
      if (!activeDrag) return;

      if (shouldCommit && activeDrag.target) {
        if (activeDrag.target.kind === 'section') {
          moveShortcut(activeDrag.shortcutId, {
            container: {
              type: 'section',
              sectionId: activeDrag.target.sectionId,
            },
            index: activeDrag.target.index,
          });
        } else {
          moveShortcut(activeDrag.shortcutId, {
            container: {
              type: 'dashboard',
              pageId: activeDrag.target.pageId,
            },
            grid: activeDrag.target.grid,
          });
        }
      }

      dragStore.endDrag();
    };

    const handlePointerUp = () => {
      finishDrag(true);
    };

    const handlePointerCancel = () => {
      finishDrag(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finishDrag(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerCancel, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeShortcutId, enabled, moveShortcut]);
}
