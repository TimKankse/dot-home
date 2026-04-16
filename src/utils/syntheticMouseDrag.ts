import type { TouchDragPoint } from '@/utils/touchHoldDrag';

interface SyntheticMouseOptions {
  buttons?: number;
}

function createMouseEvent(type: string, point: TouchDragPoint, options?: SyntheticMouseOptions) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    button: 0,
    buttons: options?.buttons ?? (type === 'mouseup' ? 0 : 1),
  });
}

export function dispatchSyntheticMouseDown(target: HTMLElement, point: TouchDragPoint) {
  target.dispatchEvent(createMouseEvent('mousedown', point, { buttons: 1 }));
}

export function dispatchSyntheticMouseMove(point: TouchDragPoint) {
  document.dispatchEvent(createMouseEvent('mousemove', point, { buttons: 1 }));
}

export function dispatchSyntheticMouseUp(point: TouchDragPoint) {
  document.dispatchEvent(createMouseEvent('mouseup', point, { buttons: 0 }));
}
