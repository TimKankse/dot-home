import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_NAVIGATION_LOCK_MS, useScrollNavigation } from './useScrollNavigation';

interface HarnessProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isModalOpen: boolean;
  effectiveScrollDirection: 'vertical' | 'horizontal';
}

const ScrollNavigationHarness = (props: HarnessProps) => {
  useScrollNavigation(props);
  return <div data-testid="scroll-navigation-harness" />;
};

const dispatchWheel = (target: HTMLElement, deltaY: number) => {
  act(() => {
    target.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY,
    }));
  });
};

describe('useScrollNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
    });
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('locks wheel navigation to one page change per transition', () => {
    const setPageIndex = vi.fn();
    const wheelTarget = document.createElement('div');
    document.body.appendChild(wheelTarget);

    const { rerender } = render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).toHaveBeenCalledTimes(1);
    expect(setPageIndex).toHaveBeenLastCalledWith(1);

    rerender(
      <ScrollNavigationHarness
        currentPageIndex={1}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(PAGE_NAVIGATION_LOCK_MS + 32);
    });

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).toHaveBeenCalledTimes(2);
    expect(setPageIndex).toHaveBeenLastCalledWith(2);
  });

  it('keeps the lock alive while trackpad inertia is still sending wheel events', () => {
    const setPageIndex = vi.fn();
    const wheelTarget = document.createElement('div');
    document.body.appendChild(wheelTarget);

    const { rerender } = render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).toHaveBeenCalledTimes(1);
    expect(setPageIndex).toHaveBeenLastCalledWith(1);

    rerender(
      <ScrollNavigationHarness
        currentPageIndex={1}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    act(() => {
      vi.advanceTimersByTime(PAGE_NAVIGATION_LOCK_MS - 10);
    });

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(20);
    });

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(32);
    });

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).toHaveBeenCalledTimes(2);
    expect(setPageIndex).toHaveBeenLastCalledWith(2);
  });

  it('does not navigate before the first page or past the last page', () => {
    const setPageIndex = vi.fn();
    const wheelTarget = document.createElement('div');
    document.body.appendChild(wheelTarget);

    const { rerender } = render(
      <ScrollNavigationHarness
        currentPageIndex={0}
        pagesLength={3}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    dispatchWheel(wheelTarget, -120);

    expect(setPageIndex).not.toHaveBeenCalled();

    rerender(
      <ScrollNavigationHarness
        currentPageIndex={2}
        pagesLength={3}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    dispatchWheel(wheelTarget, 120);

    expect(setPageIndex).not.toHaveBeenCalled();
  });

  it('keeps nested vertical scrollers working', () => {
    const setPageIndex = vi.fn();
    const scrollContainer = document.createElement('div');
    const scrollChild = document.createElement('div');

    scrollContainer.style.overflowY = 'auto';
    Object.defineProperty(scrollContainer, 'scrollHeight', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(scrollContainer, 'clientHeight', {
      configurable: true,
      value: 100,
    });

    scrollContainer.appendChild(scrollChild);
    document.body.appendChild(scrollContainer);

    render(
      <ScrollNavigationHarness
        currentPageIndex={1}
        pagesLength={4}
        setPageIndex={setPageIndex}
        isModalOpen={false}
        effectiveScrollDirection="vertical"
      />
    );

    dispatchWheel(scrollChild, 120);

    expect(setPageIndex).not.toHaveBeenCalled();
  });
});
