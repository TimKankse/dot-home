"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { GridStack, GridStackNode, GridStackOptions } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { GridStackProvider } from '../gridstack-react/grid-stack-provider';
import { GridStackRenderProvider } from '../gridstack-react/grid-stack-render-provider';
import { useGridStackContext } from '../gridstack-react/grid-stack-context';

interface DashboardGridProps {
  children: React.ReactNode;
  items: any[];
  isEditing?: boolean;
  onLayoutChange?: (layout: any[], allLayouts: { [key: string]: any[] }) => void;
  onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
  rowHeight?: number;
  isMedium?: boolean;
  isMobile?: boolean;
}

const DashboardGridContent: React.FC<DashboardGridProps> = ({ 
  children, 
  items,
  isEditing = false, 
  onLayoutChange, 
  rowHeight = 106, 
  isMedium = false,
  isMobile = false
}) => {
  const { gridStack } = useGridStackContext();
  const containerRef = useRef<HTMLDivElement>(null); 
  
  const layoutCache = useRef<string>(""); 

  useEffect(() => {
    if (!gridStack) return;
    
    (gridStack as any)._ignoreEvents = true;

    if (isEditing && !isMedium && !isMobile) gridStack.enable();
    else gridStack.disable();

    let newMaxRow = 8;
    let newCol = 8;

    if (isMobile) {
      newMaxRow = 32;
      newCol = 2;
    } else if (isMedium) {
      newMaxRow = 16;
      newCol = 4;
    }

    if (gridStack.opts.maxRow !== newMaxRow) {
        gridStack.opts.maxRow = newMaxRow;
        if ((gridStack as any).engine) {
           (gridStack as any).engine.maxRow = newMaxRow;
        }
    }

    if (gridStack.getColumn() !== newCol) {
        gridStack.column(newCol);
    }

    gridStack.cellHeight(rowHeight);
    gridStack.margin(8);
    gridStack.float(true);

    setTimeout(() => {
        if(gridStack) (gridStack as any)._ignoreEvents = false;
    }, 100);

  }, [gridStack, isEditing, isMedium, isMobile, rowHeight]);

  // Event listeners
  useEffect(() => {
    if (!gridStack || !onLayoutChange) return;

    const handleChange = (event: Event, items: GridStackNode[]) => {
      if ((gridStack as any)._ignoreEvents) return;

      const layout = gridStack.getGridItems().map(el => {
        const node = el.gridstackNode;
        return {
          i: node?.id || el.getAttribute('gs-id'),
          x: node?.x,
          y: node?.y,
          w: node?.w,
          h: node?.h
        };
      }).filter(item => item.i != null);

      const layoutString = JSON.stringify(layout);
      if (layoutString === layoutCache.current) return;
      layoutCache.current = layoutString;

      onLayoutChange(layout, { lg: layout });
    };

    gridStack.on('change', handleChange);

    return () => {
      (gridStack as any).off('change', handleChange);
    };
  }, [gridStack, onLayoutChange]);

  // Sync GridStack with React children
  useEffect(() => {
    if (!gridStack) return;

    // We need to find the container element to query selectors.
    // gridStack.el is the container.
    const container = gridStack.el;
    if (!container) return;

    let hasChanges = false;
    (gridStack as any)._ignoreEvents = true;

    // 1. Add new widgets (candidates that are not yet grid items)
    const candidates = container.querySelectorAll('.widget-candidate');
    candidates.forEach((el) => {
      if (!el.classList.contains('grid-stack-item')) {
        if (!hasChanges) {
           gridStack.batchUpdate();
           hasChanges = true;
        }
        
        const id = el.getAttribute('gs-id');
        const item = items.find(i => i.id === id);
        const options = item ? {
           id: item.id,
           x: item.grid.x,
           y: item.grid.y,
           w: item.grid.w,
           h: item.grid.h,
           autoPosition: false
        } : undefined;

        gridStack.makeWidget(el as HTMLElement, options);
      }
    });

    // 2. Remove deleted widgets
    const gridNodes = gridStack.getGridItems().map(el => (el as any).gridstackNode);
    gridNodes.forEach((node) => {
      if (node && node.el && !container.contains(node.el)) {
        if (!hasChanges) {
           (gridStack as any)._ignoreEvents = true;
           gridStack.batchUpdate();
           hasChanges = true;
        }
        gridStack.removeWidget(node.el, false); 
      }
    });

    // 3. Update changed widgets - SOURCE OF TRUTH IS PROPS
    const gridItems = container.querySelectorAll('.grid-stack-item');
    gridItems.forEach((el) => {
       const node = (el as any).gridstackNode;
       const id = el.getAttribute('gs-id');
       const item = items.find(i => i.id === id);

       if (node && item) {
          const x = item.grid.x;
          const y = item.grid.y;
          const w = item.grid.w;
          const h = item.grid.h;
          
          if (node.x !== x || node.y !== y || node.w !== w || node.h !== h) {
             if (!hasChanges) {
                (gridStack as any)._ignoreEvents = true;
                gridStack.batchUpdate();
                hasChanges = true;
             }
             gridStack.update(el as HTMLElement, { x, y, w, h });
          }
       }
    });

    if (hasChanges) {
      gridStack.commit();
    }

    setTimeout(() => {
        if (gridStack) (gridStack as any)._ignoreEvents = false;
    }, 100);

  }, [gridStack, children, items]);

  return <>{children}</>;
};

export const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
  // Memoize initial options to prevent re-initialization of GridStack
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally stable: these are init-only options
  const initialOptions = useMemo<GridStackOptions>(() => ({
    column: props.isMedium ? 4 : 8,
    maxRow: props.isMedium ? 32 : 8, 
    cellHeight: props.rowHeight,
    margin: 8,
    disableResize: !props.isEditing,
    disableDrag: !props.isEditing,
    float: true, 
    animate: true,
    disableOneColumnMode: true,
  }), []);

  return (
    <GridStackProvider initialOptions={initialOptions}>
      <GridStackRenderProvider className="grid-stack">
        <DashboardGridContent {...props} />
      </GridStackRenderProvider>
    </GridStackProvider>
  );
};