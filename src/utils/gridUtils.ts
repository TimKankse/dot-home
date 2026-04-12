import { getGridDimensions, type BreakpointKey } from '@/constants/grid';
import { getMinDimensions } from '@/constants/widget-definitions';
import { LayoutItem, ResponsiveLayouts, Widget } from '@/types';

type PlacedLayoutItem = LayoutItem;

export interface ResolvedPageLayout {
  widgets: Widget[];
  isCustom: boolean;
  sourceBreakpoint: BreakpointKey;
}

const MAX_AUTO_PACK_ROWS = 1000;

const hasOverlap = (
  a: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>,
  b: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>,
): boolean => {
  return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
};

const getWidgetTypeKey = (widget: Widget): string => {
  return (widget.type === 'widget' ? widget.widgetType : widget.type) || 'clock';
};

const sortWidgetsByGrid = (widgets: Widget[]): Widget[] => {
  return [...widgets].sort((a, b) => {
    if (a.grid.y !== b.grid.y) return a.grid.y - b.grid.y;
    if (a.grid.x !== b.grid.x) return a.grid.x - b.grid.x;
    return a.id.localeCompare(b.id);
  });
};

const normalizeSize = (
  widget: Widget,
  w: number,
  h: number,
  maxCols: number,
  maxRows: number,
): { w: number; h: number } => {
  const min = getMinDimensions(getWidgetTypeKey(widget), widget.config || {});
  const normalizedWidth = Math.min(maxCols, Math.max(min.w, w));
  const normalizedHeight = Math.min(maxRows, Math.max(min.h, h));

  return {
    w: normalizedWidth,
    h: normalizedHeight,
  };
};

const findAvailableSlot = (
  placed: PlacedLayoutItem[],
  w: number,
  h: number,
  maxCols: number,
  maxRows: number = MAX_AUTO_PACK_ROWS,
): { x: number; y: number } | null => {
  for (let y = 0; y <= Math.max(0, maxRows - h); y++) {
    for (let x = 0; x <= maxCols - w; x++) {
      const candidate = { x, y, w, h };
      const collides = placed.some((item) => hasOverlap(candidate, item));

      if (!collides) {
        return { x, y };
      }
    }
  }

  return null;
};

const toSortedWidgets = (widgets: Widget[], layoutMap: Map<string, LayoutItem>): Widget[] => {
  return [...widgets]
    .map((widget) => {
      const layout = layoutMap.get(widget.id);
      return layout
        ? { ...widget, grid: { x: layout.x, y: layout.y, w: layout.w, h: layout.h } }
        : widget;
    })
    .sort((a, b) => {
      if (a.grid.y !== b.grid.y) return a.grid.y - b.grid.y;
      if (a.grid.x !== b.grid.x) return a.grid.x - b.grid.x;
      return a.id.localeCompare(b.id);
    });
};

export function getResponsiveLayout(widgets: Widget[], maxCols: number): Widget[] {
  if (widgets.length === 0) return [];

  const sorted = sortWidgetsByGrid(widgets);
  const placed: PlacedLayoutItem[] = [];
  const layoutMap = new Map<string, LayoutItem>();

  for (const widget of sorted) {
    const { w, h } = normalizeSize(widget, widget.grid.w, widget.grid.h, maxCols, MAX_AUTO_PACK_ROWS);
    const nextPosition = findAvailableSlot(placed, w, h, maxCols) || { x: 0, y: 0 };
    const nextLayout = { i: widget.id, x: nextPosition.x, y: nextPosition.y, w, h };

    placed.push(nextLayout);
    layoutMap.set(widget.id, nextLayout);
  }

  return toSortedWidgets(sorted, layoutMap);
}

export function getLayoutItemsFromWidgets(widgets: Widget[]): LayoutItem[] {
  return sortWidgetsByGrid(widgets).map((widget) => ({
    i: widget.id,
    x: widget.grid.x,
    y: widget.grid.y,
    w: widget.grid.w,
    h: widget.grid.h,
  }));
}

export function normalizeResponsiveLayouts(input: unknown): ResponsiveLayouts {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const value = input as Record<string, unknown>;
  const normalized: ResponsiveLayouts = {};

  const normalizeLayoutMap = (layoutMap: unknown): Record<string, LayoutItem[]> => {
    if (!layoutMap || typeof layoutMap !== 'object') {
      return {};
    }

    return Object.entries(layoutMap as Record<string, unknown>).reduce<Record<string, LayoutItem[]>>((acc, [pageId, items]) => {
      if (!Array.isArray(items)) {
        return acc;
      }

      const normalizedItems = items
        .filter((item): item is LayoutItem => {
          if (!item || typeof item !== 'object') return false;

          const candidate = item as Record<string, unknown>;
          return typeof candidate.i === 'string'
            && typeof candidate.x === 'number'
            && typeof candidate.y === 'number'
            && typeof candidate.w === 'number'
            && typeof candidate.h === 'number';
        })
        .map((item) => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        }));

      if (normalizedItems.length > 0) {
        acc[pageId] = normalizedItems;
      }

      return acc;
    }, {});
  };

  const tabletLayouts = normalizeLayoutMap(value.tablet ?? value.medium);
  const mobileLayouts = normalizeLayoutMap(value.mobile);

  if (Object.keys(tabletLayouts).length > 0) {
    normalized.tablet = tabletLayouts;
  }

  if (Object.keys(mobileLayouts).length > 0) {
    normalized.mobile = mobileLayouts;
  }

  return normalized;
}

export function sanitizeResponsiveLayoutsForWidgets(
  widgets: Widget[],
  responsiveLayouts: ResponsiveLayouts,
): ResponsiveLayouts {
  const widgetsByPage = widgets.reduce<Map<string, Set<string>>>((map, widget) => {
    const ids = map.get(widget.pageId) ?? new Set<string>();
    ids.add(widget.id);
    map.set(widget.pageId, ids);
    return map;
  }, new Map<string, Set<string>>());

  const sanitized: ResponsiveLayouts = {};

  (Object.entries(responsiveLayouts) as Array<[keyof ResponsiveLayouts, Record<string, LayoutItem[]> | undefined]>).forEach(([breakpoint, pageLayouts]) => {
    if (!pageLayouts) return;

    const nextPageLayouts = Object.entries(pageLayouts).reduce<Record<string, LayoutItem[]>>((acc, [pageId, items]) => {
      const pageWidgetIds = widgetsByPage.get(pageId);
      if (!pageWidgetIds) return acc;

      const filteredItems = items.filter((item) => pageWidgetIds.has(item.i));
      if (filteredItems.length > 0) {
        acc[pageId] = filteredItems;
      }

      return acc;
    }, {});

    if (Object.keys(nextPageLayouts).length > 0) {
      sanitized[breakpoint] = nextPageLayouts;
    }
  });

  return sanitized;
}

export function getPageLayoutState(
  pageId: string,
  breakpoint: BreakpointKey,
  responsiveLayouts: ResponsiveLayouts,
): { isCustom: boolean; sourceBreakpoint: BreakpointKey } {
  if (breakpoint === 'desktop') {
    return { isCustom: false, sourceBreakpoint: 'desktop' };
  }

  const pageLayouts = responsiveLayouts[breakpoint];
  if (pageLayouts?.[pageId]?.length) {
    return { isCustom: true, sourceBreakpoint: breakpoint };
  }

  const parentBreakpoint: BreakpointKey = breakpoint === 'mobile' ? 'tablet' : 'desktop';
  return getPageLayoutState(pageId, parentBreakpoint, responsiveLayouts);
}

export function resolveResponsivePageLayout(
  pageWidgets: Widget[],
  pageId: string,
  breakpoint: BreakpointKey,
  responsiveLayouts: ResponsiveLayouts,
): ResolvedPageLayout {
  const sortedPageWidgets = sortWidgetsByGrid(pageWidgets);

  if (breakpoint === 'desktop') {
    return {
      widgets: sortedPageWidgets,
      isCustom: false,
      sourceBreakpoint: 'desktop',
    };
  }

  const parentBreakpoint: BreakpointKey = breakpoint === 'mobile' ? 'tablet' : 'desktop';
  const parentResolved = resolveResponsivePageLayout(sortedPageWidgets, pageId, parentBreakpoint, responsiveLayouts);
  const explicitLayout = responsiveLayouts[breakpoint]?.[pageId];

  if (!explicitLayout?.length) {
    const { maxCols } = getGridDimensions(breakpoint);
    return {
      widgets: getResponsiveLayout(parentResolved.widgets, maxCols),
      isCustom: false,
      sourceBreakpoint: parentResolved.sourceBreakpoint,
    };
  }

  const { maxCols, maxRows } = getGridDimensions(breakpoint);
  const widgetsById = new Map(parentResolved.widgets.map((widget) => [widget.id, widget]));
  const placed: PlacedLayoutItem[] = [];
  const layoutMap = new Map<string, LayoutItem>();

  for (const item of explicitLayout) {
    const widget = widgetsById.get(item.i);
    if (!widget) continue;

    const { w, h } = normalizeSize(widget, item.w, item.h, maxCols, maxRows);
    let candidate: LayoutItem = {
      i: widget.id,
      x: Math.max(0, Math.min(item.x, maxCols - w)),
      y: Math.max(0, item.y),
      w,
      h,
    };

    if (candidate.y + candidate.h > maxRows) {
      candidate = {
        ...candidate,
        y: Math.max(0, maxRows - candidate.h),
      };
    }

    if (placed.some((placedItem) => hasOverlap(candidate, placedItem))) {
      const fallbackPosition = findAvailableSlot(placed, candidate.w, candidate.h, maxCols, maxRows);
      if (!fallbackPosition) continue;

      candidate = {
        ...candidate,
        x: fallbackPosition.x,
        y: fallbackPosition.y,
      };
    }

    placed.push(candidate);
    layoutMap.set(widget.id, candidate);
  }

  const remainingWidgets = sortWidgetsByGrid(parentResolved.widgets).filter((widget) => !layoutMap.has(widget.id));

  for (const widget of remainingWidgets) {
    const { w, h } = normalizeSize(widget, widget.grid.w, widget.grid.h, maxCols, maxRows);
    const fallbackPosition = findAvailableSlot(placed, w, h, maxCols, maxRows);
    if (!fallbackPosition) continue;

    const nextLayout = {
      i: widget.id,
      x: fallbackPosition.x,
      y: fallbackPosition.y,
      w,
      h,
    };

    placed.push(nextLayout);
    layoutMap.set(widget.id, nextLayout);
  }

  return {
    widgets: toSortedWidgets(parentResolved.widgets, layoutMap),
    isCustom: true,
    sourceBreakpoint: breakpoint,
  };
}
