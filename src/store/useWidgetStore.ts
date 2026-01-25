import { create } from 'zustand';
import { Widget, NewWidgetInput } from '../types';
import { getGridDimensions } from '@/constants/grid';
import { getMinDimensions } from '@/constants/widget-definitions';

interface WidgetState {
  widgets: Widget[];
  setWidgets: (widgets: Widget[]) => void;
  addWidget: (newItem: NewWidgetInput) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  removeWidget: (id: string) => void;
  updateLayout: (layout: { i: string; x: number; y: number; w: number; h: number }[], isMedium?: boolean, isMobile?: boolean) => void;
  checkSpaceAvailable: (pageId: string, w: number, h: number, isMedium: boolean, isMobile: boolean) => boolean;
  findAvailablePosition: (pageId: string, w: number, h: number, isMedium: boolean, isMobile: boolean) => { x: number, y: number } | null;
  getWidgetsByPage: (pageId: string) => Widget[];
  removeWidgetsByPage: (pageId: string) => void;
}

const hasOverlap = (
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean => {
  return !(x1 + w1 <= x2 || x1 >= x2 + w2 || y1 + h1 <= y2 || y1 >= y2 + h2);
};

const findAvailablePositionInGrid = (
  pageWidgets: Widget[],
  w: number,
  h: number,
  maxCols: number,
  maxRows: number
): { x: number; y: number } | null => {
  if (w > maxCols || h > maxRows) return null;
  
  const maxY = maxRows - h;
  const maxX = maxCols - w;
  
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const hasCollision = pageWidgets.some(widget =>
        hasOverlap(
          x, y, w, h,
          widget.grid.x, widget.grid.y, widget.grid.w, widget.grid.h
        )
      );
      
      if (!hasCollision) {
        return { x, y };
      }
    }
  }
  
  return null;
};

export const useWidgetStore = create<WidgetState>((set, get) => ({
  widgets: [],

  setWidgets: (widgets) => set({ widgets }),

  addWidget: (newItem) => {
    set(state => ({
      widgets: [
        ...state.widgets,
        {
          id: newItem.id,
          type: newItem.type === 'widget' ? (newItem.widgetType || 'clock') : 'shortcut',
          name: newItem.name,
          url: newItem.url,
          iconUrl: newItem.iconUrl,
          internalUrl: newItem.internalUrl,
          isSelfHosted: newItem.isSelfHosted,
          grid: {
            x: newItem.x ?? 0,
            y: newItem.y ?? Infinity,
            w: newItem.w,
            h: newItem.h
          },
          pageId: newItem.pageId,
          config: newItem.config,
          integrationId: newItem.integrationId
        }
      ]
    }));
  },

  updateWidget: (id, updates) => {
    set(state => ({
      widgets: state.widgets.map(w => (w.id === id ? { ...w, ...updates } : w))
    }));
  },

  removeWidget: (id) => {
    set(state => ({
      widgets: state.widgets.filter(w => w.id !== id)
    }));
  },

  updateLayout: (layout, isMedium = false, isMobile = false) => {
    if (!layout || layout.length === 0) return;

    const { maxRows } = getGridDimensions(isMedium, isMobile);

    if (layout.some((l) => l.y + l.h > maxRows)) {
      return;
    }

    set(state => {
      let hasChanges = false;
      let rejectionHappened = false;
      const newWidgets = state.widgets.map(widget => {
        const layoutItem = layout.find((l) => {
          const cleanId = l.i.startsWith('.$') ? l.i.substring(2) : l.i;
          return cleanId === widget.id;
        });

        if (layoutItem) {
          // Check minimum dimensions
          const { w: minW, h: minH } = getMinDimensions(
            (widget.type === 'widget' ? widget.widgetType : widget.type) || 'clock',
            widget.config || {}
          );

          if (layoutItem.w < minW || layoutItem.h < minH) {
            // New size is smaller than allowed minimum - ignore this update
            // But mark rejection to force a state refresh (snap back)
            rejectionHappened = true;
            return widget;
          }

          const newGrid = {
            x: Math.max(0, layoutItem.x),
            y: Math.max(0, layoutItem.y),
            w: layoutItem.w,
            h: layoutItem.h
          };

          const isDifferent =
            widget.grid.x !== newGrid.x ||
            widget.grid.y !== newGrid.y ||
            widget.grid.w !== newGrid.w ||
            widget.grid.h !== newGrid.h;

          if (isDifferent) {
            hasChanges = true;
            return { ...widget, grid: newGrid };
          }
        }
        return widget;
      });

      return (hasChanges || rejectionHappened) ? { widgets: newWidgets } : state;
    });
  },

  findAvailablePosition: (pageId: string, w: number, h: number, isMedium: boolean, isMobile: boolean) => {
    const { widgets } = get();
    const pageWidgets = widgets.filter(widget => widget.pageId === pageId);
    const { maxCols, maxRows } = getGridDimensions(isMedium, isMobile);
    
    return findAvailablePositionInGrid(pageWidgets, w, h, maxCols, maxRows);
  },

  checkSpaceAvailable: (pageId: string, w: number, h: number, isMedium: boolean, isMobile: boolean) => {
    return get().findAvailablePosition(pageId, w, h, isMedium, isMobile) !== null;
  },

  getWidgetsByPage: (pageId: string) => {
    return get().widgets.filter(w => w.pageId === pageId);
  },

  removeWidgetsByPage: (pageId: string) => {
    set(state => ({
      widgets: state.widgets.filter(w => w.pageId !== pageId)
    }));
  }
}));