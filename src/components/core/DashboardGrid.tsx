"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { GridStackNode, GridStackOptions } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { GridStackProvider } from '@/gridstack-react/grid-stack-provider';
import { GridStackRenderProvider } from '@/gridstack-react/grid-stack-render-provider';
import { useGridStackContext } from '@/gridstack-react/grid-stack-context';
import { Widget } from '@/types/widget';
import { GRID_BREAKPOINTS } from '@/constants/grid';
interface ExtendedGridStack {
  _ignoreEvents?: boolean;
  engine?: {
    maxRow: number;
  };
  opts: GridStackOptions;
  el: HTMLElement;
  getColumn(): number;
  column(column: number): void;
  cellHeight(val: number): void;
  margin(val: string): void;
  float(val: boolean): void;
  enable(): void;
  disable(): void;
  getGridItems(): HTMLElement[];
  batchUpdate(): void;
  commit(): void;
  makeWidget(el: HTMLElement, opts?: GridStackOptions): HTMLElement;
  removeWidget(el: HTMLElement, removeDOM?: boolean): void;
  update(el: HTMLElement, opts: GridStackOptions): void;
  on(name: string, callback: (event: Event, items: GridStackNode[]) => void): void;
  off(name: string, callback: (event: Event, items: GridStackNode[]) => void): void;
}

interface ExtendedGridStackElement extends HTMLElement {
  gridstackNode?: GridStackNode;
}

interface DashboardGridProps {
  children: React.ReactNode;
  items: Widget[];
  isEditing?: boolean;
  onLayoutChange?: (layout: GridStackNode[], allLayouts: { [key: string]: GridStackNode[] }) => void;
  onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
  rowHeight?: number;
  gap?: number;
  isMedium?: boolean;
  isMobile?: boolean;
}

const DashboardGridContent: React.FC<DashboardGridProps> = ({ 
  children, 
  items,
  isEditing = false, 
  onLayoutChange, 
  rowHeight = 100, 
  gap = 8,
  isMedium = false,
  isMobile = false
}) => {
  const { gridStack } = useGridStackContext();
  const layoutCache = useRef<string>("");

  useEffect(() => {
    if (!gridStack) return;
    
    const grid = gridStack as unknown as ExtendedGridStack;
    
    // eslint-disable-next-line react-hooks/immutability
    grid._ignoreEvents = true;

    if (isEditing && !isMedium && !isMobile) gridStack.enable();
    else gridStack.disable();

    const breakpoint = isMobile ? 'mobile' : isMedium ? 'medium' : 'desktop';
    const { cols: newCol, rows: newMaxRow } = GRID_BREAKPOINTS[breakpoint];

    if (gridStack.opts.maxRow !== newMaxRow) {
        // eslint-disable-next-line react-hooks/immutability
        gridStack.opts.maxRow = newMaxRow;
        if (grid.engine) {
           grid.engine.maxRow = newMaxRow;
        }
    }

    if (gridStack.getColumn() !== newCol) {
        gridStack.column(newCol);
    }

    gridStack.cellHeight(rowHeight);
    gridStack.margin(`${gap}px`);
    gridStack.float(true);

    setTimeout(() => {
        if(grid) grid._ignoreEvents = false;
    }, 100);

  }, [gridStack, isEditing, isMedium, isMobile, rowHeight, gap]);


  useEffect(() => {
    if (!gridStack || !onLayoutChange) return;

    const handleChange = (_event: Event, _items: GridStackNode[]) => {
      const grid = gridStack as unknown as ExtendedGridStack;
      if (grid._ignoreEvents) return;

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
      (gridStack as unknown as ExtendedGridStack).off('change', handleChange);
    };
  }, [gridStack, onLayoutChange]);

  useEffect(() => {
    if (!gridStack) return;
    const container = gridStack.el;
    if (!container) return;

    let hasChanges = false;
    const grid = gridStack as unknown as ExtendedGridStack;
    // eslint-disable-next-line react-hooks/immutability
    grid._ignoreEvents = true;

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

    const gridNodes = gridStack.getGridItems().map(el => (el as ExtendedGridStackElement).gridstackNode);
    gridNodes.forEach((node) => {
      if (node && node.el && !container.contains(node.el)) {
        if (!hasChanges) {
           grid._ignoreEvents = true;
           gridStack.batchUpdate();
           hasChanges = true;
        }
        gridStack.removeWidget(node.el, false); 
      }
    });

    const gridItems = container.querySelectorAll('.grid-stack-item');
    gridItems.forEach((el) => {
       const node = (el as unknown as { gridstackNode: GridStackNode }).gridstackNode;
       const id = el.getAttribute('gs-id');
       const item = items.find(i => i.id === id);
 
        if (node && item) {
          const x = item.grid.x;
          const y = item.grid.y;
          const w = item.grid.w;
          const h = item.grid.h;
          
          if (node.x !== x || node.y !== y || node.w !== w || node.h !== h) {
             if (!hasChanges) {
                grid._ignoreEvents = true;
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
        if (grid) grid._ignoreEvents = false;
    }, 100);

  }, [gridStack, children, items]);

  return <>{children}</>;
};

export const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
  const initialOptions = useMemo<GridStackOptions>(() => ({
    column: props.isMedium ? GRID_BREAKPOINTS.medium.cols : GRID_BREAKPOINTS.desktop.cols,
    maxRow: props.isMedium ? GRID_BREAKPOINTS.medium.rows : GRID_BREAKPOINTS.desktop.rows, 
    cellHeight: props.rowHeight,
    margin: `${props.gap}px`,
    disableResize: !props.isEditing,
    disableDrag: !props.isEditing,
    float: true, 
    animate: true,
    disableOneColumnMode: true,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally stable: these are init-only options
  }), []);

  return (
    <GridStackProvider initialOptions={initialOptions}>
      <GridStackRenderProvider className="grid-stack">
        <DashboardGridContent {...props} />
      </GridStackRenderProvider>
    </GridStackProvider>
  );
};