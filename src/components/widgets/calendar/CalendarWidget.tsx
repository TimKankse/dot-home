import React, { useEffect, useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import styles from './CalendarWidget.module.css';
import { CalendarEvent, CalendarWidgetProps } from './types';
import { DailyView } from './variations/DailyView';
import { MonthlyView } from './variations/MonthlyView';
import { IconButton } from '@/components/primitives/icon-button/IconButton';
import { fetchCalendarEvents } from '@/services/calendar';

export const CalendarWidget: React.FC<CalendarWidgetProps & { integrationId?: string; title?: string }> = ({ config, integrationId, title }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>(config.defaultView || 'daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'daily' ? 'monthly' : 'daily');
  };

  useEffect(() => {
    if (config.defaultView) {
      setViewMode(config.defaultView);
    }
  }, [config.defaultView]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await fetchCalendarEvents({ config, integrationId });
        setEvents(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
    const interval = setInterval(loadEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config, integrationId]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const ViewToggle = (
    <IconButton
      onClick={toggleViewMode}
      icon={viewMode === 'daily' ? <CalendarDays size={18} /> : <Calendar size={18} />}
      title={viewMode === 'daily' ? 'Switch to monthly view' : 'Switch to daily view'}
      size="sm"
    />
  );

  if (loading && events.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>{title || 'Calendar'}</div>
          {ViewToggle}
        </div>
        <div className={styles.emptyState}>Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>{title || 'Calendar'}</div>
          {ViewToggle}
        </div>
        <div className={styles.emptyState}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>{title || 'Calendar'}</div>
        {ViewToggle}
      </div>

      {viewMode === 'daily' ? (
        <DailyView events={events} />
      ) : (
        <MonthlyView 
          currentDate={currentDate} 
          events={events} 
          onMonthChange={changeMonth}
          weekStart={config.weekStart}
        />
      )}
    </div>
  );
};
