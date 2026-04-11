import { useEffect, useRef } from 'react';

interface UseScrollNavigationProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isModalOpen: boolean;
  effectiveScrollDirection: 'vertical' | 'horizontal';
}

export const PAGE_NAVIGATION_LOCK_MS = 550;

const WHEEL_NAVIGATION_THRESHOLD = 30;
const TOUCH_NAVIGATION_THRESHOLD = 50;
const QUIET_WHEEL_FRAMES_TO_UNLOCK = 2;

const isScrollableTarget = (
  target: EventTarget | null,
  direction: 'vertical' | 'horizontal'
) => {
  let element = target instanceof HTMLElement ? target : null;

  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);

    if (direction === 'vertical') {
      const overflowY = style.overflowY;
      const isScrollableY =
        (overflowY === 'auto' || overflowY === 'scroll') &&
        element.scrollHeight > element.clientHeight;

      if (isScrollableY) {
        return true;
      }
    } else {
      const overflowX = style.overflowX;
      const isScrollableX =
        (overflowX === 'auto' || overflowX === 'scroll') &&
        element.scrollWidth > element.clientWidth;

      if (isScrollableX) {
        return true;
      }
    }

    element = element.parentElement;
  }

  return false;
};

export const useScrollNavigation = ({
  currentPageIndex,
  pagesLength,
  setPageIndex,
  isModalOpen,
  effectiveScrollDirection
}: UseScrollNavigationProps) => {
  const isScrollLocked = useRef(false);
  const scrollUnlockTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quietUnlockFrame = useRef<number | null>(null);
  const navigationLockUntilRef = useRef(0);
  const wheelGestureVersionRef = useRef(0);
  const quietFramesWithoutWheelRef = useRef(0);
  const currentPageIndexRef = useRef(currentPageIndex);
  const pagesLengthRef = useRef(pagesLength);
  const setPageIndexRef = useRef(setPageIndex);
  const isModalOpenRef = useRef(isModalOpen);
  const scrollDirectionRef = useRef(effectiveScrollDirection);

  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  useEffect(() => {
    pagesLengthRef.current = pagesLength;
  }, [pagesLength]);

  useEffect(() => {
    setPageIndexRef.current = setPageIndex;
  }, [setPageIndex]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  useEffect(() => {
    scrollDirectionRef.current = effectiveScrollDirection;
  }, [effectiveScrollDirection]);

  useEffect(() => {
    const clearUnlockTimeout = () => {
      if (!scrollUnlockTimeout.current) {
        return;
      }

      clearTimeout(scrollUnlockTimeout.current);
      scrollUnlockTimeout.current = null;
    };

    const clearQuietUnlockFrame = () => {
      if (quietUnlockFrame.current === null) {
        return;
      }

      cancelAnimationFrame(quietUnlockFrame.current);
      quietUnlockFrame.current = null;
    };

    const unlockNavigation = () => {
      clearUnlockTimeout();
      clearQuietUnlockFrame();
      isScrollLocked.current = false;
      navigationLockUntilRef.current = 0;
      wheelGestureVersionRef.current = 0;
      quietFramesWithoutWheelRef.current = 0;
    };

    const scheduleQuietUnlockCheck = () => {
      if (!isScrollLocked.current) {
        return;
      }

      clearQuietUnlockFrame();

      const observedWheelVersion = wheelGestureVersionRef.current;

      quietUnlockFrame.current = requestAnimationFrame(() => {
        quietUnlockFrame.current = null;

        if (!isScrollLocked.current) {
          return;
        }

        if (Date.now() < navigationLockUntilRef.current) {
          scheduleUnlockCheck();
          return;
        }

        if (wheelGestureVersionRef.current !== observedWheelVersion) {
          quietFramesWithoutWheelRef.current = 0;
          scheduleQuietUnlockCheck();
          return;
        }

        quietFramesWithoutWheelRef.current += 1;

        if (quietFramesWithoutWheelRef.current >= QUIET_WHEEL_FRAMES_TO_UNLOCK) {
          unlockNavigation();
          return;
        }

        scheduleQuietUnlockCheck();
      });
    };

    const scheduleUnlockCheck = () => {
      clearUnlockTimeout();

      if (!isScrollLocked.current) {
        return;
      }

      const delay = Math.max(navigationLockUntilRef.current - Date.now(), 0);

      scrollUnlockTimeout.current = setTimeout(() => {
        scrollUnlockTimeout.current = null;

        if (Date.now() < navigationLockUntilRef.current) {
          scheduleUnlockCheck();
          return;
        }

        scheduleQuietUnlockCheck();
      }, delay);
    };

    const lockNavigation = () => {
      const now = Date.now();

      isScrollLocked.current = true;
      navigationLockUntilRef.current = now + PAGE_NAVIGATION_LOCK_MS;
      quietFramesWithoutWheelRef.current = 0;
      clearQuietUnlockFrame();
      scheduleUnlockCheck();
    };

    const registerWheelGestureActivity = (primaryDelta: number) => {
      if (Math.abs(primaryDelta) === 0) {
        return;
      }

      wheelGestureVersionRef.current += 1;
      quietFramesWithoutWheelRef.current = 0;

      if (isScrollLocked.current && Date.now() >= navigationLockUntilRef.current) {
        scheduleQuietUnlockCheck();
      }
    };

    const navigatePage = (
      direction: 1 | -1,
      source: 'wheel' | 'touch',
      primaryDelta?: number
    ) => {
      const nextPageIndex = currentPageIndexRef.current + direction;

      if (nextPageIndex < 0 || nextPageIndex >= pagesLengthRef.current) {
        return false;
      }

      setPageIndexRef.current(nextPageIndex);
      lockNavigation();

      if (source === 'wheel' && primaryDelta !== undefined) {
        registerWheelGestureActivity(primaryDelta);
      }

      return true;
    };

    const handleWheel = (e: WheelEvent) => {
      if (isModalOpenRef.current || document.body.style.overflow === 'hidden') {
        return;
      }

      const direction = scrollDirectionRef.current;

      if (isScrollableTarget(e.target, direction)) {
        return;
      }

      const primaryDelta = direction === 'vertical' ? e.deltaY : e.deltaX;

      if (isScrollLocked.current) {
        registerWheelGestureActivity(primaryDelta);
        e.preventDefault();
        return;
      }

      if (Math.abs(primaryDelta) <= WHEEL_NAVIGATION_THRESHOLD) {
        return;
      }

      const didNavigate = primaryDelta > 0
        ? navigatePage(1, 'wheel', primaryDelta)
        : navigatePage(-1, 'wheel', primaryDelta);

      if (didNavigate) {
        e.preventDefault();
      }
    };

    // --- Touch Handling for Swipe Navigation ---
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        return;
      }

      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isModalOpenRef.current || document.body.style.overflow === 'hidden') {
        return;
      }

      if (isScrollLocked.current || e.changedTouches.length === 0) {
        return;
      }

      const direction = scrollDirectionRef.current;

      if (isScrollableTarget(e.target, direction)) {
        return;
      }

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;
      const primaryDelta = direction === 'vertical' ? deltaY : deltaX;
      const crossDelta = direction === 'vertical' ? deltaX : deltaY;

      if (
        Math.abs(primaryDelta) <= TOUCH_NAVIGATION_THRESHOLD ||
        Math.abs(primaryDelta) <= Math.abs(crossDelta)
      ) {
        return;
      }

      if (primaryDelta > 0) {
        navigatePage(1, 'touch');
        return;
      }

      navigatePage(-1, 'touch');
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      unlockNavigation();
    };
  }, []);
};
