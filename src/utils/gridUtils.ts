import {
  getGridDimensions,
  type BreakpointKey,
  type ResponsiveBreakpointKey,
} from '@/constants/grid';
import { getMinDimensions } from '@/constants/widget-definitions';
import { LayoutItem, ResponsiveLayouts, Widget } from '@/types';

type PlacedLayoutItem = LayoutItem;

interface PlacementDescriptor {
  widget: Widget;
  preferred: LayoutItem;
  w: number;
  h: number;
}

export interface ResponsiveLayoutDiagnostics {
  fitWithinPage: boolean;
  segmentCount: number;
  adjustedWidgetIds: string[];
  unplaceableWidgetIds: string[];
}

export interface ResolvedPageLayout {
  widgets: Widget[];
  isCustom: boolean;
  sourceBreakpoint: BreakpointKey;
  diagnostics: ResponsiveLayoutDiagnostics;
}

export interface RenderedResponsivePage {
  id: string;
  basePageId: string;
  breakpoint: ResponsiveBreakpointKey;
  segmentIndex: number;
  segmentCount: number;
  rowOffset: number;
  widgets: Widget[];
  diagnostics: ResponsiveLayoutDiagnostics;
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

const sortLayoutItemsByGrid = (items: LayoutItem[]): LayoutItem[] => {
  return [...items].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return a.i.localeCompare(b.i);
  });
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

const getSegmentRowCount = (breakpoint: ResponsiveBreakpointKey): number => {
  return getGridDimensions(breakpoint).maxRows;
};

const getWidgetMinimumSize = (widget: Widget) => {
  return getMinDimensions(getWidgetTypeKey(widget), widget.config || {});
};

const isWidgetPlaceableAtBreakpoint = (
  widget: Widget,
  maxCols: number,
  maxRows: number,
): boolean => {
  const { w: minW, h: minH } = getWidgetMinimumSize(widget);
  return minW <= maxCols && minH <= maxRows;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const getSegmentIndexForRowCount = (y: number, rowsPerSegment: number): number => {
  return Math.floor(Math.max(0, y) / rowsPerSegment);
};

const getRowWithinSegment = (y: number, rowsPerSegment: number): number => {
  return Math.max(0, y) % rowsPerSegment;
};

const getSegmentOffsetForRowCount = (segmentIndex: number, rowsPerSegment: number): number => {
  return segmentIndex * rowsPerSegment;
};

const isCandidateWithinResponsiveBounds = (
  candidate: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>,
  maxCols: number,
  maxRows: number,
): boolean => {
  if (candidate.x < 0 || candidate.y < 0 || candidate.w <= 0 || candidate.h <= 0) {
    return false;
  }

  if (candidate.x + candidate.w > maxCols || candidate.h > maxRows) {
    return false;
  }

  return getRowWithinSegment(candidate.y, maxRows) + candidate.h <= maxRows;
};

const normalizeSize = (
  widget: Widget,
  w: number,
  h: number,
  maxCols: number,
  maxRows: number,
): { w: number; h: number } => {
  const min = getWidgetMinimumSize(widget);
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

const canPlaceAt = (
  placed: PlacedLayoutItem[],
  candidate: LayoutItem,
  maxCols: number,
  maxRows: number,
): boolean => {
  if (!isCandidateWithinResponsiveBounds(candidate, maxCols, maxRows)) {
    return false;
  }

  return !placed.some((placedItem) => hasOverlap(candidate, placedItem));
};

const buildResponsiveDiagnostics = (
  placed: LayoutItem[],
  referenceLayouts: Map<string, LayoutItem>,
  unplaceableWidgetIds: string[],
  rowsPerSegment: number,
): ResponsiveLayoutDiagnostics => {
  const adjustedWidgetIds = placed
    .filter((item) => {
      const reference = referenceLayouts.get(item.i);
      if (!reference) return true;

      return reference.x !== item.x
        || reference.y !== item.y
        || reference.w !== item.w
        || reference.h !== item.h;
    })
    .map((item) => item.i);

  const highestSegmentIndex = placed.reduce(
    (maxIndex, item) => Math.max(maxIndex, getSegmentIndexForRowCount(item.y, rowsPerSegment)),
    0,
  );
  const segmentCount = placed.length === 0
    ? 1
    : highestSegmentIndex + 1;

  return {
    fitWithinPage: segmentCount <= 1,
    segmentCount,
    adjustedWidgetIds,
    unplaceableWidgetIds,
  };
};

const getPreferredXOrder = (
  maxCols: number,
  w: number,
  preferredX?: number,
): number[] => {
  const maxX = maxCols - w;
  if (maxX < 0) return [];

  if (preferredX === undefined) {
    return Array.from({ length: maxX + 1 }, (_, index) => index);
  }

  const clampedPreferredX = clamp(preferredX, 0, maxX);
  const ordered = Array.from({ length: maxX + 1 }, (_, index) => index);
  return [
    clampedPreferredX,
    ...ordered.filter((value) => value !== clampedPreferredX),
  ];
};

const findResponsiveSlot = (
  placed: PlacedLayoutItem[],
  w: number,
  h: number,
  maxCols: number,
  maxRows: number,
  options?: {
    startY?: number;
    preferredX?: number;
    maxSegments?: number;
  },
): { x: number; y: number } | null => {
  if (w > maxCols || h > maxRows) {
    return null;
  }

  const startY = Math.max(0, options?.startY ?? 0);
  const maxSegments = Math.max(1, options?.maxSegments ?? placed.length + 1);
  const maxGlobalY = (maxSegments * maxRows) - h;

  for (let y = startY; y <= maxGlobalY; y += 1) {
    const localY = getRowWithinSegment(y, maxRows);
    if (localY + h > maxRows) {
      y += maxRows - localY - 1;
      continue;
    }

    const xOrder = getPreferredXOrder(maxCols, w, y === startY ? options?.preferredX : undefined);

    for (const x of xOrder) {
      const candidate = { i: '', x, y, w, h };
      if (canPlaceAt(placed, candidate, maxCols, maxRows)) {
        return { x, y };
      }
    }
  }

  return null;
};

const tryPackAutoIntoSingleSegment = (
  descriptors: PlacementDescriptor[],
  maxCols: number,
  maxRows: number,
): LayoutItem[] | null => {
  const memo = new Map<string, LayoutItem[] | null>();

  const visit = (index: number, heights: number[]): LayoutItem[] | null => {
    if (index >= descriptors.length) {
      return [];
    }

    const key = `${index}:${heights.join(',')}`;
    if (memo.has(key)) {
      return memo.get(key) ?? null;
    }

    const descriptor = descriptors[index];
    const candidates: Array<{ x: number; y: number }> = [];

    for (let x = 0; x <= maxCols - descriptor.w; x += 1) {
      const y = Math.max(...heights.slice(x, x + descriptor.w));
      if (y + descriptor.h > maxRows) {
        continue;
      }

      candidates.push({ x, y });
    }

    candidates.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    for (const candidate of candidates) {
      const nextHeights = [...heights];
      for (let column = candidate.x; column < candidate.x + descriptor.w; column += 1) {
        nextHeights[column] = candidate.y + descriptor.h;
      }

      const remainder = visit(index + 1, nextHeights);
      if (!remainder) continue;

      const placed = {
        i: descriptor.widget.id,
        x: candidate.x,
        y: candidate.y,
        w: descriptor.w,
        h: descriptor.h,
      };
      const result = [placed, ...remainder];
      memo.set(key, result);
      return result;
    }

    memo.set(key, null);
    return null;
  };

  return visit(0, Array.from({ length: maxCols }, () => 0));
};

const packResponsiveAutoLayout = (
  widgets: Widget[],
  maxCols: number,
  maxRows: number,
): {
  widgets: Widget[];
  diagnostics: ResponsiveLayoutDiagnostics;
} => {
  const referenceLayouts = new Map<string, LayoutItem>();
  const descriptors: PlacementDescriptor[] = [];
  const unplaceableWidgetIds: string[] = [];

  for (const widget of sortWidgetsByGrid(widgets)) {
    referenceLayouts.set(widget.id, {
      i: widget.id,
      x: widget.grid.x,
      y: widget.grid.y,
      w: widget.grid.w,
      h: widget.grid.h,
    });

    if (!isWidgetPlaceableAtBreakpoint(widget, maxCols, maxRows)) {
      unplaceableWidgetIds.push(widget.id);
      continue;
    }

    const min = getWidgetMinimumSize(widget);
    descriptors.push({
      widget,
      preferred: {
        i: widget.id,
        x: widget.grid.x,
        y: widget.grid.y,
        w: min.w,
        h: min.h,
      },
      w: min.w,
      h: min.h,
    });
  }

  const singleSegmentLayout = tryPackAutoIntoSingleSegment(descriptors, maxCols, maxRows);

  if (singleSegmentLayout) {
    const layoutMap = new Map(singleSegmentLayout.map((item) => [item.i, item]));
    const placedWidgets = toSortedWidgets(
      descriptors.map((descriptor) => descriptor.widget),
      layoutMap,
    );

    return {
      widgets: placedWidgets,
      diagnostics: buildResponsiveDiagnostics(
        singleSegmentLayout,
        referenceLayouts,
        unplaceableWidgetIds,
        maxRows,
      ),
    };
  }

  const placed: LayoutItem[] = [];
  const maxSegments = Math.max(1, descriptors.length);

  for (const descriptor of descriptors) {
    const position = findResponsiveSlot(placed, descriptor.w, descriptor.h, maxCols, maxRows, {
      maxSegments,
    });

    if (!position) {
      unplaceableWidgetIds.push(descriptor.widget.id);
      continue;
    }

    placed.push({
      i: descriptor.widget.id,
      x: position.x,
      y: position.y,
      w: descriptor.w,
      h: descriptor.h,
    });
  }

  const layoutMap = new Map(placed.map((item) => [item.i, item]));

  return {
    widgets: toSortedWidgets(
      descriptors
        .map((descriptor) => descriptor.widget)
        .filter((widget) => layoutMap.has(widget.id)),
      layoutMap,
    ),
    diagnostics: buildResponsiveDiagnostics(
      placed,
      referenceLayouts,
      unplaceableWidgetIds,
      maxRows,
    ),
  };
};

const packResponsiveCustomLayout = (
  parentWidgets: Widget[],
  explicitLayout: LayoutItem[],
  maxCols: number,
  maxRows: number,
): {
  widgets: Widget[];
  diagnostics: ResponsiveLayoutDiagnostics;
} => {
  const parentWidgetsById = new Map(parentWidgets.map((widget) => [widget.id, widget]));
  const referenceLayouts = new Map<string, LayoutItem>();
  const unplaceableWidgetIds: string[] = [];
  const placed: LayoutItem[] = [];
  const seen = new Set<string>();
  const maxSegments = Math.max(1, parentWidgets.length);

  const explicitDescriptors = sortLayoutItemsByGrid(explicitLayout)
    .map((item) => {
      const widget = parentWidgetsById.get(item.i);
      if (!widget) {
        return null;
      }

      referenceLayouts.set(widget.id, {
        i: widget.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      });

      if (!isWidgetPlaceableAtBreakpoint(widget, maxCols, maxRows)) {
        unplaceableWidgetIds.push(widget.id);
        return null;
      }

      const normalized = normalizeSize(widget, item.w, item.h, maxCols, maxRows);
      const normalizedPreferred: LayoutItem = {
        i: widget.id,
        x: clamp(item.x, 0, maxCols - normalized.w),
        y: Math.max(0, item.y),
        w: normalized.w,
        h: normalized.h,
      };

      return {
        widget,
        preferred: normalizedPreferred,
        w: normalized.w,
        h: normalized.h,
      } satisfies PlacementDescriptor;
    })
    .filter((descriptor): descriptor is PlacementDescriptor => descriptor !== null);

  for (const descriptor of explicitDescriptors) {
    seen.add(descriptor.widget.id);

    if (canPlaceAt(placed, descriptor.preferred, maxCols, maxRows)) {
      placed.push(descriptor.preferred);
      continue;
    }

    const currentSegments = Math.max(
      1,
      placed.reduce(
        (maxSegment, item) => Math.max(maxSegment, getSegmentIndexForRowCount(item.y, maxRows) + 1),
        0,
      ),
    );
    const searchStartY = Math.min(
      descriptor.preferred.y,
      getSegmentOffsetForRowCount(currentSegments, maxRows),
    );

    const nextPosition = findResponsiveSlot(placed, descriptor.w, descriptor.h, maxCols, maxRows, {
      startY: searchStartY,
      preferredX: descriptor.preferred.x,
      maxSegments,
    });

    if (!nextPosition) {
      unplaceableWidgetIds.push(descriptor.widget.id);
      continue;
    }

    placed.push({
      i: descriptor.widget.id,
      x: nextPosition.x,
      y: nextPosition.y,
      w: descriptor.w,
      h: descriptor.h,
    });
  }

  const missingDescriptors = sortWidgetsByGrid(parentWidgets)
    .filter((widget) => !seen.has(widget.id))
    .map((widget) => {
      referenceLayouts.set(widget.id, {
        i: widget.id,
        x: widget.grid.x,
        y: widget.grid.y,
        w: widget.grid.w,
        h: widget.grid.h,
      });

      if (!isWidgetPlaceableAtBreakpoint(widget, maxCols, maxRows)) {
        unplaceableWidgetIds.push(widget.id);
        return null;
      }

      const min = getWidgetMinimumSize(widget);
      return {
        widget,
        preferred: {
          i: widget.id,
          x: widget.grid.x,
          y: widget.grid.y,
          w: min.w,
          h: min.h,
        },
        w: min.w,
        h: min.h,
      } satisfies PlacementDescriptor;
    })
    .filter((descriptor): descriptor is PlacementDescriptor => descriptor !== null);

  for (const descriptor of missingDescriptors) {
    const position = findResponsiveSlot(placed, descriptor.w, descriptor.h, maxCols, maxRows, {
      maxSegments,
    });

    if (!position) {
      unplaceableWidgetIds.push(descriptor.widget.id);
      continue;
    }

    placed.push({
      i: descriptor.widget.id,
      x: position.x,
      y: position.y,
      w: descriptor.w,
      h: descriptor.h,
    });
  }

  const layoutMap = new Map(placed.map((item) => [item.i, item]));

  return {
    widgets: toSortedWidgets(
      parentWidgets.filter((widget) => layoutMap.has(widget.id)),
      layoutMap,
    ),
    diagnostics: buildResponsiveDiagnostics(
      placed,
      referenceLayouts,
      Array.from(new Set(unplaceableWidgetIds)),
      maxRows,
    ),
  };
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

export function getResponsiveSegmentIndex(
  y: number,
  breakpoint: ResponsiveBreakpointKey,
): number {
  return getSegmentIndexForRowCount(y, getSegmentRowCount(breakpoint));
}

export function getResponsiveSegmentOffset(
  breakpoint: ResponsiveBreakpointKey,
  segmentIndex: number,
): number {
  return getSegmentOffsetForRowCount(segmentIndex, getSegmentRowCount(breakpoint));
}

export function getResponsiveSegmentLocalY(
  y: number,
  breakpoint: ResponsiveBreakpointKey,
): number {
  return getRowWithinSegment(y, getSegmentRowCount(breakpoint));
}

export function createRenderedResponsivePages(
  basePageId: string,
  breakpoint: ResponsiveBreakpointKey,
  resolvedLayout: ResolvedPageLayout,
): RenderedResponsivePage[] {
  const rowsPerSegment = getSegmentRowCount(breakpoint);
  const highestWidgetSegment = resolvedLayout.widgets.reduce(
    (maxSegment, widget) => Math.max(maxSegment, getResponsiveSegmentIndex(widget.grid.y, breakpoint)),
    0,
  );
  const segmentCount = Math.max(
    1,
    resolvedLayout.diagnostics.segmentCount,
    resolvedLayout.widgets.length > 0 ? highestWidgetSegment + 1 : 0,
  );

  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const rowOffset = getSegmentOffsetForRowCount(segmentIndex, rowsPerSegment);
    const widgets = resolvedLayout.widgets
      .filter((widget) => getResponsiveSegmentIndex(widget.grid.y, breakpoint) === segmentIndex)
      .map((widget) => ({
        ...widget,
        grid: {
          ...widget.grid,
          y: widget.grid.y - rowOffset,
        },
      }))
      .sort((a, b) => {
        if (a.grid.y !== b.grid.y) return a.grid.y - b.grid.y;
        if (a.grid.x !== b.grid.x) return a.grid.x - b.grid.x;
        return a.id.localeCompare(b.id);
      });

    return {
      id: `${basePageId}:${breakpoint}:${segmentIndex}`,
      basePageId,
      breakpoint,
      segmentIndex,
      segmentCount,
      rowOffset,
      widgets,
      diagnostics: resolvedLayout.diagnostics,
    };
  });
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
      diagnostics: {
        fitWithinPage: true,
        segmentCount: 1,
        adjustedWidgetIds: [],
        unplaceableWidgetIds: [],
      },
    };
  }

  const parentBreakpoint: BreakpointKey = breakpoint === 'mobile' ? 'tablet' : 'desktop';
  const parentResolved = resolveResponsivePageLayout(
    sortedPageWidgets,
    pageId,
    parentBreakpoint,
    responsiveLayouts,
  );
  const explicitLayout = responsiveLayouts[breakpoint]?.[pageId];
  const { maxCols, maxRows } = getGridDimensions(breakpoint);

  if (!explicitLayout?.length) {
    const packed = packResponsiveAutoLayout(parentResolved.widgets, maxCols, maxRows);
    return {
      widgets: packed.widgets,
      isCustom: false,
      sourceBreakpoint: parentResolved.sourceBreakpoint,
      diagnostics: packed.diagnostics,
    };
  }

  const packed = packResponsiveCustomLayout(parentResolved.widgets, explicitLayout, maxCols, maxRows);

  return {
    widgets: packed.widgets,
    isCustom: true,
    sourceBreakpoint: breakpoint,
    diagnostics: packed.diagnostics,
  };
}
