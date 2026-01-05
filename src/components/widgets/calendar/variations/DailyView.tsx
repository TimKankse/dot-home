import React from 'react';
import styles from '../CalendarWidget.module.css';
import { CalendarEvent } from '../types';
import { getDailyGroups, getEventTypeClass, getEventTypeLabel } from '../utils';

interface DailyViewProps {
  events: CalendarEvent[];
}

export const DailyView: React.FC<DailyViewProps> = ({ events }) => {
  if (events.length === 0) {
    return <div className={styles.emptyState}>No upcoming events</div>;
  }

  return (
    <div className={styles.eventList}>
      {Object.entries(getDailyGroups(events)).map(([dateLabel, groupEvents]) => (
        <div key={dateLabel} className={styles.dailyGroup}>
          <div className={styles.dailyHeader}>{dateLabel}</div>
          {groupEvents.map(event => {
            const time = new Date(event.date).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={event.id} className={styles.eventItem}>
                <div className={styles.eventContent}>
                  <div className={styles.eventTitle} title={event.title}>
                    {event.title}
                  </div>
                  <div className={styles.eventMeta}>
                    <span className={`${styles.eventType} ${getEventTypeClass(event.type)}`}>
                      {getEventTypeLabel(event.type)}
                    </span>
                    {!event.allDay && <span className={styles.time}>{time}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
