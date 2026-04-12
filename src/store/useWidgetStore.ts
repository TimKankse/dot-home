import { create } from 'zustand';
import { getGridDimensions, type BreakpointKey, type ResponsiveBreakpointKey } from '@/constants/grid';
import { getMinDimensions } from '@/constants/widget-definitions';
import type { LayoutItem, NewWidgetInput, ResponsiveLayouts, Widget } from '@/types';
import type {
  ShortcutContainer,
  ShortcutMoveTarget,
  ShortcutMoveToDashboardTarget,
  ShortcutMoveToSectionTarget,
} from '@/types';
import {
  getLayoutItemsFromWidgets,
  getPageLayoutState,
  getResponsiveSegmentLocalY,
  normalizeResponsiveLayouts,
  resolveResponsivePageLayout,
  sanitizeResponsiveLayoutsForWidgets,
} from '@/utils/gridUtils';

interface WidgetState {
  widgets: Widget[];
  responsiveLayouts: ResponsiveLayouts;
  setWidgets: (widgets: Widget[]) => void;
  setResponsiveLayouts: (responsiveLayouts: ResponsiveLayouts) => void;
  setDashboardState: (widgets: Widget[], responsiveLayouts: ResponsiveLayouts) => void;
  addWidget: (newItem: NewWidgetInput) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  removeWidget: (id: string) => void;
  moveShortcut: (shortcutId: string, target: ShortcutMoveTarget) => void;
  findShortcutContainer: (shortcutId: string) => ShortcutContainer | null;
  updateLayout: (pageId: string, breakpoint: BreakpointKey, layout: LayoutItem[]) => void;
  materializeResponsiveLayout: (pageId: string, breakpoint: ResponsiveBreakpointKey) => void;
  resetResponsiveLayout: (pageId: string, breakpoint: ResponsiveBreakpointKey) => void;
  getResponsiveLayoutState: (pageId: string, breakpoint: BreakpointKey) => { isCustom: boolean; sourceBreakpoint: BreakpointKey };
  checkSpaceAvailable: (pageId: string, w: number, h: number, breakpoint: BreakpointKey) => boolean;
  findAvailablePosition: (pageId: string, w: number, h: number, breakpoint: BreakpointKey) => { x: number, y: number } | null;
  getWidgetsByPage: (pageId: string) => Widget[];
  getRenderableWidgetsByPage: (pageId: string) => Widget[];
  removeWidgetsByPage: (pageId: string) => void;
  removeResponsiveLayoutsByPage: (pageId: string) => void;
}

const hasOverlap = (
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
): boolean => {
  return !(x1 + w1 <= x2 || x1 >= x2 + w2 || y1 + h1 <= y2 || y1 >= y2 + h2);
};

const getSectionShortcutIds = (section: Widget): string[] => {
  return ((section.config?.shortcutIds as string[] | undefined) || []).filter(Boolean);
};

const updateSectionShortcutIds = (section: Widget, shortcutIds: string[]): Widget => ({
  ...section,
  config: {
    ...section.config,
    shortcutIds,
  },
});

const findContainingSection = (widgets: Widget[], shortcutId: string): Widget | undefined => {
  return widgets.find(widget =>
    widget.type === 'section' &&
    getSectionShortcutIds(widget).includes(shortcutId),
  );
};

const isSectionMoveTarget = (target: ShortcutMoveTarget): target is ShortcutMoveToSectionTarget => {
  return target.container.type === 'section';
};

const isDashboardMoveTarget = (target: ShortcutMoveTarget): target is ShortcutMoveToDashboardTarget => {
  return target.container.type === 'dashboard';
};

const getVisiblePageWidgets = (widgets: Widget[], pageId: string): Widget[] => {
  const hiddenShortcutIds = new Set<string>();

  widgets.forEach((widget) => {
    if (widget.type === 'section' && widget.config?.shortcutIds) {
      (widget.config.shortcutIds as string[]).forEach((shortcutId) => hiddenShortcutIds.add(shortcutId));
    }
  });

  return widgets.filter((widget) =>
    widget.pageId === pageId && !hiddenShortcutIds.has(widget.id),
  );
};

const findAvailablePositionInGrid = (
  pageWidgets: Widget[],
  w: number,
  h: number,
  maxCols: number,
  maxRows: number,
): { x: number; y: number } | null => {
  if (w > maxCols || h > maxRows) return null;

  const maxY = maxRows - h;
  const maxX = maxCols - w;

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const hasCollision = pageWidgets.some((widget) =>
        hasOverlap(
          x, y, w, h,
          widget.grid.x, widget.grid.y, widget.grid.w, widget.grid.h,
        ),
      );

      if (!hasCollision) {
        return { x, y };
      }
    }
  }

  return null;
};

const findAvailablePositionInResponsiveGrid = (
  pageWidgets: Widget[],
  w: number,
  h: number,
  maxCols: number,
  maxRows: number,
): { x: number; y: number } | null => {
  if (w > maxCols || h > maxRows) return null;

  const existingSegmentCount = pageWidgets.reduce<number>(
    (maxSegmentCount, widget) => Math.max(maxSegmentCount, Math.floor(widget.grid.y / maxRows) + 1),
    1,
  );
  const maxSegments = existingSegmentCount + 1;
  const maxGlobalY = (maxSegments * maxRows) - h;
  const maxX = maxCols - w;

  for (let y = 0; y <= maxGlobalY; y += 1) {
    const localY = y % maxRows;
    if (localY + h > maxRows) {
      y += maxRows - localY - 1;
      continue;
    }

    for (let x = 0; x <= maxX; x += 1) {
      const hasCollision = pageWidgets.some((widget) =>
        hasOverlap(
          x, y, w, h,
          widget.grid.x, widget.grid.y, widget.grid.w, widget.grid.h,
        ),
      );

      if (!hasCollision) {
        return { x, y };
      }
    }
  }

  return null;
};

const removeResponsiveLayoutPage = (
  responsiveLayouts: ResponsiveLayouts,
  pageId: string,
): ResponsiveLayouts => {
  const nextLayouts = normalizeResponsiveLayouts(responsiveLayouts);

  (Object.keys(nextLayouts) as ResponsiveBreakpointKey[]).forEach((breakpoint) => {
    const pageLayouts = nextLayouts[breakpoint];
    if (!pageLayouts?.[pageId]) return;

    const { [pageId]: _removed, ...rest } = pageLayouts;
    if (Object.keys(rest).length > 0) {
      nextLayouts[breakpoint] = rest;
    } else {
      delete nextLayouts[breakpoint];
    }
  });

  return nextLayouts;
};

export const useWidgetStore = create<WidgetState>((set, get) => ({
  widgets: [],
  responsiveLayouts: {},

  setWidgets: (widgets) => set((state) => ({
    widgets,
    responsiveLayouts: sanitizeResponsiveLayoutsForWidgets(widgets, state.responsiveLayouts),
  })),

  setResponsiveLayouts: (responsiveLayouts) => set((state) => ({
    responsiveLayouts: sanitizeResponsiveLayoutsForWidgets(
      state.widgets,
      normalizeResponsiveLayouts(responsiveLayouts),
    ),
  })),

  setDashboardState: (widgets, responsiveLayouts) => set({
    widgets,
    responsiveLayouts: sanitizeResponsiveLayoutsForWidgets(
      widgets,
      normalizeResponsiveLayouts(responsiveLayouts),
    ),
  }),

  addWidget: (newItem) => {
    set((state) => ({
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
            h: newItem.h,
          },
          pageId: newItem.pageId,
          config: newItem.config,
          integrationId: newItem.integrationId,
        },
      ],
    }));
  },

  updateWidget: (id, updates) => {
    set((state) => ({
      widgets: state.widgets.map((widget) => (widget.id === id ? { ...widget, ...updates } : widget)),
    }));
  },

  removeWidget: (id) => {
    set((state) => {
      const widgets = state.widgets.filter((widget) => widget.id !== id);
      return {
        widgets,
        responsiveLayouts: sanitizeResponsiveLayoutsForWidgets(widgets, state.responsiveLayouts),
      };
    });
  },

  moveShortcut: (shortcutId, target) => {
    set((state) => {
      const shortcut = state.widgets.find((widget) => widget.id === shortcutId);
      if (!shortcut) return state;

      const sourceSection = findContainingSection(state.widgets, shortcutId);
      let nextWidgets = state.widgets;

      if (sourceSection) {
        const nextSourceIds = getSectionShortcutIds(sourceSection).filter((id) => id !== shortcutId);
        nextWidgets = nextWidgets.map((widget) =>
          widget.id === sourceSection.id ? updateSectionShortcutIds(widget, nextSourceIds) : widget,
        );
      }

      if (isSectionMoveTarget(target)) {
        const targetSection = nextWidgets.find((widget) => widget.id === target.container.sectionId);
        if (!targetSection) return state;

        const targetIds = getSectionShortcutIds(targetSection).filter((id) => id !== shortcutId);
        const insertIndex = Math.max(0, Math.min(target.index ?? targetIds.length, targetIds.length));
        const nextTargetIds = [...targetIds];
        nextTargetIds.splice(insertIndex, 0, shortcutId);

        nextWidgets = nextWidgets.map((widget) => {
          if (widget.id === targetSection.id) {
            return updateSectionShortcutIds(widget, nextTargetIds);
          }

          if (widget.id === shortcutId) {
            return {
              ...widget,
              pageId: targetSection.pageId,
            };
          }

          return widget;
        });
      } else if (isDashboardMoveTarget(target)) {
        nextWidgets = nextWidgets.map((widget) => {
          if (widget.id !== shortcutId) return widget;

          return {
            ...widget,
            pageId: target.container.pageId,
            grid: target.grid ? { ...widget.grid, ...target.grid } : widget.grid,
          };
        });
      } else {
        return state;
      }

      return {
        widgets: nextWidgets,
        responsiveLayouts: sanitizeResponsiveLayoutsForWidgets(nextWidgets, state.responsiveLayouts),
      };
    });
  },

  findShortcutContainer: (shortcutId) => {
    const { widgets } = get();
    const sourceSection = findContainingSection(widgets, shortcutId);
    if (sourceSection) {
      return {
        type: 'section',
        sectionId: sourceSection.id,
      };
    }

    const shortcut = widgets.find((widget) => widget.id === shortcutId);
    if (!shortcut) return null;

    return {
      type: 'dashboard',
      pageId: shortcut.pageId,
    };
  },

  updateLayout: (pageId, breakpoint, layout) => {
    if (!layout || layout.length === 0) return;

    const cleanLayout = layout.map((item) => ({
      ...item,
      i: item.i.startsWith('.$') ? item.i.substring(2) : item.i,
    }));
    const { maxCols, maxRows } = getGridDimensions(breakpoint);

    const hasOutOfBoundsItem = cleanLayout.some((item) => {
      if (item.x < 0 || item.y < 0 || item.w <= 0 || item.h <= 0) {
        return true;
      }

      if (item.x + item.w > maxCols || item.w > maxCols || item.h > maxRows) {
        return true;
      }

      if (breakpoint !== 'desktop' && getResponsiveSegmentLocalY(item.y, breakpoint) + item.h > maxRows) {
        return true;
      }

      return breakpoint === 'desktop' && item.y + item.h > maxRows;
    });

    if (hasOutOfBoundsItem) {
      return;
    }

    set((state) => {
      let hasChanges = false;
      let rejectionHappened = false;

      if (breakpoint === 'desktop') {
        const widgets = state.widgets.map((widget) => {
          const layoutItem = cleanLayout.find((item) => item.i === widget.id);
          if (!layoutItem) return widget;

          const { w: minW, h: minH } = getMinDimensions(
            (widget.type === 'widget' ? widget.widgetType : widget.type) || 'clock',
            widget.config || {},
          );

          if (layoutItem.w < minW || layoutItem.h < minH) {
            rejectionHappened = true;
            return widget;
          }

          const newGrid = {
            x: Math.max(0, Math.min(layoutItem.x, maxCols - layoutItem.w)),
            y: Math.max(0, layoutItem.y),
            w: layoutItem.w,
            h: layoutItem.h,
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

          return widget;
        });

        if (!hasChanges && !rejectionHappened) {
          return state;
        }

        return {
          widgets,
          responsiveLayouts: sanitizeResponsiveLayoutsForWidgets(widgets, state.responsiveLayouts),
        };
      }

      const nextPageLayout: LayoutItem[] = [];
      const pageWidgets = getVisiblePageWidgets(state.widgets, pageId);
      const resolvedPageLayout = resolveResponsivePageLayout(
        pageWidgets,
        pageId,
        breakpoint,
        state.responsiveLayouts,
      );
      const widgetsById = new Map(resolvedPageLayout.widgets.map((widget) => [widget.id, widget]));
      const mergedLayoutById = new Map(
        getLayoutItemsFromWidgets(resolvedPageLayout.widgets).map((item) => [item.i, item]),
      );

      for (const item of cleanLayout) {
        const widget = widgetsById.get(item.i);
        if (!widget) continue;

        const { w: minW, h: minH } = getMinDimensions(
          (widget.type === 'widget' ? widget.widgetType : widget.type) || 'clock',
          widget.config || {},
        );

        if (item.w < minW || item.h < minH) {
          rejectionHappened = true;
          continue;
        }

        nextPageLayout.push({
          i: item.i,
          x: Math.max(0, Math.min(item.x, maxCols - item.w)),
          y: Math.max(0, item.y),
          w: item.w,
          h: item.h,
        });
      }

      nextPageLayout.forEach((item) => {
        mergedLayoutById.set(item.i, item);
      });

      const responsiveLayouts = normalizeResponsiveLayouts(state.responsiveLayouts);
      const draftPageLayout = resolvedPageLayout.widgets
        .map((widget) => mergedLayoutById.get(widget.id))
        .filter((item): item is LayoutItem => item !== undefined);
      const draftResponsiveLayouts: ResponsiveLayouts = {
        ...responsiveLayouts,
        [breakpoint]: {
          ...(responsiveLayouts[breakpoint] || {}),
          [pageId]: draftPageLayout,
        },
      };
      const legalizedLayout = resolveResponsivePageLayout(
        pageWidgets,
        pageId,
        breakpoint,
        draftResponsiveLayouts,
      );
      const nextLegalizedPageLayout = getLayoutItemsFromWidgets(legalizedLayout.widgets);
      const nextBreakpointLayouts = {
        ...(draftResponsiveLayouts[breakpoint] || {}),
        [pageId]: nextLegalizedPageLayout,
      };
      const previousLayout = responsiveLayouts[breakpoint]?.[pageId] || [];

      hasChanges = JSON.stringify(previousLayout) !== JSON.stringify(nextLegalizedPageLayout);

      if (!hasChanges && !rejectionHappened) {
        return state;
      }

      return {
        responsiveLayouts: {
          ...responsiveLayouts,
          [breakpoint]: nextBreakpointLayouts,
        },
      };
    });
  },

  materializeResponsiveLayout: (pageId, breakpoint) => {
    set((state) => {
      const pageWidgets = getVisiblePageWidgets(state.widgets, pageId);
      const resolved = resolveResponsivePageLayout(pageWidgets, pageId, breakpoint, state.responsiveLayouts);
      const nextPageLayout = getLayoutItemsFromWidgets(resolved.widgets);
      const responsiveLayouts = normalizeResponsiveLayouts(state.responsiveLayouts);
      const previousLayout = responsiveLayouts[breakpoint]?.[pageId] || [];

      if (JSON.stringify(previousLayout) === JSON.stringify(nextPageLayout)) {
        return state;
      }

      return {
        responsiveLayouts: {
          ...responsiveLayouts,
          [breakpoint]: {
            ...(responsiveLayouts[breakpoint] || {}),
            [pageId]: nextPageLayout,
          },
        },
      };
    });
  },

  resetResponsiveLayout: (pageId, breakpoint) => {
    set((state) => {
      const responsiveLayouts = normalizeResponsiveLayouts(state.responsiveLayouts);
      const pageLayouts = responsiveLayouts[breakpoint];
      if (!pageLayouts?.[pageId]) {
        return state;
      }

      const { [pageId]: _removed, ...rest } = pageLayouts;
      if (Object.keys(rest).length === 0) {
        const nextLayouts = { ...responsiveLayouts };
        delete nextLayouts[breakpoint];
        return { responsiveLayouts: nextLayouts };
      }

      return {
        responsiveLayouts: {
          ...responsiveLayouts,
          [breakpoint]: rest,
        },
      };
    });
  },

  getResponsiveLayoutState: (pageId, breakpoint) => {
    return getPageLayoutState(pageId, breakpoint, get().responsiveLayouts);
  },

  findAvailablePosition: (pageId, w, h, breakpoint) => {
    const pageWidgets = getVisiblePageWidgets(get().widgets, pageId);
    const resolvedPageLayout = resolveResponsivePageLayout(
      pageWidgets,
      pageId,
      breakpoint,
      get().responsiveLayouts,
    );
    const { maxCols, maxRows } = getGridDimensions(breakpoint);

    if (breakpoint === 'desktop') {
      return findAvailablePositionInGrid(resolvedPageLayout.widgets, w, h, maxCols, maxRows);
    }

    return findAvailablePositionInResponsiveGrid(resolvedPageLayout.widgets, w, h, maxCols, maxRows);
  },

  checkSpaceAvailable: (pageId, w, h, breakpoint) => {
    return get().findAvailablePosition(pageId, w, h, breakpoint) !== null;
  },

  getWidgetsByPage: (pageId) => {
    return get().widgets.filter((widget) => widget.pageId === pageId);
  },

  getRenderableWidgetsByPage: (pageId) => {
    return getVisiblePageWidgets(get().widgets, pageId);
  },

  removeWidgetsByPage: (pageId) => {
    set((state) => {
      const widgets = state.widgets.filter((widget) => widget.pageId !== pageId);
      return {
        widgets,
        responsiveLayouts: removeResponsiveLayoutPage(
          sanitizeResponsiveLayoutsForWidgets(widgets, state.responsiveLayouts),
          pageId,
        ),
      };
    });
  },

  removeResponsiveLayoutsByPage: (pageId) => {
    set((state) => ({
      responsiveLayouts: removeResponsiveLayoutPage(state.responsiveLayouts, pageId),
    }));
  },
}));
