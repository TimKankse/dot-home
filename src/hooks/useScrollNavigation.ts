import { RefObject, useEffect, useLayoutEffect, useRef } from 'react';

interface UseScrollNavigationProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isModalOpen: boolean;
  effectiveScrollDirection: 'vertical' | 'horizontal';
  viewportRef: RefObject<HTMLElement | null>;
  wrapperRef: RefObject<HTMLElement | null>;
}

type TimeoutHandle = ReturnType<typeof setTimeout>;

export const SCROLL_SNAP_SETTLE_MS = 120;

export const useScrollNavigation = ({
  currentPageIndex,
  pagesLength,
  setPageIndex,
  isModalOpen,
  effectiveScrollDirection,
  viewportRef,
}: UseScrollNavigationProps) => {
  const currentPageIndexRef = useRef(currentPageIndex);
  const pagesLengthRef = useRef(pagesLength);
  const setPageIndexRef = useRef(setPageIndex);
  const isModalOpenRef = useRef(isModalOpen);
  const scrollDirectionRef = useRef(effectiveScrollDirection);
  const hasSyncedInitialPageRef = useRef(false);
  const lastLayoutKeyRef = useRef(`${effectiveScrollDirection}:${pagesLength}`);
  const scrollSettleTimeoutRef = useRef<TimeoutHandle | null>(null);
  const suppressScrollSyncRef = useRef(false);
  const skipNextScrollToIndexRef = useRef<number | null>(null);

  const clearScrollSettleTimeout = () => {
    if (!scrollSettleTimeoutRef.current) {
      return;
    }

    clearTimeout(scrollSettleTimeoutRef.current);
    scrollSettleTimeoutRef.current = null;
  };

  const getPageSizePx = () => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return scrollDirectionRef.current === 'vertical' ? window.innerHeight : window.innerWidth;
    }

    const rect = viewport.getBoundingClientRect();
    return scrollDirectionRef.current === 'vertical' ? rect.height : rect.width;
  };

  const scrollViewportToPage = (pageIndex: number, behavior: ScrollBehavior) => {
    const viewport = viewportRef.current;
    const pageSizePx = getPageSizePx();

    if (!viewport || pageSizePx <= 0) {
      return;
    }

    const clampedIndex = Math.max(0, Math.min(pageIndex, pagesLengthRef.current - 1));
    viewport.scrollTo({
      top: scrollDirectionRef.current === 'vertical' ? clampedIndex * pageSizePx : 0,
      left: scrollDirectionRef.current === 'horizontal' ? clampedIndex * pageSizePx : 0,
      behavior,
    });
  };

  useLayoutEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
    pagesLengthRef.current = pagesLength;
    setPageIndexRef.current = setPageIndex;
    isModalOpenRef.current = isModalOpen;
    scrollDirectionRef.current = effectiveScrollDirection;
  }, [currentPageIndex, pagesLength, setPageIndex, isModalOpen, effectiveScrollDirection]);

  useLayoutEffect(() => {
    if (pagesLength <= 0) {
      return;
    }

    const layoutKey = `${effectiveScrollDirection}:${pagesLength}`;
    if (skipNextScrollToIndexRef.current === currentPageIndex) {
      skipNextScrollToIndexRef.current = null;
      hasSyncedInitialPageRef.current = true;
      lastLayoutKeyRef.current = layoutKey;
      return;
    }

    const behavior: ScrollBehavior =
      hasSyncedInitialPageRef.current && lastLayoutKeyRef.current === layoutKey
        ? 'smooth'
        : 'auto';

    suppressScrollSyncRef.current = behavior === 'smooth';
    scrollViewportToPage(currentPageIndex, behavior);
    hasSyncedInitialPageRef.current = true;
    lastLayoutKeyRef.current = layoutKey;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex, effectiveScrollDirection, pagesLength]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      clearScrollSettleTimeout();

      if (!suppressScrollSyncRef.current && !isModalOpenRef.current && pagesLengthRef.current > 0) {
        const pageSizePx = getPageSizePx();

        if (pageSizePx > 0) {
          const scrollPositionPx =
            scrollDirectionRef.current === 'vertical' ? viewport.scrollTop : viewport.scrollLeft;
          const nextPageIndex = Math.round(scrollPositionPx / pageSizePx);
          const clampedIndex = Math.max(0, Math.min(nextPageIndex, pagesLengthRef.current - 1));

          if (clampedIndex !== currentPageIndexRef.current) {
            skipNextScrollToIndexRef.current = clampedIndex;
            setPageIndexRef.current(clampedIndex);
          }
        }
      }

      scrollSettleTimeoutRef.current = setTimeout(() => {
        scrollSettleTimeoutRef.current = null;

        if (suppressScrollSyncRef.current) {
          suppressScrollSyncRef.current = false;
          return;
        }

        if (isModalOpenRef.current || pagesLengthRef.current <= 0) {
          return;
        }

        const pageSizePx = getPageSizePx();
        if (pageSizePx <= 0) {
          return;
        }

        const scrollPositionPx =
          scrollDirectionRef.current === 'vertical' ? viewport.scrollTop : viewport.scrollLeft;
        const nextPageIndex = Math.round(scrollPositionPx / pageSizePx);
        const clampedIndex = Math.max(0, Math.min(nextPageIndex, pagesLengthRef.current - 1));

        if (clampedIndex !== currentPageIndexRef.current) {
          skipNextScrollToIndexRef.current = clampedIndex;
          setPageIndexRef.current(clampedIndex);
        }
      }, SCROLL_SNAP_SETTLE_MS);
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearScrollSettleTimeout();
      viewport.removeEventListener('scroll', handleScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
