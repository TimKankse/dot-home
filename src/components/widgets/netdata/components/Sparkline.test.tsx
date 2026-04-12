import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders a trace immediately for a single sample', () => {
    const { container } = render(
      <Sparkline
        dataPoints={[{ x: 1_710_000_000_000, y: 42 }]}
        color="red"
        tooltipLabel="CPU load"
      />
    );

    expect(container.querySelector('polyline')).toBeInTheDocument();
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('renders the hover marker outside the svg so it stays round', () => {
    const { container } = render(
      <Sparkline
        dataPoints={[
          { x: 1_710_000_000_000, y: 20 },
          { x: 1_710_000_002_000, y: 40 },
        ]}
        color="red"
        tooltipLabel="CPU load"
      />
    );

    const chartRoot = container.firstElementChild as HTMLDivElement;

    Object.defineProperty(chartRoot, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 120,
        height: 40,
        top: 0,
        right: 120,
        bottom: 40,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerMove(chartRoot, { clientX: 80, clientY: 20 });

    expect(screen.getByText('CPU load')).toBeInTheDocument();
    expect(container.querySelector('svg circle')).not.toBeInTheDocument();
    const hoverPoint = container.querySelector('div[style*="background-color: red"]') as HTMLDivElement | null;
    expect(hoverPoint).toBeInTheDocument();
    expect(hoverPoint?.style.width).toBe('10px');
    expect(hoverPoint?.style.height).toBe('10px');
  });
});
