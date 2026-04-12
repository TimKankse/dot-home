import { describe, it, expect } from 'vitest';
import {
  getPageLayoutState,
  getResponsiveLayout,
  normalizeResponsiveLayouts,
  resolveResponsivePageLayout,
  sanitizeResponsiveLayoutsForWidgets,
} from './gridUtils';
import { Widget } from '@/types/widget';

const createWidget = (id: string, x: number, y: number, w: number, h: number): Widget => ({
  id,
  type: 'clock',
  grid: { x, y, w, h },
  pageId: 'test-page',
});

describe('getResponsiveLayout', () => {
  it('returns empty array for empty input', () => {
    expect(getResponsiveLayout([], 8)).toEqual([]);
  });

  it('preserves single widget position when it fits', () => {
    const widgets = [createWidget('1', 0, 0, 2, 2)];
    const result = getResponsiveLayout(widgets, 8);
    
    expect(result[0].grid.x).toBe(0);
    expect(result[0].grid.y).toBe(0);
    expect(result[0].grid.w).toBe(2);
    expect(result[0].grid.h).toBe(2);
  });

  it('clamps widget width to max columns', () => {
    const widgets = [createWidget('1', 0, 0, 6, 2)];
    const result = getResponsiveLayout(widgets, 4);
    
    expect(result[0].grid.w).toBe(4);
  });

  it('stacks widgets vertically when reducing columns', () => {
    const widgets = [
      createWidget('1', 0, 0, 4, 2),
      createWidget('2', 4, 0, 4, 2),
    ];
    const result = getResponsiveLayout(widgets, 4);
    
    expect(result[0].grid.y).toBe(0);
    expect(result[1].grid.y).toBe(2);
  });

  it('avoids overlap with multiple widgets', () => {
    const widgets = [
      createWidget('1', 0, 0, 2, 2),
      createWidget('2', 2, 0, 2, 2),
      createWidget('3', 0, 2, 4, 1),
    ];
    const result = getResponsiveLayout(widgets, 4);
    
    const positions = result.map(w => ({ x: w.grid.x, y: w.grid.y, w: w.grid.w, h: w.grid.h }));
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const overlaps = !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
        expect(overlaps).toBe(false);
      }
    }
  });
});

describe('responsive layout inheritance', () => {
  it('lets mobile inherit from a custom tablet layout', () => {
    const widgets = [
      createWidget('1', 0, 0, 2, 2),
      createWidget('2', 2, 0, 2, 2),
    ];

    const responsiveLayouts = {
      tablet: {
        'test-page': [
          { i: '2', x: 0, y: 0, w: 4, h: 2 },
          { i: '1', x: 0, y: 2, w: 2, h: 2 },
        ],
      },
    };

    const tabletLayout = resolveResponsivePageLayout(widgets, 'test-page', 'tablet', responsiveLayouts);
    const mobileLayout = resolveResponsivePageLayout(widgets, 'test-page', 'mobile', responsiveLayouts);

    expect(tabletLayout.isCustom).toBe(true);
    expect(tabletLayout.sourceBreakpoint).toBe('tablet');
    expect(tabletLayout.widgets[0].id).toBe('2');
    expect(mobileLayout.isCustom).toBe(false);
    expect(mobileLayout.sourceBreakpoint).toBe('tablet');
    expect(mobileLayout.widgets.map((widget) => widget.id)).toEqual(['2', '1']);
    expect(mobileLayout.widgets[0].grid.w).toBe(2);
    expect(mobileLayout.widgets[1].grid.y).toBe(2);
  });

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
