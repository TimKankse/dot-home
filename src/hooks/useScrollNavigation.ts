import { useEffect, useRef } from 'react';

interface UseScrollNavigationProps {
  currentPageIndex: number;
  pagesLength: number;
  setPageIndex: (index: number) => void;
  isAddModalOpen: boolean;
  effectiveScrollDirection: 'vertical' | 'horizontal';
}

export const useScrollNavigation = ({
  currentPageIndex,
  pagesLength,
  setPageIndex,
  isAddModalOpen,
  effectiveScrollDirection
}: UseScrollNavigationProps) => {
  const lastScrollTime = useRef(0);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isAddModalOpen) return;

      // Check if we are scrolling inside a scrollable element
      let target = e.target as HTMLElement;
      while (target && target !== document.body) {
        const style = window.getComputedStyle(target);
        
        if (effectiveScrollDirection === 'vertical') {
          // In vertical page layout, we only care if we're inside a vertically scrollable container
          const overflowY = style.overflowY;
          const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight;
          if (isScrollableY) return;
        } else {
          // In horizontal page layout (portrait), we only care if we're inside a horizontally scrollable container
          // Vertical scrolling inside a container shouldn't block horizontal page switching
          const overflowX = style.overflowX;
          const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && target.scrollWidth > target.clientWidth;
          if (isScrollableX) return;
        }

        target = target.parentElement as HTMLElement;
      }

      const now = Date.now();
      if (now - lastScrollTime.current < 400) return; // Throttle to 400ms

      const threshold = 30;
      
      // Determine which delta to check based on effective scroll direction
      // If vertical layout: check deltaY (mouse wheel)
      // If horizontal layout: check deltaX (trackpad swipe / shift+wheel)
      const primaryDelta = effectiveScrollDirection === 'vertical' ? e.deltaY : e.deltaX;
      
      if (Math.abs(primaryDelta) > threshold) {
        if (primaryDelta > 0) {
          // Next page
          if (currentPageIndex < pagesLength - 1) {
            setPageIndex(currentPageIndex + 1);
            lastScrollTime.current = now;
          }
        } else {
          // Previous page
          if (currentPageIndex > 0) {
            setPageIndex(currentPageIndex - 1);
            lastScrollTime.current = now;
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
      if (isAddModalOpen) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchStartX - touchEndX;
      const deltaY = touchStartY - touchEndY;

      // Check for scrollable ancestors (same logic as wheel)
      let target = e.target as HTMLElement;
      while (target && target !== document.body) {
        const style = window.getComputedStyle(target);
        
        // For swipe, we primarily care about horizontal scrollable containers blocking the swipe
        const overflowX = style.overflowX;
        const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && target.scrollWidth > target.clientWidth;
        
        if (isScrollableX) return;

        target = target.parentElement as HTMLElement;
      }

      const minSwipeDistance = 50;

      // Check if horizontal swipe is dominant and exceeds threshold
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          // Swiped Left -> Next Page
          if (currentPageIndex < pagesLength - 1) {
            setPageIndex(currentPageIndex + 1);
          }
        } else {
          // Swiped Right -> Previous Page
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
    };
  }, [currentPageIndex, pagesLength, setPageIndex, isAddModalOpen, effectiveScrollDirection]);
};
