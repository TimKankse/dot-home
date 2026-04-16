import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTouchHoldDragController } from './touchHoldDrag';

describe('createTouchHoldDragController', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout'],
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('arms only after the configured hold delay', () => {
    const onArm = vi.fn();
    const controller = createTouchHoldDragController({
      onArm,
      onDragStart: vi.fn(),
    });

    controller.start({ x: 10, y: 20 });
    expect(controller.getSnapshot().armed).toBe(false);

    vi.advanceTimersByTime(179);
    expect(onArm).not.toHaveBeenCalled();
    expect(controller.getSnapshot().armed).toBe(false);

    vi.advanceTimersByTime(1);
    expect(onArm).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(controller.getSnapshot().armed).toBe(true);
  });

  it('cancels before arming when the finger moves too far', () => {
    const controller = createTouchHoldDragController({
      cancelDistance: 10,
      onDragStart: vi.fn(),
    });

    controller.start({ x: 0, y: 0 });

    expect(controller.move({ x: 6, y: 7 })).toBe('pending');
    expect(controller.getSnapshot().active).toBe(true);

    expect(controller.move({ x: 11, y: 0 })).toBe('canceled');
    expect(controller.getSnapshot().active).toBe(false);
    expect(controller.getSnapshot().armed).toBe(false);
  });

  it('starts dragging on the first move after the hold has armed', () => {
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const controller = createTouchHoldDragController({
      onDragStart,
      onDragMove,
    });

    controller.start({ x: 5, y: 5 });
    vi.advanceTimersByTime(180);

    expect(controller.move({ x: 8, y: 6 })).toBe('dragging');
    expect(onDragStart).toHaveBeenCalledWith({ x: 5, y: 5 }, { x: 8, y: 6 });
    expect(onDragMove).not.toHaveBeenCalled();

    expect(controller.move({ x: 12, y: 9 })).toBe('dragging');
    expect(onDragMove).toHaveBeenCalledWith({ x: 12, y: 9 });
    expect(controller.getSnapshot().dragging).toBe(true);
  });

  it('reports whether an ended session had become armed or dragging', () => {
    const controller = createTouchHoldDragController({
      onDragStart: vi.fn(),
    });

    controller.start({ x: 1, y: 2 });
    vi.advanceTimersByTime(180);
    controller.move({ x: 4, y: 5 });

    expect(controller.end()).toMatchObject({
      active: true,
      armed: true,
      dragging: true,
      canceled: false,
    });
    expect(controller.getSnapshot().active).toBe(false);

    controller.start({ x: 9, y: 9 });
    expect(controller.cancel()).toMatchObject({
      active: true,
      armed: false,
      dragging: false,
      canceled: true,
    });
    expect(controller.getSnapshot().active).toBe(false);
  });
});
