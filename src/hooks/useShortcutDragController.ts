import { useEffect } from 'react';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import { finishActiveShortcutDrag } from '@/utils/shortcutDragSession';

export function useShortcutDragController(enabled: boolean) {
  const activeShortcutId = useShortcutDragStore(state => state.activeDrag?.shortcutId);

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

    const handlePointerUp = () => {
      finishActiveShortcutDrag(true);
    };

    const handlePointerCancel = () => {
      finishActiveShortcutDrag(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finishActiveShortcutDrag(false);
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
  }, [activeShortcutId, enabled]);
}
