export interface TouchDragPoint {
  x: number;
  y: number;
}

export interface TouchHoldDragSnapshot {
  active: boolean;
  armed: boolean;
  dragging: boolean;
  startPoint: TouchDragPoint | null;
  lastPoint: TouchDragPoint | null;
}

export interface TouchHoldDragSummary extends TouchHoldDragSnapshot {
  canceled: boolean;
}

export type TouchHoldDragMoveState = 'idle' | 'pending' | 'dragging' | 'canceled';

interface CreateTouchHoldDragControllerOptions {
  delayMs?: number;
  cancelDistance?: number;
  onArm?: (point: TouchDragPoint) => void;
  onDragStart: (startPoint: TouchDragPoint, point: TouchDragPoint) => void;
  onDragMove?: (point: TouchDragPoint) => void;
}

const DEFAULT_DELAY_MS = 180;
const DEFAULT_CANCEL_DISTANCE = 10;

function clonePoint(point: TouchDragPoint | null): TouchDragPoint | null {
  return point ? { ...point } : null;
}

function getDistance(a: TouchDragPoint, b: TouchDragPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createTouchHoldDragController({
  delayMs = DEFAULT_DELAY_MS,
  cancelDistance = DEFAULT_CANCEL_DISTANCE,
  onArm,
  onDragStart,
  onDragMove,
}: CreateTouchHoldDragControllerOptions) {
  let active = false;
  let armed = false;
  let dragging = false;
  let startPoint: TouchDragPoint | null = null;
  let lastPoint: TouchDragPoint | null = null;
  let armTimeout: ReturnType<typeof setTimeout> | null = null;

  const clearArmTimeout = () => {
    if (armTimeout === null) return;
    clearTimeout(armTimeout);
    armTimeout = null;
  };

  const reset = () => {
    clearArmTimeout();
    active = false;
    armed = false;
    dragging = false;
    startPoint = null;
    lastPoint = null;
  };

  const getSnapshot = (): TouchHoldDragSnapshot => ({
    active,
    armed,
    dragging,
    startPoint: clonePoint(startPoint),
    lastPoint: clonePoint(lastPoint),
  });

  return {
    start(point: TouchDragPoint) {
      reset();

      active = true;
      armed = delayMs <= 0;
      dragging = false;
      startPoint = { ...point };
      lastPoint = { ...point };

      if (armed) {
        onArm?.({ ...point });
        return getSnapshot();
      }

      armTimeout = setTimeout(() => {
        if (!active || armed || !lastPoint) return;
        armed = true;
        onArm?.({ ...lastPoint });
      }, delayMs);

      return getSnapshot();
    },

    move(point: TouchDragPoint): TouchHoldDragMoveState {
      if (!active || !startPoint) return 'idle';

      lastPoint = { ...point };

      if (!armed) {
        if (getDistance(startPoint, point) <= cancelDistance) {
          return 'pending';
        }

        reset();
        return 'canceled';
      }

      if (!dragging) {
        dragging = true;
        onDragStart({ ...startPoint }, { ...point });
        return 'dragging';
      }

      onDragMove?.({ ...point });
      return 'dragging';
    },

    end(): TouchHoldDragSummary {
      const summary: TouchHoldDragSummary = {
        ...getSnapshot(),
        canceled: false,
      };
      reset();
      return summary;
    },

    cancel(): TouchHoldDragSummary {
      const summary: TouchHoldDragSummary = {
        ...getSnapshot(),
        canceled: true,
      };
      reset();
      return summary;
    },

    getSnapshot,
  };
}

export const TOUCH_DRAG_HOLD_DELAY_MS = DEFAULT_DELAY_MS;
export const TOUCH_DRAG_CANCEL_DISTANCE_PX = DEFAULT_CANCEL_DISTANCE;
