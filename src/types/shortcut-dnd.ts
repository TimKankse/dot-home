import type { GridPosition } from './widget';

export type ShortcutContainer =
  | {
      type: 'dashboard';
      pageId: string;
    }
  | {
      type: 'section';
      sectionId: string;
    };

export interface ShortcutMoveToDashboardTarget {
  container: {
    type: 'dashboard';
    pageId: string;
  };
  grid?: GridPosition;
}

export interface ShortcutMoveToSectionTarget {
  container: {
    type: 'section';
    sectionId: string;
  };
  index?: number;
}

export type ShortcutMoveTarget = ShortcutMoveToDashboardTarget | ShortcutMoveToSectionTarget;

export interface ShortcutDragData {
  type: 'section-shortcut-drag';
  shortcutId: string;
  sectionId: string;
}

export interface DragRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DragPointer {
  x: number;
  y: number;
}

export type ShortcutDragTarget =
  | {
      kind: 'dashboard';
      pageId: string;
      grid: GridPosition;
      rect?: DragRect;
    }
  | {
      kind: 'section';
      sectionId: string;
      index: number;
      rect?: DragRect;
    };
