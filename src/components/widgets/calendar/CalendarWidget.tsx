import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import styles from './CalendarWidget.module.css';
import { CalendarEvent, CalendarWidgetProps } from './types';
import { DailyView } from './variations/DailyView';
import { MonthlyView } from './variations/MonthlyView';

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ config }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>(config.defaultView || 'daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update view mode if config changes
  useEffect(() => {
    if (config.defaultView) {
      setViewMode(config.defaultView);
    }
  }, [config.defaultView]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        // Handle multiple iCal URLs
        if (config.icalUrls) {
          config.icalUrls.forEach(url => params.append('icalUrl', url));
        } else if (config.icalUrl) {
          params.append('icalUrl', config.icalUrl);
        }

        if (config.radarrUrl) params.append('radarrUrl', config.radarrUrl);
        if (config.radarrApiKey) params.append('radarrApiKey', config.radarrApiKey);
        if (config.sonarrUrl) params.append('sonarrUrl', config.sonarrUrl);
        if (config.sonarrApiKey) params.append('sonarrApiKey', config.sonarrApiKey);

        const response = await fetch(`/api/calendar?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch calendar data');
        
        const data = await response.json();
        setEvents(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // Refresh every 15 minutes
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  if (loading && events.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>Calendar</div>
          <CalendarIcon size={20} className="text-muted" />
        </div>
        <div className={styles.emptyState}>Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.title}>Calendar</div>
          <CalendarIcon size={20} className="text-muted" />
        </div>
        <div className={styles.emptyState}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>Calendar</div>
        <CalendarIcon size={20} className="text-muted" />
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
