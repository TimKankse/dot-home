import { useEffect, useRef } from 'react';

interface UseScrollNavigationProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isModalOpen: boolean;
  effectiveScrollDirection: 'vertical' | 'horizontal';
}

export const useScrollNavigation = ({
  currentPageIndex,
  pagesLength,
  setPageIndex,
  isModalOpen,
  effectiveScrollDirection
}: UseScrollNavigationProps) => {
  const isScrollLocked = useRef(false);
  const scrollUnlockTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isModalOpen) return;

      let target = e.target as HTMLElement;
      while (target && target !== document.body) {
        const style = window.getComputedStyle(target);
        
        if (effectiveScrollDirection === 'vertical') {
          const overflowY = style.overflowY;
          const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight;
          if (isScrollableY) return;
        } else {
          const overflowX = style.overflowX;
          const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && target.scrollWidth > target.clientWidth;
          if (isScrollableX) return;
        }

        target = target.parentElement as HTMLElement;
      }

      if (scrollUnlockTimeout.current) {
        clearTimeout(scrollUnlockTimeout.current);
      }
      
      scrollUnlockTimeout.current = setTimeout(() => {
        isScrollLocked.current = false;
      }, 30);

      if (isScrollLocked.current) return;

      const threshold = 30;
      
      const primaryDelta = effectiveScrollDirection === 'vertical' ? e.deltaY : e.deltaX;
      
      if (Math.abs(primaryDelta) > threshold) {
        if (primaryDelta > 0) {
          // Next page
          if (currentPageIndex < pagesLength - 1) {
            setPageIndex(currentPageIndex + 1);
            isScrollLocked.current = true;
          }
        } else {
          // Previous page
          if (currentPageIndex > 0) {
            setPageIndex(currentPageIndex - 1);
            isScrollLocked.current = true;
          }
        }
      }
    };

    // --- Touch Handling for Swipe Navigation ---
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isModalOpen) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;

      let target = e.target as HTMLElement;
      while (target && target !== document.body) {
        const style = window.getComputedStyle(target);
        
        const overflowX = style.overflowX;
        const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && target.scrollWidth > target.clientWidth;
        
        if (isScrollableX) return;

        target = target.parentElement as HTMLElement;
      }

      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          if (currentPageIndex < pagesLength - 1) {
            setPageIndex(currentPageIndex + 1);
          }
        } else {
          if (currentPageIndex > 0) {
            setPageIndex(currentPageIndex - 1);
          }
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      if (scrollUnlockTimeout.current) {
        clearTimeout(scrollUnlockTimeout.current);
      }
    };
  }, [currentPageIndex, pagesLength, setPageIndex, isModalOpen, effectiveScrollDirection]);
};
