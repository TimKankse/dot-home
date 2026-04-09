'use client';

import React, { useCallback } from 'react';
import type { ShortcutContainer } from '@/types';
import type { Widget } from '@/types/widget';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';

interface ShortcutDragShellProps {
  shortcut: Widget;
  source: ShortcutContainer;
  isEditing?: boolean;
  isDragged?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const DRAGGED_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

export const ShortcutDragShell: React.FC<ShortcutDragShellProps> = ({
  shortcut,
  source,
  isEditing = false,
  isDragged = false,
  className,
  style,
  children,
}) => {
  const startDrag = useShortcutDragStore(state => state.startDrag);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;
    if (useShortcutDragStore.getState().activeDrag) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    startDrag({
      shortcutId: shortcut.id,
      source,
      pointer: {
        x: event.clientX,
        y: event.clientY,
      },
      sourceRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    });
  }, [isEditing, shortcut.id, source, startDrag]);

  return (
    <div
      className={className}
      onPointerDown={handlePointerDown}
      style={isDragged ? DRAGGED_STYLE : {
        ...style,
        cursor: isEditing ? 'grab' : 'default',
        touchAction: isEditing ? 'none' : undefined,
      }}
      data-dragged={isDragged ? 'true' : 'false'}
    >
      {children}
    </div>
  );
};
