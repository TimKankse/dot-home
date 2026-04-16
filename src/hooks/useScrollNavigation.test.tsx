import type React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCROLL_SNAP_SETTLE_MS, useScrollNavigation } from './useScrollNavigation';

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

  useScrollNavigation({
    ...props,
    viewportRef,
    wrapperRef,
  });

  if (props.showViewport === false) {
    return null;
  }

  return (
    <div data-testid="viewport" ref={viewportRef}>
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
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout'],
    });

    scrollToMock = vi.fn(function scrollTo(
      this: HTMLElement,
      options?: ScrollToOptions | number,
      maybeTop?: number,
    ) {
      if (typeof options === 'number') {
        this.scrollLeft = options;
        this.scrollTop = maybeTop ?? 0;
        return;
      }

      this.scrollLeft = options?.left ?? this.scrollLeft;
      this.scrollTop = options?.top ?? this.scrollTop;
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
      behavior: 'auto',
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

    act(() => {
      viewport.dispatchEvent(new Event('scroll'));
    });

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
      behavior: 'auto',
    });
  });

  it('uses smooth scrolling for later programmatic page changes', () => {
    const { rerender } = render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={vi.fn()}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    scrollToMock.mockClear();

    rerender(
      <ScrollNavigationHarness
        currentPageIndex={1}
        pagesLength={4}
        setPageIndex={vi.fn()}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      left: 1000,
      behavior: 'smooth',
    });
  });

  it('tracks the snapped page after horizontal scrolling settles', () => {
    const setPageIndex = vi.fn();

    render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    const viewport = screen.getByTestId('viewport');
    viewport.scrollLeft = 1900;

    act(() => {
      viewport.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(SCROLL_SNAP_SETTLE_MS + 1);
    });

    expect(setPageIndex).toHaveBeenCalledWith(2);
  });

  it('updates the active page immediately while manually scrolling', () => {
    const setPageIndex = vi.fn();

    render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    const viewport = screen.getByTestId('viewport');
    viewport.scrollLeft = 1200;

    act(() => {
      viewport.dispatchEvent(new Event('scroll'));
    });

    expect(setPageIndex).toHaveBeenCalledWith(1);
  });

  it('tracks the snapped page after vertical scrolling settles', () => {
    const setPageIndex = vi.fn();

    render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    const viewport = screen.getByTestId('viewport');
    viewport.scrollTop = 1700;

    act(() => {
      viewport.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(SCROLL_SNAP_SETTLE_MS + 1);
    });

    expect(setPageIndex).toHaveBeenCalledWith(2);
  });

  it('ignores scroll-settle navigation while a modal is open', () => {
    const setPageIndex = vi.fn();

    render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={true}
        effectiveScrollDirection="horizontal"
      />
    );

    const viewport = screen.getByTestId('viewport');
    viewport.scrollLeft = 1000;

    act(() => {
      viewport.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(SCROLL_SNAP_SETTLE_MS + 1);
    });

    expect(setPageIndex).not.toHaveBeenCalled();
  });

  it('does not feed scroll updates back through programmatic smooth scrolling', () => {
    const setPageIndex = vi.fn();
    const { rerender } = render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    rerender(
      <ScrollNavigationHarness
        currentPageIndex={2}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="horizontal"
      />
    );

    const viewport = screen.getByTestId('viewport');
    viewport.scrollLeft = 1500;

    act(() => {
      viewport.dispatchEvent(new Event('scroll'));
    });

    expect(setPageIndex).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(SCROLL_SNAP_SETTLE_MS + 1);
    });

    expect(setPageIndex).not.toHaveBeenCalled();
  });
});
