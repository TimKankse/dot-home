import React from 'react';
import { X } from 'lucide-react';
import { Button, Slider, ToggleGroup } from '@/components/primitives';
import {
  BREAKPOINT_THRESHOLD_GAP,
  MAX_TABLET_BREAKPOINT_MAX_WIDTH,
  MIN_MOBILE_BREAKPOINT_MAX_WIDTH,
  type BreakpointKey,
  type BreakpointThresholds,
  type ResponsiveBreakpointKey,
} from '@/constants/grid';
import styles from './LayoutTargetControls.module.css';

interface LayoutTargetControlsProps {
  isOpen: boolean;
  target: BreakpointKey;
  isCustom: boolean;
  sourceBreakpoint: BreakpointKey;
  canSelectTarget?: boolean;
  breakpointThresholds: BreakpointThresholds;
  onClose: () => void;
  onTargetChange: (breakpoint: BreakpointKey) => void;
  onBreakpointWidthChange: (breakpoint: ResponsiveBreakpointKey, value: number) => void;
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
  canSelectTarget = true,
  breakpointThresholds,
  onClose,
  onTargetChange,
  onBreakpointWidthChange,
  onMakeCustom,
  onResetToAuto,
}) => {
  const targetLabel = BREAKPOINT_LABELS[target];
  const sourceLabel = BREAKPOINT_LABELS[sourceBreakpoint];
  const isResponsiveTarget = target !== 'desktop';
  const isLockedToCurrentDevice = isResponsiveTarget && !canSelectTarget;
  const resetSourceLabel = isResponsiveTarget
    ? BREAKPOINT_LABELS[target === 'mobile' ? 'tablet' : 'desktop']
    : BREAKPOINT_LABELS.desktop;
  const statusLabel = isResponsiveTarget ? (isCustom ? 'Custom' : 'Auto') : 'Base';
  const description = isResponsiveTarget
    ? (isCustom
      ? (isLockedToCurrentDevice
        ? `${targetLabel} is using its own saved layout for this page on this device. Reset To Auto to inherit from ${resetSourceLabel} again.`
        : `${targetLabel} is using its own saved layout for this page.`)
      : (isLockedToCurrentDevice
        ? `${targetLabel} is currently inheriting from ${sourceLabel}. Choose Make Custom to save a layout just for this device.`
        : `${targetLabel} is inheriting from ${sourceLabel}. Your first drag or resize can become its own layout.`))
    : 'Desktop stays the shared base layout that smaller layouts inherit from by default.';
  const sliderValue = target === 'mobile'
    ? breakpointThresholds.mobileMaxWidth
    : breakpointThresholds.tabletMaxWidth;
  const sliderMin = target === 'mobile'
    ? MIN_MOBILE_BREAKPOINT_MAX_WIDTH
    : breakpointThresholds.mobileMaxWidth + BREAKPOINT_THRESHOLD_GAP;
  const sliderMax = target === 'mobile'
    ? breakpointThresholds.tabletMaxWidth - BREAKPOINT_THRESHOLD_GAP
    : MAX_TABLET_BREAKPOINT_MAX_WIDTH;
  const sliderLabel = target === 'mobile' ? 'Mobile max width' : 'Tablet max width';
  const sliderHint = target === 'mobile'
    ? `Used at ${sliderValue}px viewport width and below.`
    : `Used from ${breakpointThresholds.mobileMaxWidth + 1}px up to ${sliderValue}px viewport width.`;

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
          {canSelectTarget && (
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
          )}

          <div className={styles.description}>{description}</div>

          {isResponsiveTarget && (
            <div className={styles.sliderBlock}>
              <div className={styles.sliderHeader}>
                <div>
                  <div className={styles.sliderLabel}>{sliderLabel}</div>
                  <div className={styles.sliderHint}>{sliderHint}</div>
                </div>
                <div className={styles.sliderValue}>{sliderValue}px</div>
              </div>

              <Slider
                min={sliderMin}
                max={sliderMax}
                step={8}
                value={sliderValue}
                onChange={(event) => onBreakpointWidthChange(
                  target as ResponsiveBreakpointKey,
                  parseInt(event.target.value, 10),
                )}
                aria-label={`${targetLabel} breakpoint max width`}
              />
            </div>
          )}

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
