import { useState, useEffect, useRef } from 'react';

export function useResponsiveState() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const [rowHeight, setRowHeight] = useState(90);
  const [isMedium, setIsMedium] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const breakpointRef = useRef('lg');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const newIsMobile = width < 768;
        // isMedium triggers if width is between 768 and 975 (tablet landscape) 
        // OR if height > width (portrait tablet/desktop)
        const newIsMedium = (width >= 768 && width <= 975) || (height > width && !newIsMobile);
        
        setIsMobile(newIsMobile);
        setIsMedium(newIsMedium);

        const padding = 80;
        const margins = 7 * 16;
        const containerHeight = mainRef.current?.clientHeight || window.innerHeight;
        const availableHeight = containerHeight - padding - margins;
        const newRowHeight = Math.floor(availableHeight / 8);
        setRowHeight(newRowHeight > 60 ? newRowHeight : 60);
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

  const handleBreakpointChange = (newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint);
    breakpointRef.current = newBreakpoint;
  };

  return {
    rowHeight,
    isMobile,
    isMedium,
    currentBreakpoint,
    breakpointRef,
    mainRef,
    handleBreakpointChange
  };
}
