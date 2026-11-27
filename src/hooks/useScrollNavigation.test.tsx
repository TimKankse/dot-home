import type React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollNavigation } from './useScrollNavigation';

interface HarnessProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isModalOpen: boolean;
  effectiveScrollDirection: 'vertical' | 'horizontal';
  showViewport?: boolean;
}

const ScrollNavigationHarness = (props: HarnessProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const onScroll = useScrollNavigation({
    ...props,
    viewportRef,
    wrapperRef,
  });

  if (props.showViewport === false) {
    return null;
  }

  return (
    <div data-testid="viewport" ref={viewportRef} onScroll={onScroll}>
      <div
        data-testid="wrapper"
        ref={wrapperRef}
        style={{
          ['--total-pages' as string]: props.pagesLength,
        } as React.CSSProperties}
      >
        {Array.from({ length: props.pagesLength }, (_, index) => (
          <div key={index} data-testid={`page-${index}`} />
        ))}
      </div>
    </div>
  );
};

const viewportRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 1000,
  bottom: 800,
  width: 1000,
  height: 800,
  toJSON: () => ({}),
};

describe('useScrollNavigation', () => {
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    scrollToMock = vi.fn(function scrollTo(this: HTMLElement, options: ScrollToOptions) {
      this.scrollLeft = options.left ?? this.scrollLeft;
      this.scrollTop = options.top ?? this.scrollTop;
    });

    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
    });

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      if (this.dataset.testid === 'viewport') {
        return viewportRect as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('scrolls to the default page immediately on first render', () => {
    render(
      <ScrollNavigationHarness
        currentPageIndex={2}
        pagesLength={4}
        setPageIndex={vi.fn()}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      left: 2000,
      behavior: 'instant',
    });
  });

  it('attaches scroll syncing when the viewport appears after the hook mounts', () => {
    const setPageIndex = vi.fn();
    const { rerender } = render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={0}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
        showViewport={false}
      />
    );

    rerender(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
        showViewport
      />
    );

    const viewport = screen.getByTestId('viewport');
    viewport.scrollLeft = 1200;

    fireEvent.scroll(viewport);

    expect(setPageIndex).toHaveBeenCalledWith(1);
  });

  it('keeps retrying the initial default-page scroll until the viewport has a real size', () => {
    const viewportWidths = [0, 0, 1000];

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      if (this.dataset.testid === 'viewport') {
        const width = viewportWidths.length > 1 ? viewportWidths.shift() ?? 0 : viewportWidths[0];

        return {
          ...viewportRect,
          right: width,
          width,
        } as DOMRect;
      }

      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });

    render(
      <ScrollNavigationHarness
        currentPageIndex={2}
        pagesLength={4}
        setPageIndex={vi.fn()}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    expect(scrollToMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      left: 2000,
      behavior: 'instant',
    });
  });

  it('jumps directly to the latest requested page and leaves CSS snapping enabled', () => {
    const setPageIndex = vi.fn();
    const props = {
      currentPageIndex: 0,
      pagesLength: 4,
      setPageIndex,
      isModalOpen: false,
      effectiveScrollDirection: 'horizontal' as const,
    };
    const { rerender } = render(<ScrollNavigationHarness {...props} />);
    const viewport = screen.getByTestId('viewport');
    viewport.style.scrollSnapType = 'x mandatory';
    scrollToMock.mockClear();

    rerender(<ScrollNavigationHarness {...props} currentPageIndex={1} />);
    rerender(<ScrollNavigationHarness {...props} currentPageIndex={3} />);
    fireEvent.pointerDown(viewport);
    fireEvent.scroll(viewport);
    act(() => vi.runOnlyPendingTimers());

    expect(scrollToMock.mock.calls).toEqual([
      [{ top: 0, left: 1000, behavior: 'instant' }],
      [{ top: 0, left: 3000, behavior: 'instant' }],
    ]);
    expect(viewport.scrollLeft).toBe(3000);
    expect(viewport.style.scrollSnapType).toBe('x mandatory');
    expect(setPageIndex).not.toHaveBeenCalled();
  });

  it('updates the indicator during a gesture without scrolling back to the reported page', () => {
    const setPageIndex = vi.fn();
    const props = {
      currentPageIndex: 0,
      pagesLength: 4,
      setPageIndex,
      isModalOpen: false,
      effectiveScrollDirection: 'horizontal' as const,
    };
    const { rerender } = render(<ScrollNavigationHarness {...props} />);
    const viewport = screen.getByTestId('viewport');
    scrollToMock.mockClear();

    viewport.scrollLeft = 600;
    fireEvent.scroll(viewport);
    fireEvent.scroll(viewport);
    expect(setPageIndex.mock.calls).toEqual([[1]]);
    rerender(<ScrollNavigationHarness {...props} currentPageIndex={1} />);
    expect(viewport.scrollLeft).toBe(600);

    // The browser may snap back after the gesture briefly crossed the midpoint.
    viewport.scrollLeft = 0;
    fireEvent.scroll(viewport);
    rerender(<ScrollNavigationHarness {...props} />);
    expect(setPageIndex.mock.calls).toEqual([[1], [0]]);
    act(() => vi.runOnlyPendingTimers());
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it('tracks manual scrolling along the vertical axis', () => {
    const setPageIndex = vi.fn();

    render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />,
    );

    const viewport = screen.getByTestId('viewport');
    viewport.scrollTop = 1700;
    fireEvent.scroll(viewport);

    expect(setPageIndex).toHaveBeenCalledWith(2);
  });

  it('realigns the current page on a change of scroll direction', () => {
    const props = {
      currentPageIndex: 2,
      pagesLength: 4,
      setPageIndex: vi.fn(),
      isModalOpen: false,
    };
    const { rerender } = render(<ScrollNavigationHarness {...props} effectiveScrollDirection="horizontal" />);

    rerender(<ScrollNavigationHarness {...props} effectiveScrollDirection="vertical" />);

    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 1600, left: 0, behavior: 'instant' });
  });

  it('ignores scrolling inside a nested page or while a modal is open', () => {
    const setPageIndex = vi.fn();
    const props = {
      currentPageIndex: 0,
      pagesLength: 4,
      setPageIndex,
      isModalOpen: false,
      effectiveScrollDirection: 'horizontal' as const,
    };
    const { rerender } = render(<ScrollNavigationHarness {...props} />);
    const viewport = screen.getByTestId('viewport');
    viewport.scrollLeft = 1000;

    fireEvent.scroll(screen.getByTestId('page-0'));
    rerender(<ScrollNavigationHarness {...props} isModalOpen />);
    fireEvent.scroll(viewport);

    expect(setPageIndex).not.toHaveBeenCalled();
  });
});
