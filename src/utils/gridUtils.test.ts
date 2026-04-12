import { afterEach, describe, expect, it } from 'vitest';
import { WIDGET_DEFINITIONS } from '@/constants/widget-definitions';
import type { Widget } from '@/types/widget';
import {
  createRenderedResponsivePages,
  getPageLayoutState,
  normalizeResponsiveLayouts,
  resolveResponsivePageLayout,
  sanitizeResponsiveLayoutsForWidgets,
} from './gridUtils';

const createWidget = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  type = 'clock',
): Widget => ({
  id,
  type,
  grid: { x, y, w, h },
  pageId: 'test-page',
});

const expectResponsiveLayoutToBeLegal = (
  widgets: Widget[],
  maxCols: number,
  maxRows: number,
) => {
  widgets.forEach((widget) => {
    expect(widget.grid.x).toBeGreaterThanOrEqual(0);
    expect(widget.grid.y).toBeGreaterThanOrEqual(0);
    expect(widget.grid.w).toBeGreaterThan(0);
    expect(widget.grid.h).toBeGreaterThan(0);
    expect(widget.grid.x + widget.grid.w).toBeLessThanOrEqual(maxCols);
    expect((widget.grid.y % maxRows) + widget.grid.h).toBeLessThanOrEqual(maxRows);
  });

  for (let index = 0; index < widgets.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < widgets.length; otherIndex += 1) {
      const a = widgets[index].grid;
      const b = widgets[otherIndex].grid;
      const overlaps = !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
      expect(overlaps).toBe(false);
    }
  }
};

afterEach(() => {
  delete WIDGET_DEFINITIONS.big;
});

describe('responsive layout legalization', () => {
  it('packs inherited tablet layouts into one page at minimum sizes when possible', () => {
    const widgets = [
      createWidget('1', 0, 0, 4, 4),
      createWidget('2', 4, 0, 4, 4),
      createWidget('3', 0, 4, 4, 4),
    ];

    const result = resolveResponsivePageLayout(widgets, 'test-page', 'tablet', {});

    expect(result.isCustom).toBe(false);
    expect(result.sourceBreakpoint).toBe('desktop');
    expect(result.diagnostics.fitWithinPage).toBe(true);
    expect(result.diagnostics.segmentCount).toBe(1);
    expect(result.widgets.map((widget) => ({ id: widget.id, w: widget.grid.w, h: widget.grid.h }))).toEqual([
      { id: '1', w: 2, h: 2 },
      { id: '2', w: 2, h: 2 },
      { id: '3', w: 2, h: 2 },
    ]);
    expectResponsiveLayoutToBeLegal(result.widgets, 4, 16);
  });

  it('creates responsive overflow pages only when one tablet page cannot fit every minimum-sized widget', () => {
    const widgets = Array.from({ length: 17 }, (_, index) => {
      const x = (index % 4) * 2;
      const y = Math.floor(index / 4) * 2;
      return createWidget(`${index + 1}`, x, y, 2, 2);
    });

    const result = resolveResponsivePageLayout(widgets, 'test-page', 'tablet', {});
    const renderedPages = createRenderedResponsivePages('test-page', 'tablet', result);

    expect(result.diagnostics.fitWithinPage).toBe(false);
    expect(result.diagnostics.segmentCount).toBe(2);
    expect(renderedPages).toHaveLength(2);
    expect(renderedPages[0].widgets).toHaveLength(16);
    expect(renderedPages[1].widgets).toHaveLength(1);
    expect(renderedPages[1].widgets[0].grid.y).toBe(0);
    expectResponsiveLayoutToBeLegal(result.widgets, 4, 16);
  });

  it('preserves custom responsive sizes instead of shrinking them to minimums', () => {
    const widgets = [
      createWidget('1', 0, 0, 4, 4),
      createWidget('2', 4, 0, 4, 4),
      createWidget('3', 0, 4, 4, 4),
    ];

    const responsiveLayouts = {
      tablet: {
        'test-page': [
          { i: '1', x: 0, y: 0, w: 4, h: 8 },
          { i: '2', x: 0, y: 8, w: 4, h: 8 },
          { i: '3', x: 0, y: 16, w: 4, h: 8 },
        ],
      },
    };

    const result = resolveResponsivePageLayout(widgets, 'test-page', 'tablet', responsiveLayouts);

    expect(result.isCustom).toBe(true);
    expect(result.sourceBreakpoint).toBe('tablet');
    expect(result.diagnostics.segmentCount).toBe(2);
    expect(result.widgets.map((widget) => ({ id: widget.id, w: widget.grid.w, h: widget.grid.h }))).toEqual([
      { id: '1', w: 4, h: 8 },
      { id: '2', w: 4, h: 8 },
      { id: '3', w: 4, h: 8 },
    ]);
    expectResponsiveLayoutToBeLegal(result.widgets, 4, 16);
  });

  it('repairs invalid custom responsive layouts instead of allowing overlaps or out-of-bounds widgets', () => {
    const widgets = [
      createWidget('1', 0, 0, 4, 4),
      createWidget('2', 4, 0, 4, 4),
      createWidget('3', 0, 4, 4, 4),
    ];

    const responsiveLayouts = {
      tablet: {
        'test-page': [
          { i: '1', x: 0, y: 0, w: 4, h: 8 },
          { i: '2', x: 0, y: 0, w: 4, h: 8 },
          { i: '3', x: 3, y: 0, w: 2, h: 8 },
        ],
      },
    };

    const result = resolveResponsivePageLayout(widgets, 'test-page', 'tablet', responsiveLayouts);

    expect(result.diagnostics.adjustedWidgetIds).toEqual(expect.arrayContaining(['2', '3']));
    expect(result.widgets.map((widget) => widget.id)).toEqual(['1', '2', '3']);
    expectResponsiveLayoutToBeLegal(result.widgets, 4, 16);
  });

  it('lets mobile inherit from a repaired custom tablet layout', () => {
    const widgets = [
      createWidget('1', 0, 0, 4, 4),
      createWidget('2', 4, 0, 4, 4),
    ];

    const responsiveLayouts = {
      tablet: {
        'test-page': [
          { i: '2', x: 0, y: 0, w: 4, h: 8 },
          { i: '1', x: 0, y: 0, w: 4, h: 8 },
        ],
      },
    };

    const tabletLayout = resolveResponsivePageLayout(widgets, 'test-page', 'tablet', responsiveLayouts);
    const mobileLayout = resolveResponsivePageLayout(widgets, 'test-page', 'mobile', responsiveLayouts);

    expect(tabletLayout.isCustom).toBe(true);
    expect(mobileLayout.isCustom).toBe(false);
    expect(mobileLayout.sourceBreakpoint).toBe('tablet');
    expect(mobileLayout.widgets.map((widget) => widget.id)).toEqual(
      tabletLayout.widgets.map((widget) => widget.id),
    );
    expectResponsiveLayoutToBeLegal(mobileLayout.widgets, 2, 32);
  });

  it('reports widgets that are impossible for the target breakpoint', () => {
    WIDGET_DEFINITIONS.big = {
      minW: 3,
      minH: 1,
    };

    const widgets = [
      createWidget('too-wide', 0, 0, 3, 1, 'big'),
      createWidget('fits', 0, 1, 2, 2),
    ];

    const result = resolveResponsivePageLayout(widgets, 'test-page', 'mobile', {});

    expect(result.diagnostics.unplaceableWidgetIds).toEqual(['too-wide']);
    expect(result.widgets.map((widget) => widget.id)).toEqual(['fits']);
    expect(result.diagnostics.segmentCount).toBe(1);
    expectResponsiveLayoutToBeLegal(result.widgets, 2, 32);
  });
});

describe('responsive layout inheritance metadata', () => {
  it('reports inherited state from desktop when no custom layouts exist', () => {
    const state = getPageLayoutState('test-page', 'mobile', {});

    expect(state.isCustom).toBe(false);
    expect(state.sourceBreakpoint).toBe('desktop');
  });

  it('normalizes legacy medium layouts and prunes deleted widgets', () => {
    const normalized = normalizeResponsiveLayouts({
      medium: {
        'test-page': [
          { i: '1', x: 0, y: 0, w: 2, h: 2 },
          { i: 'missing', x: 2, y: 0, w: 2, h: 2 },
        ],
      },
    });

    const sanitized = sanitizeResponsiveLayoutsForWidgets(
      [createWidget('1', 0, 0, 2, 2)],
      normalized,
    );

    expect(normalized.tablet?.['test-page']).toHaveLength(2);
    expect(sanitized.tablet?.['test-page']).toEqual([
      { i: '1', x: 0, y: 0, w: 2, h: 2 },
    ]);
  });
});
