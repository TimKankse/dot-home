'use client';

import React from 'react';
import { TOUCH_DRAG_HOLD_DELAY_MS, type TouchDragPoint } from '@/utils/touchHoldDrag';
import styles from './TouchHoldFeedback.module.css';

interface TouchHoldFeedbackProps {
  origin: TouchDragPoint | null;
  phase: 'idle' | 'pending' | 'armed';
  holdSequence: number;
  readySequence: number;
}

export const TouchHoldFeedback: React.FC<TouchHoldFeedbackProps> = ({
  origin,
  phase,
  holdSequence,
  readySequence,
}) => {
  if (!origin || phase === 'idle') {
    return null;
  }

  const style = {
    ['--touch-origin-x' as string]: `${origin.x}px`,
    ['--touch-origin-y' as string]: `${origin.y}px`,
    ['--touch-hold-duration' as string]: `${TOUCH_DRAG_HOLD_DELAY_MS}ms`,
  } as React.CSSProperties;

  return (
    <div
      className={`${styles.overlay} ${phase === 'armed' ? styles.armed : styles.pending}`}
      style={style}
      aria-hidden="true"
    >
      <div key={`hold-${holdSequence}`} className={styles.bloom} />
      {phase === 'armed' && (
        <div key={`ready-${readySequence}`} className={styles.readyPulse} />
      )}
    </div>
  );
};
