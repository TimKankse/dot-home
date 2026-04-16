import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import { useWidgetStore } from '@/store/useWidgetStore';

export function finishActiveShortcutDrag(shouldCommit: boolean) {
  const dragStore = useShortcutDragStore.getState();
  const activeDrag = dragStore.activeDrag;

  if (!activeDrag) return false;

  if (shouldCommit && activeDrag.target) {
    const moveShortcut = useWidgetStore.getState().moveShortcut;

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
  return true;
}
