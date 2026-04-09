import { create } from 'zustand';
import type { DragPointer, DragRect, ShortcutContainer, ShortcutDragTarget } from '@/types';

interface ShortcutDragSession {
  shortcutId: string;
  source: ShortcutContainer;
  pointer: DragPointer;
  sourceRect?: DragRect;
  target: ShortcutDragTarget | null;
}

interface ShortcutDragState {
  activeDrag: ShortcutDragSession | null;
  startDrag: (session: Omit<ShortcutDragSession, 'target'>) => void;
  updatePointer: (pointer: DragPointer) => void;
  setTarget: (target: ShortcutDragTarget | null) => void;
  clearTarget: () => void;
  endDrag: () => void;
}

function isSamePointer(a: DragPointer, b: DragPointer) {
  return a.x === b.x && a.y === b.y;
}

function isSameRect(a?: DragRect, b?: DragRect) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

function isSameTarget(a: ShortcutDragTarget | null, b: ShortcutDragTarget | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;

  if (a.kind === 'section' && b.kind === 'section') {
    return (
      a.sectionId === b.sectionId &&
      a.index === b.index &&
      isSameRect(a.rect, b.rect)
    );
  }

  if (a.kind === 'dashboard' && b.kind === 'dashboard') {
    return (
      a.pageId === b.pageId &&
      a.grid.x === b.grid.x &&
      a.grid.y === b.grid.y &&
      a.grid.w === b.grid.w &&
      a.grid.h === b.grid.h &&
      isSameRect(a.rect, b.rect)
    );
  }

  return false;
}

export const useShortcutDragStore = create<ShortcutDragState>((set) => ({
  activeDrag: null,

  startDrag: (session) => {
    set({
      activeDrag: {
        ...session,
        target: null,
      },
    });
  },

  updatePointer: (pointer) => {
    set((state) => {
      if (!state.activeDrag) return state;
      if (isSamePointer(state.activeDrag.pointer, pointer)) return state;
      return {
        activeDrag: {
          ...state.activeDrag,
          pointer,
        },
      };
    });
  },

  setTarget: (target) => {
    set((state) => {
      if (!state.activeDrag) return state;
      if (isSameTarget(state.activeDrag.target, target)) return state;
      return {
        activeDrag: {
          ...state.activeDrag,
          target,
        },
      };
    });
  },

  clearTarget: () => {
    set((state) => {
      if (!state.activeDrag || !state.activeDrag.target) return state;
      return {
        activeDrag: {
          ...state.activeDrag,
          target: null,
        },
      };
    });
  },

  endDrag: () => {
    set({ activeDrag: null });
  },
}));
