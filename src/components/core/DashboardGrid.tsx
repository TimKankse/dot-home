"use client";

import React, { useMemo } from 'react';
import { GridStackNode, GridStackOptions } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { GridStackProvider } from '@/gridstack-react/grid-stack-provider';
import { GridStackRenderProvider } from '@/gridstack-react/grid-stack-render-provider';
import { useGridStackContext } from '@/gridstack-react/grid-stack-context';
import { Widget } from '@/types/widget';
import {
  getGridContentWidth,
  getGridDimensions,
  type BreakpointKey,
} from '@/constants/grid';
import {
  useExternalShortcutPreview,
  useGridStackConfiguration,
  useGridStackDragLifecycle,
  useGridStackItemSynchronization,
  useGridStackLayoutChange,
  type ExtendedGridStack,
} from '@/components/core/dashboard-grid/useDashboardGridEffects';

interface DashboardGridProps {
  children: React.ReactNode;
  pageId: string;
  items: Widget[];
  isEditing?: boolean;
  onLayoutChange?: (layout: GridStackNode[], allLayouts: { [key: string]: GridStackNode[] }) => void;
  onWidgetDragStop?: (widgetId: string, mouseX: number, mouseY: number) => void;
  rowHeight?: number;
  gap?: number;
  columnWidth?: number;
  breakpoint?: BreakpointKey;
}

const DashboardGridContent: React.FC<DashboardGridProps> = ({ 
  children, 
  pageId,
  items,
  isEditing = false, 
  onLayoutChange,
  onWidgetDragStop,
  rowHeight = 100, 
  gap = 8,
  breakpoint = 'desktop',
}) => {
  const { gridStack } = useGridStackContext();
  const extendedGridStack = gridStack as unknown as ExtendedGridStack | null;

  useGridStackConfiguration(extendedGridStack, {
    breakpoint,
    isEditing,
    rowHeight,
    gap,
  });
  useGridStackLayoutChange(extendedGridStack, onLayoutChange);
  useGridStackDragLifecycle(extendedGridStack, { onWidgetDragStop, pageId });
  useGridStackItemSynchronization(extendedGridStack, { children, items });
  const { externalShortcutTarget, externalShortcutRect } = useExternalShortcutPreview(
    extendedGridStack,
    {
      pageId,
      items,
      isEditing,
      rowHeight,
    },
  );

  return (
    <>
      {children}
      {externalShortcutTarget && externalShortcutRect && (
        <div
          key={`shortcut-placeholder-${externalShortcutTarget.x}-${externalShortcutTarget.y}`}
          className="shortcut-external-placeholder"
          style={{
            position: 'absolute',
            left: `${externalShortcutRect.left}px`,
            top: `${externalShortcutRect.top}px`,
            width: `${externalShortcutRect.width}px`,
            height: `${externalShortcutRect.height}px`,
            pointerEvents: 'none',
            zIndex: 90,
            border: '2px dashed var(--border-highlight)',
            borderRadius: 'var(--widget-radius, 24px)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            opacity: 0.8,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}
    </>
  );
};

const GRID_TOUCH_DRAG_CANCEL_SELECTOR = [
  '.nodrag',
  '[data-shortcut-id]',
  '[data-shortcut-dropzone]',
  '[role="dialog"]',
].join(', ');

export const DashboardGrid: React.FC<DashboardGridProps> = (props) => {
  const breakpoint = props.breakpoint || 'desktop';
  const { maxCols, maxRows } = getGridDimensions(breakpoint);
  const contentWidth = getGridContentWidth(breakpoint, props.columnWidth);
  const initialOptions = useMemo<GridStackOptions>(() => ({
    column: maxCols,
    maxRow: maxRows,
    cellHeight: props.rowHeight,
    margin: `${props.gap}px`,
    disableResize: !props.isEditing,
    disableDrag: !props.isEditing,
    draggable: {
      cancel: GRID_TOUCH_DRAG_CANCEL_SELECTOR,
    },
    float: true, 
    animate: true,
    disableOneColumnMode: true,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally stable: these are init-only options
  }), []);

  return (
    <GridStackProvider initialOptions={initialOptions}>
      <GridStackRenderProvider
        className="grid-stack"
        style={{
          width: `min(100%, ${contentWidth}px)`,
          maxWidth: '100%',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <DashboardGridContent {...props} />
      </GridStackRenderProvider>
    </GridStackProvider>
  );
};
