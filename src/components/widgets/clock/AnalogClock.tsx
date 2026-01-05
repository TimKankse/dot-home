"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

interface AnalogClockProps {
  config?: {
    // Shared props
  };
}

export const AnalogClock: React.FC<AnalogClockProps> = () => {
    const { settings } = useSettingsStore();
    const [time, setTime] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState<{width: number, height: number} | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);

    }, []);

    // Resize Observer to get exact widget dimensions
    useEffect(() => {
        if (!containerRef.current) return;
        
        const measure = () => {
             if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                if (width > 0 && height > 0) {
                    setDimensions({ width, height });
                }
             }
        };

        measure();

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    setDimensions({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                }
            }
        });
        
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const timeZone = settings?.display?.timezone || undefined;

    const getParts = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timeZone === 'UTC' ? 'UTC' : timeZone,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        };
        const parts = new Intl.DateTimeFormat('en-US', { 
            ...options, 
            hour: 'numeric', minute: 'numeric', second: 'numeric' 
        }).formatToParts(date);
        
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        const s = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
        
        return { h, m, s };
    };

    // Calculate intersection of a ray from center with a rounded rectangle
    const getSquirclePoint = (angleDeg: number, w: number, h: number, r: number) => {
        // Angle Mapping to stretch circle to rectangle layout
        // This ensures 45 degrees points to the corner of the rectangle
        // algo: tan(newAngle) = (w/h) * tan(oldAngle)
        // We need to handle quadrants carefully.
        
        const aspectRatio = w / h;
        const rad = (angleDeg - 90) * (Math.PI / 180); // 0 is -90 deg (Up)
        
        // Standard math angle (0 is Right, + is CW in screen coords? No, + is CW in screen coords usually mean inverted Y)
        // Let's stick to: 0 is Up. 90 is Right.
        // angleDeg is 0..360 CW from Top.
        
        // Convert to polar angle from X axis (Right): theta
        // Top (0) -> -90 (or 270)
        // Right (90) -> 0
        // Bottom (180) -> 90
        // Left (270) -> 180
        
        // Let's us geometry instead of blind formula to preserve quadrants
        // x = sin(a), y = -cos(a) (screen coords, centered)
        const dx = Math.sin(angleDeg * Math.PI / 180);
        const dy = -Math.cos(angleDeg * Math.PI / 180);
        
        // For a rectangle, we want the ticks to align with the TRUE angle of the hands.
        // So we DO NOT stretch the vector. We cast a ray at the true angle.
        
        // Renormalize to get direction vector
        // Since we started with sin/cos, it is already length 1.
        const dirX = dx;
        const dirY = dy;


        // Half dimensions
        const hw = w / 2;
        const hh = h / 2;
        
        const padding = 2; 
        const innerHw = hw - padding;
        const innerHh = hh - padding;
        
        const safeR = Math.min(r, innerHw, innerHh);

        // Raycasting Logic
        
        let tMin = Infinity;
        
        // Potential Hit 1: Vertical Walls
        if (Math.abs(dirX) > 1e-6) {
            const t = (dirX > 0 ? innerHw : -innerHw) / dirX;
            const yHit = dirY * t;
            // Check if within straight part
            if (Math.abs(yHit) <= innerHh - safeR) {
                tMin = t;
            }
        }

        // Potential Hit 2: Horizontal Walls
        if (Math.abs(dirY) > 1e-6) {
            const t = (dirY > 0 ? innerHh : -innerHh) / dirY;
            const xHit = dirX * t;
             // Check if within straight part
            if (Math.abs(xHit) <= innerHw - safeR) {
                if (t < tMin) tMin = t;
            }
        }

        // Potential Hit 3: Corners
        if (tMin === Infinity) {
           const cx = dirX > 0 ? innerHw - safeR : -innerHw + safeR;
           const cy = dirY > 0 ? innerHh - safeR : -innerHh + safeR;

           const DC = dirX * cx + dirY * cy;
           const Csq = cx * cx + cy * cy;
           
           const det = 4 * DC * DC - 4 * (Csq - safeR * safeR);
           if (det >= 0) {
               const sqrtDet = Math.sqrt(det);
               const t1 = (2 * DC + sqrtDet) / 2;
               tMin = t1;
           }
        }

        return { x: dirX * tMin, y: dirY * tMin };
    };

    // Render container first to allow measurement
    if (!dimensions) {
        return <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '100px', minWidth: '100px' }} />;
    }
    
    // Once we have dimensions and time, render content
    if (!time) return null;

    const { h, m, s } = getParts(time);
    const { width, height } = dimensions;

    // Ticks
    const ticks = [];
    const radius = 32; // Standard border radius
    
    // Define tick inset from the outer edge (in logical units)
    // We calculate an inner squircle that is `tickInset` smaller on each side
    const tickInset = 22;
    const innerWidth = width - tickInset * 2;
    const innerHeight = height - tickInset * 2;
    const innerRadius = Math.max(0, radius - tickInset);
    
    for (let i = 0; i < 60; i++) {
        const isHour = i % 5 === 0;
        const angle = i * 6;
        
        // Outer point on the widget edge
        const pOuter = getSquirclePoint(angle, width, height, radius);
        
        // Inner point on a scaled-down inner squircle
        // This ensures all inner ends align to a consistent inner boundary
        const pInner = getSquirclePoint(angle, innerWidth, innerHeight, innerRadius);
        
        ticks.push(
            <line
                key={i}
                x1={width / 2 + pOuter.x}
                y1={height / 2 + pOuter.y}
                x2={width / 2 + pInner.x}
                y2={height / 2 + pInner.y}
                stroke={isHour ? "var(--text-primary)" : "var(--text-muted)"}
                strokeWidth={isHour ? 3 : 1}
                strokeOpacity={isHour ? 1 : 0.5}
            />
        );
    }
    
    // Hands
    const secondAngle = s * 6;
    const minuteAngle = m * 6 + s * 0.1;
    const hourAngle = (h % 12) * 30 + m * 0.5;
    
    // Clock hands length roughly proportional to smallest dimension
    const minDim = Math.min(width, height);
    
    // Helper to get hand end points
    // Hands usually don't reach the very edge in this style, maybe 80%?
    // And "Nothing OS" style has distinctive hands.
    // Hour: Thick, rounded. Minute: Thinner, rounded. Second: Thin line.
    
    // We can just use rotation transforms for simple hands
    
    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            <svg 
                width="100%" 
                height="100%" 
                viewBox={`0 0 ${width} ${height}`}
                style={{ display: 'block' }}
            >
                {/* Ticks moved to a group centered?? No, we calculated absolute coords relative to center. 
                    Wait, my calculation was relative to (0,0) as center.
                    SVG origin is top-left. So I added width/2 in the Render.
                */}
                <g>
                    {ticks}
                </g>

                {/* Center Group for Hands */}
                <g transform={`translate(${width/2}, ${height/2})`}>
                     {/* Hour Hand */}
                     <line
                        x1="0" y1="0"
                        x2="0" y2={-minDim * 0.25}
                        stroke="var(--text-primary)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        transform={`rotate(${hourAngle})`}
                    />
                     {/* Counter balance for Hour */}
                     <line
                        x1="0" y1="0"
                        x2="0" y2={minDim * 0.05}
                        stroke="var(--text-primary)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        transform={`rotate(${hourAngle})`}
                    />

                    {/* Minute Hand */}
                    <line
                        x1="0" y1="0"
                        x2="0" y2={-minDim * 0.38}
                        stroke="var(--text-primary)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        transform={`rotate(${minuteAngle})`}
                    />
                     {/* Counter balance for Minute */}
                     <line
                        x1="0" y1="0"
                        x2="0" y2={minDim * 0.05}
                        stroke="var(--text-primary)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        transform={`rotate(${minuteAngle})`}
                    />

                    {/* Second Hand */}
                     <line
                        x1="0" y1="0"
                        x2="0" y2={-minDim * 0.42}
                        stroke="var(--accent-red)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        transform={`rotate(${secondAngle})`}
                    />
                    <circle cx="0" cy="0" r="4" fill="var(--accent-red)" />
                </g>
            </svg>
        </div>
    );
};
