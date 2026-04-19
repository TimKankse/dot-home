'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ShortcutContainer } from '@/types';
import type { Widget } from '@/types/widget';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import { TouchHoldFeedback } from '@/components/core/TouchHoldFeedback';
import { finishActiveShortcutDrag } from '@/utils/shortcutDragSession';
import {
  createTouchHoldDragController,
  type TouchDragPoint,
} from '@/utils/touchHoldDrag';

interface ShortcutDragShellProps {
  shortcut: Widget;
  source: ShortcutContainer;
  isEditing?: boolean;
  isDragged?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

interface TouchHoldFeedbackState {
  origin: TouchDragPoint | null;
  phase: 'idle' | 'pending' | 'armed';
  holdSequence: number;
  readySequence: number;
}

const DRAGGED_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const TOUCH_DRAG_IGNORE_SELECTOR = [
  '.nodrag',
  '.grid-drag-handle',
  '.ui-resizable-handle',
].join(', ');

const EDITING_TOUCH_SURFACE_STYLE: React.CSSProperties = {
  position: 'relative',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
};

function resolveTouchPoint(event: TouchEvent, identifier: number | null): TouchDragPoint | null {
  const touchList = event.changedTouches.length > 0 ? event.changedTouches : event.touches;

  if (identifier === null) {
    const touch = touchList[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  for (let index = 0; index < touchList.length; index += 1) {
    const touch = touchList.item(index);
    if (touch && touch.identifier === identifier) {
      return {
        x: touch.clientX,
        y: touch.clientY,
      };
    }
  }

  return null;
}

export const ShortcutDragShell: React.FC<ShortcutDragShellProps> = ({
  shortcut,
  source,
  isEditing = false,
  isDragged = false,
  className,
  style,
  children,
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const startDrag = useShortcutDragStore(state => state.startDrag);
  const [feedback, setFeedback] = useState<TouchHoldFeedbackState>({
    origin: null,
    phase: 'idle',
    holdSequence: 0,
    readySequence: 0,
  });

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
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

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !isEditing) return;

    const touchHold = createTouchHoldDragController({
      onArm: () => {
        setFeedback((current) => current.origin ? {
          ...current,
          phase: 'armed',
          readySequence: current.readySequence + 1,
        } : current);
      },
      onDragStart: (_startPoint, point) => {
        setFeedback((current) => current.phase === 'idle' ? current : {
          ...current,
          phase: 'idle',
          origin: null,
        });
        if (useShortcutDragStore.getState().activeDrag) return;

        const rect = shell.getBoundingClientRect();
        startDrag({
          shortcutId: shortcut.id,
          source,
          pointer: {
            x: point.x,
            y: point.y,
          },
          sourceRect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
        });
      },
      onDragMove: (point) => {
        useShortcutDragStore.getState().updatePointer({
          x: point.x,
          y: point.y,
        });
      },
    });

    let activeTouchId: number | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (activeTouchId !== null || event.touches.length !== 1) return;
      if ((event.target as HTMLElement | null)?.closest(TOUCH_DRAG_IGNORE_SELECTOR)) return;
      if (useShortcutDragStore.getState().activeDrag) return;

      const touch = event.changedTouches.item(0);
      if (!touch) return;

      activeTouchId = touch.identifier;
      const rect = shell.getBoundingClientRect();
      setFeedback((current) => ({
        origin: {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        },
        phase: 'pending',
        holdSequence: current.holdSequence + 1,
        readySequence: current.readySequence,
      }));
      touchHold.start({
        x: touch.clientX,
        y: touch.clientY,
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (activeTouchId === null) return;

      const point = resolveTouchPoint(event, activeTouchId);
      if (!point) return;

      const moveState = touchHold.move(point);
      const snapshot = touchHold.getSnapshot();

      if (snapshot.armed || snapshot.dragging) {
        event.preventDefault();
      }

      if (moveState === 'canceled') {
        activeTouchId = null;
        setFeedback((current) => current.phase === 'idle' ? current : {
          ...current,
          phase: 'idle',
          origin: null,
        });
      }
    };

    const finishTouch = (event: TouchEvent, shouldCommit = true) => {
      if (activeTouchId === null) return;

      const summary = shouldCommit ? touchHold.end() : touchHold.cancel();

      if (summary.dragging) {
        event.preventDefault();
        finishActiveShortcutDrag(shouldCommit);
      }

      activeTouchId = null;
      setFeedback((current) => current.phase === 'idle' ? current : {
        ...current,
        phase: 'idle',
        origin: null,
      });
    };

    const handleTouchCancel = (event: TouchEvent) => {
      finishTouch(event, false);
    };

    const handleSelectStart = (event: Event) => {
      event.preventDefault();
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    shell.addEventListener('touchstart', handleTouchStart, { passive: false });
    shell.addEventListener('touchmove', handleTouchMove, { passive: false });
    shell.addEventListener('touchend', finishTouch, { passive: false });
    shell.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    shell.addEventListener('selectstart', handleSelectStart);
    shell.addEventListener('contextmenu', handleContextMenu);

    return () => {
      touchHold.cancel();
      activeTouchId = null;
      setFeedback((current) => current.phase === 'idle' ? current : {
        ...current,
        phase: 'idle',
        origin: null,
      });
      shell.removeEventListener('touchstart', handleTouchStart);
      shell.removeEventListener('touchmove', handleTouchMove);
      shell.removeEventListener('touchend', finishTouch);
      shell.removeEventListener('touchcancel', handleTouchCancel);
      shell.removeEventListener('selectstart', handleSelectStart);
      shell.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isEditing, shortcut.id, source, startDrag]);

  return (
    <div
      ref={shellRef}
      className={className}
      onPointerDown={handlePointerDown}
      style={isDragged ? DRAGGED_STYLE : {
        ...style,
        cursor: isEditing ? 'grab' : 'default',
        ...(isEditing ? EDITING_TOUCH_SURFACE_STYLE : {}),
        touchAction: isEditing ? 'manipulation' : undefined,
      }}
      data-dragged={isDragged ? 'true' : 'false'}
    >
      {children}
      <TouchHoldFeedback
        origin={isEditing ? feedback.origin : null}
        phase={isEditing ? feedback.phase : 'idle'}
        holdSequence={feedback.holdSequence}
        readySequence={feedback.readySequence}
      />
    </div>
  );
};
