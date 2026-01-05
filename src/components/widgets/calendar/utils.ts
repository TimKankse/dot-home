import { CalendarEvent } from './types';
import styles from './CalendarWidget.module.css';

export const getEventTypeLabel = (type: string) => {
  switch (type) {
    case 'movie': return 'Movie';
    case 'episode': return 'Episode';
    default: return 'Event';
  }
};

export const getEventTypeClass = (type: string) => {
  switch (type) {
    case 'movie': return styles.typeMovie;
    case 'episode': return styles.typeEpisode;
    default: return styles.typeEvent;
  }
};

export const getDailyGroups = (events: CalendarEvent[]) => {
  const groups: { [key: string]: CalendarEvent[] } = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  events.forEach(event => {
    const date = new Date(event.date);
    date.setHours(0, 0, 0, 0);
    
    let key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    if (date.getTime() === today.getTime()) key = 'Today';
    else if (date.getTime() === tomorrow.getTime()) key = 'Tomorrow';

    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  });

  return groups;
};

export const getDaysInMonth = (year: number, month: number, weekStart: 'monday' | 'sunday' = 'sunday') => {
  const date = new Date(year, month, 1);
  const days = [];
  
  // Add padding for previous month
  let firstDay = date.getDay(); // 0 = Sunday
  
  // Adjust for Monday start
  if (weekStart === 'monday') {
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
  }

  for (let i = 0; i < firstDay; i++) {
    const prevDate = new Date(year, month, -i);
    days.unshift({ date: prevDate, isCurrentMonth: false });
  }

  // Add days of current month
  while (date.getMonth() === month) {
    days.push({ date: new Date(date), isCurrentMonth: true });
    date.setDate(date.getDate() + 1);
  }

  // Add padding for next month to fill 6 rows (42 days) or just enough to fill the last week
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({ date: nextDate, isCurrentMonth: false });
  }

  return days;
};

export const getEventsForDate = (events: CalendarEvent[], date: Date) => {
  return events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getDate() === date.getDate() &&
           eventDate.getMonth() === date.getMonth() &&
           eventDate.getFullYear() === date.getFullYear();
  });
};
