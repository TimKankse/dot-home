import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getBreakpointFromViewport,
  normalizeBreakpointThresholds,
  type BreakpointKey,
} from '@/constants/grid';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useResponsiveState() {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>('desktop');
  const mainRef = useRef<HTMLElement>(null);
  const mobileBreakpointMaxWidth = useSettingsStore(
    (state) => state.settings.display.mobileBreakpointMaxWidth,
  );
  const tabletBreakpointMaxWidth = useSettingsStore(
    (state) => state.settings.display.tabletBreakpointMaxWidth,
  );
  const breakpointThresholds = useMemo(
    () => normalizeBreakpointThresholds({
      mobileMaxWidth: mobileBreakpointMaxWidth,
      tabletMaxWidth: tabletBreakpointMaxWidth,
    }),
    [mobileBreakpointMaxWidth, tabletBreakpointMaxWidth],
  );

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setBreakpoint(getBreakpointFromViewport(
          window.innerWidth,
          window.innerHeight,
          breakpointThresholds,
        ));
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
  }, [breakpointThresholds]);

  return {
    breakpoint,
    isDesktop: breakpoint === 'desktop',
    isTablet: breakpoint === 'tablet',
    isMobile: breakpoint === 'mobile',
    breakpointThresholds,
    mainRef,
  };
}
