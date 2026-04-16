'use client';

import React, { useEffect, useRef } from 'react';
import {
  createTouchHoldDragController,
  type TouchDragPoint,
} from '@/utils/touchHoldDrag';
import {
  dispatchSyntheticMouseDown,
  dispatchSyntheticMouseMove,
  dispatchSyntheticMouseUp,
} from '@/utils/syntheticMouseDrag';

interface TouchHoldGridItemContentProps {
  children: React.ReactNode;
  isEditing?: boolean;
}

const TOUCH_DRAG_IGNORE_SELECTOR = [
  '.nodrag',
  '.grid-drag-handle',
  '.ui-resizable-handle',
  '[data-shortcut-id]',
  '[role="dialog"]',
].join(', ');

const EDITING_TOUCH_SURFACE_STYLE: React.CSSProperties = {
  touchAction: 'manipulation',
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

export const TouchHoldGridItemContent: React.FC<TouchHoldGridItemContentProps> = ({
  children,
  isEditing = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || !isEditing) return;

    const touchHold = createTouchHoldDragController({
      onDragStart: (startPoint, point) => {
        dispatchSyntheticMouseDown(content, startPoint);
        dispatchSyntheticMouseMove(point);
      },
      onDragMove: (point) => {
        dispatchSyntheticMouseMove(point);
      },
    });

    let activeTouchId: number | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (activeTouchId !== null || event.touches.length !== 1) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest(TOUCH_DRAG_IGNORE_SELECTOR)) return;

      const touch = event.changedTouches.item(0);
      if (!touch) return;

      activeTouchId = touch.identifier;
      touchHold.start({
        x: touch.clientX,
        y: touch.clientY,
      });
      event.stopPropagation();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (activeTouchId === null) return;

      const point = resolveTouchPoint(event, activeTouchId);
      if (!point) return;

      const moveState = touchHold.move(point);
      const snapshot = touchHold.getSnapshot();

      if (snapshot.armed || snapshot.dragging) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (moveState === 'canceled') {
        activeTouchId = null;
      }
    };

    const finishTouch = (event: TouchEvent, shouldCancel = false) => {
      if (activeTouchId === null) return;

      const point = resolveTouchPoint(event, activeTouchId) ?? touchHold.getSnapshot().lastPoint;
      const summary = shouldCancel ? touchHold.cancel() : touchHold.end();

      if (summary.armed || summary.dragging) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (summary.dragging && point) {
        dispatchSyntheticMouseUp(point);
      }

      activeTouchId = null;
    };

    const handleTouchCancel = (event: TouchEvent) => {
      finishTouch(event, true);
    };

    const handleSelectStart = (event: Event) => {
      event.preventDefault();
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    content.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    content.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    content.addEventListener('touchend', finishTouch, { capture: true, passive: false });
    content.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: false });
    content.addEventListener('selectstart', handleSelectStart);
    content.addEventListener('contextmenu', handleContextMenu);

    return () => {
      touchHold.cancel();
      activeTouchId = null;
      content.removeEventListener('touchstart', handleTouchStart, true);
      content.removeEventListener('touchmove', handleTouchMove, true);
      content.removeEventListener('touchend', finishTouch, true);
      content.removeEventListener('touchcancel', handleTouchCancel, true);
      content.removeEventListener('selectstart', handleSelectStart);
      content.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isEditing]);

  return (
    <div
      ref={contentRef}
      className="grid-stack-item-content"
      style={isEditing ? EDITING_TOUCH_SURFACE_STYLE : undefined}
    >
      {children}
    </div>
  );
};
