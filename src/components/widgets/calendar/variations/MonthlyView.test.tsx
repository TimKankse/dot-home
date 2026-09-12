import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import styles from '../CalendarWidget.module.css';
import type { CalendarEvent } from '../types';
import { MonthlyView } from './MonthlyView';

describe('MonthlyView compact event indicators', () => {
  it('renders one compact segment per event type instead of per event', () => {
    const eventDate = new Date(2026, 7, 10, 12);
    const events: CalendarEvent[] = [
      {
        id: 'event-1',
        title: 'First event',
        date: eventDate.toISOString(),
        source: 'google',
        type: 'event',
      },
      {
        id: 'event-2',
        title: 'Second event',
        date: eventDate.toISOString(),
        source: 'google',
        type: 'event',
      },
      {
        id: 'movie-1',
        title: 'Movie release',
        date: eventDate.toISOString(),
        source: 'radarr',
        type: 'movie',
      },
    ];

    const { container } = render(
      <MonthlyView
        currentDate={new Date(2026, 7, 1)}
        events={events}
        onMonthChange={() => undefined}
      />,
    );

    const indicator = container.querySelector(`.${styles.compactEventIndicator}`);
    expect(indicator).not.toBeNull();
    expect(indicator?.querySelectorAll(`.${styles.compactEventSegment}`)).toHaveLength(2);
  });
});
