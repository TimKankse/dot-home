import React from 'react';

interface SparklineProps {
    dataPoints: number[];
    color: string;
    maxLimit?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({ dataPoints, color, maxLimit }) => {
    if (!dataPoints || dataPoints.length < 2) return null;
    
    const width = 120;
    const height = 40;
    
    // Dynamic scaling
    const dataMin = Math.min(...dataPoints);
    const dataMax = Math.max(...dataPoints);
    let range = dataMax - dataMin;
    
    // Handle flat line (min === max)
    if (range === 0) {
        range = 1; // Prevent division by zero
    }
    
    // Add 10% padding to top and bottom, but keep min >= 0
    const min = Math.max(0, dataMin - range * 0.1);
    
    // Calculate max with padding
    let max = dataMax + range * 0.1;
    
    // Apply maxLimit if provided
    if (maxLimit !== undefined) {
        max = Math.min(maxLimit, max);
    }
    
    // Recalculate range with padding
    const paddedRange = max - min || 1;

    const points = dataPoints.map((val, i) => {
        const x = (i / (dataPoints.length - 1)) * width;
        const y = height - ((val - min) / paddedRange) * height;
        return `${x},${y}`;
    }).join(' ');

    const gradientId = `gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={color} stopOpacity="0.1" />
            </linearGradient>
            <polygon
                points={`${0},${height} ${points} ${width},${height}`}
                fill={`url(#${gradientId})`}
                stroke="none"
                />
        </svg>
    );
};
