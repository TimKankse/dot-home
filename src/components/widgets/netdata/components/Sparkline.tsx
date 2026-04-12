import React, { useId, useState } from 'react';
import styles from './Sparkline.module.css';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface SparklinePoint {
    x: number;
    y: number;
}

interface SparklineProps {
    dataPoints: SparklinePoint[];
    color: string;
    maxLimit?: number;
    formatY?: (value: number) => string;
    formatX?: (value: number) => string;
    tooltipLabel?: string;
}

const CHART_WIDTH = 120;
const CHART_HEIGHT = 40;
const GRID_DIVISIONS = 4;
const HISTORY_PRECISION = 10;
const HOVER_POINT_SIZE_RATIO = 0.24;
const MIN_HOVER_POINT_SIZE = 9;
const MAX_HOVER_POINT_SIZE = 18;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const defaultFormatY = (value: number) => `${Math.round(value * HISTORY_PRECISION) / HISTORY_PRECISION}`;

export const Sparkline: React.FC<SparklineProps> = ({
    dataPoints,
    color,
    maxLimit,
    formatY = defaultFormatY,
    formatX,
    tooltipLabel,
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [hoverPointSize, setHoverPointSize] = useState(MIN_HOVER_POINT_SIZE);
    const { settings } = useSettingsStore();
    const gradientId = `sparkline-gradient-${useId().replace(/:/g, '')}`;

    const defaultFormatX = (value: number) => {
        const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-GB';
        const is24Hour = settings?.display?.is24Hour ?? true;
        const configuredTimezone = settings?.display?.timezone || undefined;

        const timeString = new Date(value).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: !is24Hour,
            timeZone: configuredTimezone === 'UTC' ? 'UTC' : configuredTimezone,
        });

        return timeString.replace(/\s*(am|pm)/i, '');
    };

    const resolvedFormatX = formatX || defaultFormatX;

    if (!dataPoints || dataPoints.length === 0) return null;

    const renderDataPoints = dataPoints.length === 1
        ? [dataPoints[0], dataPoints[0]]
        : dataPoints;

    const values = renderDataPoints.map(point => point.y);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    let range = dataMax - dataMin;

    if (range === 0) {
        range = 1;
    }

    const min = Math.max(0, dataMin - range * 0.1);
    let max = dataMax + range * 0.1;

    if (maxLimit !== undefined) {
        max = Math.min(maxLimit, max);
    }

    if (max <= min) {
        max = min + 1;
    }

    const paddedRange = max - min;

    const renderedChartPoints = renderDataPoints.map((point, index) => {
        const x = (index / (renderDataPoints.length - 1)) * CHART_WIDTH;
        const normalizedY = clamp((point.y - min) / paddedRange, 0, 1);
        const y = CHART_HEIGHT - normalizedY * CHART_HEIGHT;

        return {
            ...point,
            chartX: x,
            chartY: y,
        };
    });

    const interactiveChartPoints = dataPoints.length === 1
        ? [renderedChartPoints[renderedChartPoints.length - 1]]
        : renderedChartPoints;

    const points = renderedChartPoints.map(point => `${point.chartX},${point.chartY}`).join(' ');
    const hoveredPoint = hoveredIndex !== null ? interactiveChartPoints[hoveredIndex] : null;

    const hoverLeft = hoveredPoint ? `${(hoveredPoint.chartX / CHART_WIDTH) * 100}%` : '0%';
    const hoverTop = hoveredPoint ? `${(hoveredPoint.chartY / CHART_HEIGHT) * 100}%` : '0%';
    const placeTooltipRight = hoveredPoint ? hoveredPoint.chartX < CHART_WIDTH * 0.2 : false;
    const placeTooltipLeft = hoveredPoint ? hoveredPoint.chartX > CHART_WIDTH * 0.8 : false;
    const placeTooltipBelow = hoveredPoint ? hoveredPoint.chartY < CHART_HEIGHT * 0.3 : false;

    const tooltipTransform = [
        placeTooltipLeft ? '-100%' : placeTooltipRight ? '0%' : '-50%',
        placeTooltipBelow ? '10px' : 'calc(-100% - 10px)',
    ].join(', ');

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (bounds.width === 0) return;

        const nextHoverPointSize = Math.round(
            clamp(bounds.height * HOVER_POINT_SIZE_RATIO, MIN_HOVER_POINT_SIZE, MAX_HOVER_POINT_SIZE)
        );
        setHoverPointSize(currentSize => currentSize === nextHoverPointSize ? currentSize : nextHoverPointSize);

        if (interactiveChartPoints.length === 1) {
            setHoveredIndex(currentIndex => currentIndex === 0 ? currentIndex : 0);
            return;
        }

        const relativeX = clamp(event.clientX - bounds.left, 0, bounds.width);
        const nextIndex = Math.round((relativeX / bounds.width) * (interactiveChartPoints.length - 1));

        setHoveredIndex(currentIndex => currentIndex === nextIndex ? currentIndex : nextIndex);
    };

    return (
        <div
            className={styles.chartRoot}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoveredIndex(null)}
        >
            <svg
                className={styles.chartSvg}
                width="100%"
                height="100%"
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                    </linearGradient>
                </defs>

                {Array.from({ length: GRID_DIVISIONS + 1 }, (_, index) => {
                    const y = (index / GRID_DIVISIONS) * CHART_HEIGHT;
                    return (
                        <line
                            key={`horizontal-${index}`}
                            className={styles.gridLine}
                            x1="0"
                            x2={CHART_WIDTH}
                            y1={y}
                            y2={y}
                        />
                    );
                })}

                {Array.from({ length: GRID_DIVISIONS + 1 }, (_, index) => {
                    const x = (index / GRID_DIVISIONS) * CHART_WIDTH;
                    return (
                        <line
                            key={`vertical-${index}`}
                            className={styles.gridLine}
                            x1={x}
                            x2={x}
                            y1="0"
                            y2={CHART_HEIGHT}
                        />
                    );
                })}

                <polygon
                    points={`0,${CHART_HEIGHT} ${points} ${CHART_WIDTH},${CHART_HEIGHT}`}
                    fill={`url(#${gradientId})`}
                    stroke="none"
                />

                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {hoveredPoint && (
                    <>
                        <line
                            className={styles.hoverGuide}
                            x1={hoveredPoint.chartX}
                            x2={hoveredPoint.chartX}
                            y1="0"
                            y2={CHART_HEIGHT}
                        />
                    </>
                )}
            </svg>

            {hoveredPoint && (
                <div
                    aria-hidden="true"
                    className={styles.hoverPoint}
                    style={{
                        left: hoverLeft,
                        top: hoverTop,
                        width: `${hoverPointSize}px`,
                        height: `${hoverPointSize}px`,
                        backgroundColor: color,
                    }}
                />
            )}

            {hoveredPoint && (
                <div
                    className={styles.chartTooltip}
                    style={{
                        left: hoverLeft,
                        top: hoverTop,
                        transform: `translate(${tooltipTransform})`,
                    }}
                >
                    {tooltipLabel && (
                        <span className={styles.tooltipLabel}>{tooltipLabel}</span>
                    )}
                    <span className={styles.tooltipValue} style={{ color }}>
                        {formatY(hoveredPoint.y)}
                    </span>
                    <span className={styles.tooltipMeta}>{resolvedFormatX(hoveredPoint.x)}</span>
                </div>
            )}
        </div>
    );
};
