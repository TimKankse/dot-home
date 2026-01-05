import React from 'react';
import styles from '../CalendarWidget.module.css';
import { CalendarEvent } from '../types';
import { getDaysInMonth, getEventsForDate, getEventTypeClass } from '../utils';

interface MonthlyViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onMonthChange: (delta: number) => void;
  weekStart?: 'monday' | 'sunday';
}

export const MonthlyView: React.FC<MonthlyViewProps> = ({ currentDate, events, onMonthChange, weekStart = 'sunday' }) => {
  const weekDays = weekStart === 'monday' 
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={styles.monthlyContainer}>
      <div className={styles.monthNav}>
        <button className={styles.navButton} onClick={() => onMonthChange(-1)}>&lt;</button>
        <span className={styles.monthTitle}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button className={styles.navButton} onClick={() => onMonthChange(1)}>&gt;</button>
      </div>
      <div className={styles.weekHeader}>
        {weekDays.map(day => <span key={day}>{day}</span>)}
      </div>
      <div className={styles.monthlyGrid}>
        {getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth(), weekStart).map((dayInfo, idx) => {
          const dayEvents = getEventsForDate(events, dayInfo.date);
          const isToday = new Date().toDateString() === dayInfo.date.toDateString();
          
          // Calculate position for tooltip
          const row = Math.floor(idx / 7);
          const col = idx % 7;
          
          const isTop = row < 2;
          const isLeft = col < 2;
          const isRight = col > 4;

          let tooltipClass = styles.tooltip;
          if (isTop) tooltipClass += ` ${styles.tooltipBottom}`;
          if (isLeft) tooltipClass += ` ${styles.tooltipLeft}`;
          if (isRight) tooltipClass += ` ${styles.tooltipRight}`;
          
          return (
            <div 
              key={idx} 
              className={`${styles.dayCell} ${!dayInfo.isCurrentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''}`}
            >
              <span className={styles.dayNumber}>{dayInfo.date.getDate()}</span>
              <div className={styles.eventDots}>
                {dayEvents.map(event => (
                  <div 
                    key={event.id} 
                    className={`${styles.eventDot} ${getEventTypeClass(event.type)}`} 
                  />
                ))}
              </div>
              
              {dayEvents.length > 0 && (
                <div className={tooltipClass}>
                  <div className={styles.tooltipTitle}>
                    {dayInfo.date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className={styles.tooltipEvents}>
                    {dayEvents.map(event => (
                      <div key={event.id} className={styles.tooltipEvent}>
                        <div className={`${styles.tooltipDot} ${getEventTypeClass(event.type)}`} />
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
