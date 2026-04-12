import React from 'react';
import { X } from 'lucide-react';
import { Button, ToggleGroup } from '@/components/primitives';
import type { BreakpointKey } from '@/constants/grid';
import styles from './LayoutTargetControls.module.css';

interface LayoutTargetControlsProps {
  isOpen: boolean;
  target: BreakpointKey;
  isCustom: boolean;
  sourceBreakpoint: BreakpointKey;
  onClose: () => void;
  onTargetChange: (breakpoint: BreakpointKey) => void;
  onMakeCustom: () => void;
  onResetToAuto: () => void;
}

const BREAKPOINT_LABELS: Record<BreakpointKey, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

export const LayoutTargetControls: React.FC<LayoutTargetControlsProps> = ({
  isOpen,
  target,
  isCustom,
  sourceBreakpoint,
  onClose,
  onTargetChange,
  onMakeCustom,
  onResetToAuto,
}) => {
  const targetLabel = BREAKPOINT_LABELS[target];
  const sourceLabel = BREAKPOINT_LABELS[sourceBreakpoint];
  const isResponsiveTarget = target !== 'desktop';
  const statusLabel = isResponsiveTarget ? (isCustom ? 'Custom' : 'Auto') : 'Base';

  return (
    <div className={`${styles.shell} ${isOpen ? styles.open : styles.closed}`} aria-hidden={!isOpen}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <div className={styles.kicker}>Layout Target</div>
            <div className={styles.titleRow}>
              <div className={styles.title}>{targetLabel} layout</div>
              <div className={`${styles.badge} ${isResponsiveTarget && isCustom ? styles.custom : styles.base}`}>
                {statusLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close layout controls"
            title="Close layout controls"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.content}>
          <ToggleGroup
            options={[
              { value: 'desktop', label: 'Desktop' },
              { value: 'tablet', label: 'Tablet' },
              { value: 'mobile', label: 'Mobile' },
            ]}
            value={target}
            onChange={(value) => onTargetChange(value as BreakpointKey)}
            className={styles.toggle}
            fullWidth
          />

          <div className={styles.description}>
            {isResponsiveTarget
              ? (isCustom
                ? `${targetLabel} is using its own saved layout for this page.`
                : `${targetLabel} is inheriting from ${sourceLabel}. Your first drag or resize can become its own layout.`)
              : 'Desktop stays the shared base layout that smaller layouts inherit from by default.'}
          </div>

          {isResponsiveTarget && (
            <div className={styles.actions}>
              {!isCustom && (
                <Button variant="secondary" size="sm" onClick={onMakeCustom}>
                  Make Custom
                </Button>
              )}
              {isCustom && (
                <Button variant="ghost" size="sm" onClick={onResetToAuto}>
                  Reset To Auto
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
