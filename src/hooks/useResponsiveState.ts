import { useEffect, useRef, useState } from 'react';
import { getBreakpointFromViewport, type BreakpointKey } from '@/constants/grid';

export function useResponsiveState() {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>('desktop');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setBreakpoint(getBreakpointFromViewport(window.innerWidth, window.innerHeight));
      }, 50);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    breakpoint,
    isDesktop: breakpoint === 'desktop',
    isTablet: breakpoint === 'tablet',
    isMobile: breakpoint === 'mobile',
    mainRef,
  };
}
