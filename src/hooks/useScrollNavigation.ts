import { RefObject, useEffect, useLayoutEffect, useRef } from "react";

interface UseScrollNavigationProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isModalOpen: boolean;
  effectiveScrollDirection: "vertical" | "horizontal";
  viewportRef: RefObject<HTMLElement | null>;
  wrapperRef: RefObject<HTMLElement | null>;
}

type TimeoutHandle = ReturnType<typeof setTimeout>;

export const SCROLL_SNAP_SETTLE_MS = 120;
export const PAGE_TRANSITION_MS = 120;
const AUTO_SCROLL_SYNC_RETRY_MS = 32;
const MAX_AUTO_SCROLL_SYNC_RETRIES = 8;
const SCROLL_POSITION_TOLERANCE_PX = 1;

export const useScrollNavigation = ({
  currentPageIndex,
  pagesLength,
  setPageIndex,
  isModalOpen,
  effectiveScrollDirection,
  viewportRef,
  wrapperRef,
}: UseScrollNavigationProps) => {
  const currentPageIndexRef = useRef(currentPageIndex);
  const pagesLengthRef = useRef(pagesLength);
  const setPageIndexRef = useRef(setPageIndex);
  const isModalOpenRef = useRef(isModalOpen);
  const scrollDirectionRef = useRef(effectiveScrollDirection);
  const hasSyncedInitialPageRef = useRef(false);
  const lastLayoutKeyRef = useRef(`${effectiveScrollDirection}:${pagesLength}`);
  const scrollSettleTimeoutRef = useRef<TimeoutHandle | null>(null);
  const scrollSyncRetryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const suppressScrollSyncRef = useRef(false);
  const skipNextScrollToIndexRef = useRef<number | null>(null);
  const cancelPageTransitionRef = useRef<(() => void) | null>(null);

  const cancelPageTransition = () => {
    cancelPageTransitionRef.current?.();
    cancelPageTransitionRef.current = null;
    suppressScrollSyncRef.current = false;
  };

  const clearScrollSettleTimeout = () => {
    if (!scrollSettleTimeoutRef.current) {
      return;
    }

    clearTimeout(scrollSettleTimeoutRef.current);
    scrollSettleTimeoutRef.current = null;
  };

  const clearScrollSyncRetryTimeout = () => {
    if (!scrollSyncRetryTimeoutRef.current) {
      return;
    }

    clearTimeout(scrollSyncRetryTimeoutRef.current);
    scrollSyncRetryTimeoutRef.current = null;
  };

  const getScrollPositionPx = () => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return null;
    }

    return scrollDirectionRef.current === "vertical"
      ? viewport.scrollTop
      : viewport.scrollLeft;
  };

  const getPageSizePx = () => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return scrollDirectionRef.current === "vertical"
        ? window.innerHeight
        : window.innerWidth;
    }

    const rect = viewport.getBoundingClientRect();
    return scrollDirectionRef.current === "vertical" ? rect.height : rect.width;
  };

  const getPageTargetPositionPx = (pageIndex: number) => {
    const clampedIndex = Math.max(
      0,
      Math.min(pageIndex, pagesLengthRef.current - 1),
    );
    const pageElement = wrapperRef.current?.children.item(
      clampedIndex,
    ) as HTMLElement | null;

    if (pageElement) {
      const pageSizePx =
        scrollDirectionRef.current === "vertical"
          ? pageElement.offsetHeight
          : pageElement.offsetWidth;
      const pageOffsetPx =
        scrollDirectionRef.current === "vertical"
          ? pageElement.offsetTop
          : pageElement.offsetLeft;

      if (pageSizePx > 0) {
        if (clampedIndex === 0 || pageOffsetPx > 0) {
          return pageOffsetPx;
        }

        return clampedIndex * pageSizePx;
      }
    }

    const pageSizePx = getPageSizePx();
    if (pageSizePx <= 0) {
      return null;
    }

    return clampedIndex * pageSizePx;
  };

  const scrollViewportToPage = (
    pageIndex: number,
    behavior: ScrollBehavior,
  ) => {
    const viewport = viewportRef.current;
    const targetPositionPx = getPageTargetPositionPx(pageIndex);

    if (!viewport || targetPositionPx === null) {
      return null;
    }

    viewport.scrollTo({
      top: scrollDirectionRef.current === "vertical" ? targetPositionPx : 0,
      left: scrollDirectionRef.current === "horizontal" ? targetPositionPx : 0,
      behavior,
    });

    return targetPositionPx;
  };

  const animateViewportToPage = (pageIndex: number) => {
    const viewport = viewportRef.current;
    const target = getPageTargetPositionPx(pageIndex);
    const start = getScrollPositionPx();
    if (!viewport || target === null || start === null) return;
    if (
      Math.abs(target - start) <= SCROLL_POSITION_TOLERANCE_PX ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      scrollViewportToPage(pageIndex, "instant");
      return;
    }

    const vertical = scrollDirectionRef.current === "vertical";
    const previousSnapType = viewport.style.scrollSnapType;
    // Snap only at the destination, rather than fighting each animation frame.
    viewport.style.scrollSnapType = "none";
    suppressScrollSyncRef.current = true;
    const startedAt = performance.now();
    let frame: number;
    const finish = () => {
      cancelAnimationFrame(frame);
      viewport.style.scrollSnapType = previousSnapType;
      suppressScrollSyncRef.current = false;
      cancelPageTransitionRef.current = null;
    };
    cancelPageTransitionRef.current = finish;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / PAGE_TRANSITION_MS);
      const eased = 1 - (1 - progress) ** 3;
      const position = start + (target - start) * eased;
      viewport.scrollTo({
        top: vertical ? position : 0,
        left: vertical ? 0 : position,
        behavior: "instant",
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
  };

  const syncViewportToPage = (pageIndex: number, attempt = 0) => {
    const targetPositionPx = scrollViewportToPage(pageIndex, "auto");

    if (targetPositionPx === null) {
      if (attempt >= MAX_AUTO_SCROLL_SYNC_RETRIES) {
        return;
      }

      scrollSyncRetryTimeoutRef.current = setTimeout(() => {
        scrollSyncRetryTimeoutRef.current = null;
        syncViewportToPage(currentPageIndexRef.current, attempt + 1);
      }, AUTO_SCROLL_SYNC_RETRY_MS);
      return;
    }

    const currentPositionPx = getScrollPositionPx();
    if (
      currentPositionPx !== null &&
      Math.abs(currentPositionPx - targetPositionPx) <=
        SCROLL_POSITION_TOLERANCE_PX
    ) {
      return;
    }

    if (attempt >= MAX_AUTO_SCROLL_SYNC_RETRIES) {
      return;
    }

    scrollSyncRetryTimeoutRef.current = setTimeout(() => {
      scrollSyncRetryTimeoutRef.current = null;
      syncViewportToPage(currentPageIndexRef.current, attempt + 1);
    }, AUTO_SCROLL_SYNC_RETRY_MS);
  };

  useLayoutEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
    pagesLengthRef.current = pagesLength;
    setPageIndexRef.current = setPageIndex;
    isModalOpenRef.current = isModalOpen;
    scrollDirectionRef.current = effectiveScrollDirection;
  }, [
    currentPageIndex,
    pagesLength,
    setPageIndex,
    isModalOpen,
    effectiveScrollDirection,
  ]);

  useLayoutEffect(() => {
    cancelPageTransition();
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

    const shouldAnimate =
      hasSyncedInitialPageRef.current && lastLayoutKeyRef.current === layoutKey;
    clearScrollSyncRetryTimeout();
    clearScrollSettleTimeout();

    if (shouldAnimate) {
      animateViewportToPage(currentPageIndex);
    } else {
      syncViewportToPage(currentPageIndex);
    }

    hasSyncedInitialPageRef.current = true;
    lastLayoutKeyRef.current = layoutKey;
    return () => {
      cancelPageTransition();
      clearScrollSyncRetryTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageIndex, effectiveScrollDirection, pagesLength]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const handleScroll = () => {
      clearScrollSettleTimeout();

      if (
        !suppressScrollSyncRef.current &&
        !isModalOpenRef.current &&
        pagesLengthRef.current > 0
      ) {
        const pageSizePx = getPageSizePx();

        if (pageSizePx > 0) {
          const scrollPositionPx =
            scrollDirectionRef.current === "vertical"
              ? viewport.scrollTop
              : viewport.scrollLeft;
          const nextPageIndex = Math.round(scrollPositionPx / pageSizePx);
          const clampedIndex = Math.max(
            0,
            Math.min(nextPageIndex, pagesLengthRef.current - 1),
          );

          if (clampedIndex !== currentPageIndexRef.current) {
            skipNextScrollToIndexRef.current = clampedIndex;
            setPageIndexRef.current(clampedIndex);
          }
        }
      }

      scrollSettleTimeoutRef.current = setTimeout(() => {
        scrollSettleTimeoutRef.current = null;

        if (suppressScrollSyncRef.current) {
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
          scrollDirectionRef.current === "vertical"
            ? viewport.scrollTop
            : viewport.scrollLeft;
        const nextPageIndex = Math.round(scrollPositionPx / pageSizePx);
        const clampedIndex = Math.max(
          0,
          Math.min(nextPageIndex, pagesLengthRef.current - 1),
        );

        if (clampedIndex !== currentPageIndexRef.current) {
          skipNextScrollToIndexRef.current = clampedIndex;
          setPageIndexRef.current(clampedIndex);
        }
      }, SCROLL_SNAP_SETTLE_MS);
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    // Direct input takes over immediately; never drag the user back to an old
    // keyboard/button destination after they start scrolling or touching.
    viewport.addEventListener("wheel", cancelPageTransition, { passive: true });
    viewport.addEventListener("pointerdown", cancelPageTransition, {
      passive: true,
    });
    viewport.addEventListener("touchstart", cancelPageTransition, {
      passive: true,
    });

    return () => {
      cancelPageTransition();
      clearScrollSettleTimeout();
      clearScrollSyncRetryTimeout();
      viewport.removeEventListener("scroll", handleScroll);
      viewport.removeEventListener("wheel", cancelPageTransition);
      viewport.removeEventListener("pointerdown", cancelPageTransition);
      viewport.removeEventListener("touchstart", cancelPageTransition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScrollDirection, pagesLength, viewportRef]);
};
