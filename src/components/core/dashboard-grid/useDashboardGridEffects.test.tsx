import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useGridStackResizeScrollLock,
  type ExtendedGridStack,
} from './useDashboardGridEffects';

describe('useGridStackResizeScrollLock', () => {
  it('blocks GridStack page scrolling for the duration of a widget resize', () => {
    const viewport = document.createElement('div');
    viewport.dataset.dashboardViewport = '';
    viewport.scrollLeft = 1000;
    viewport.scrollTop = 0;

    const gridElement = document.createElement('div');
    viewport.appendChild(gridElement);
    document.body.appendChild(viewport);

    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    Object.defineProperty(viewport, 'scrollBy', {
      configurable: true,
      writable: true,
      value: scrollBy,
    });
    Object.defineProperty(viewport, 'scrollTo', {
      configurable: true,
      writable: true,
      value: scrollTo,
    });

    const handlers = new Map<string, () => void>();
    const gridStack = {
      el: gridElement,
      on: vi.fn((name: string, handler: () => void) => {
        handlers.set(name, handler);
        return gridStack;
      }),
      off: vi.fn((name: string) => {
        handlers.delete(name);
        return gridStack;
      }),
    } as unknown as ExtendedGridStack;

    const { unmount } = renderHook(() => useGridStackResizeScrollLock(gridStack));

    act(() => handlers.get('resizestart')?.());
    viewport.scrollBy({ left: 1000 });
    expect(scrollBy).not.toHaveBeenCalled();

    act(() => handlers.get('resizestop')?.());
    expect(scrollTo).toHaveBeenCalledWith({
      left: 1000,
      top: 0,
      behavior: 'auto',
    });

    viewport.scrollBy({ left: 1000 });
    expect(scrollBy).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('restores scrolling if the grid unmounts during a resize', () => {
    const viewport = document.createElement('div');
    viewport.dataset.dashboardViewport = '';
    const gridElement = document.createElement('div');
    viewport.appendChild(gridElement);
    document.body.appendChild(viewport);

    const scrollBy = vi.fn();
    Object.defineProperty(viewport, 'scrollBy', {
      configurable: true,
      writable: true,
      value: scrollBy,
    });
    Object.defineProperty(viewport, 'scrollTo', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    const handlers = new Map<string, () => void>();
    const gridStack = {
      el: gridElement,
      on: vi.fn((name: string, handler: () => void) => {
        handlers.set(name, handler);
        return gridStack;
      }),
      off: vi.fn((name: string) => {
        handlers.delete(name);
        return gridStack;
      }),
    } as unknown as ExtendedGridStack;

    const { unmount } = renderHook(() => useGridStackResizeScrollLock(gridStack));
    act(() => handlers.get('resizestart')?.());
    unmount();

    viewport.scrollBy({ top: 100 });
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });
});
