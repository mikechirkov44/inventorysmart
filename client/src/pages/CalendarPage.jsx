/**
 * @fileoverview Страница календаря плановых обходов.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import CalendarEventCard from '../components/CalendarEventCard';
import { useAuth } from '../contexts/AuthContext';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function CalendarPage() {
  const { canView } = useAuth();
  const canExecute = canView('scanner');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState({});
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/calendar', { params: { month, year } })
      .then((res) => { setEvents(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    const today = new Date();
    if (month === today.getMonth() && year === today.getFullYear()) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [month, year]);

  const shiftMonth = (delta) => {
    setMonth((currentMonth) => {
      let nextMonth = currentMonth + delta;
      let nextYear = year;
      if (nextMonth < 0) {
        nextMonth = 11;
        nextYear -= 1;
      } else if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      setYear(nextYear);
      return nextMonth;
    });
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const days = [];
    for (let i = 0; i < startPad; i += 1) days.push(null);
    for (let day = 1; day <= totalDays; day += 1) days.push(day);
    return days;
  }, [month, year]);

  const formatDateKey = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const selectedEvents = selectedDay ? (events[formatDateKey(selectedDay)] || []) : [];
  const isSelectedToday = selectedDay ? isToday(selectedDay) : false;

  const monthEventCount = useMemo(
    () => Object.values(events).reduce((sum, dayEvents) => sum + dayEvents.length, 0),
    [events],
  );

  const panelTitle = isSelectedToday
    ? `Сегодня, ${selectedDay} ${MONTHS[month]}`
    : `${selectedDay} ${MONTHS[month]} ${year}`;

  return (
    <div className="directory-page calendar-page">
      <PageHeader icon={Calendar} title="Календарь обходов">
        <span className="calendar-header-meta">{monthEventCount} работ в месяце</span>
        <Link to="/schedule" className="btn btn-secondary">
          <CalendarDays size={16} /> План-график
        </Link>
      </PageHeader>

      <div className="calendar-layout">
        <aside className="calendar-sidebar">
          <div className="calendar-widget">
            <div className="calendar-month-bar">
              <button type="button" onClick={() => shiftMonth(-1)} className="calendar-month-btn" aria-label="Предыдущий месяц">
                <ChevronLeft size={18} strokeWidth={2.25} />
              </button>
              <span className="calendar-title">{MONTHS[month]} {year}</span>
              <button type="button" onClick={() => shiftMonth(1)} className="calendar-month-btn" aria-label="Следующий месяц">
                <ChevronRight size={18} strokeWidth={2.25} />
              </button>
            </div>

            {loading ? (
              <div className="calendar-grid-skeleton">
                {Array.from({ length: 35 }).map((_, index) => (
                  <div key={index} className="calendar-skeleton-cell skeleton" />
                ))}
              </div>
            ) : (
              <div className="calendar-grid">
                {DAYS.map((day) => <div key={day} className="calendar-day-header">{day}</div>)}
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`pad-${index}`} className="calendar-cell empty" />;
                  }

                  const key = formatDateKey(day);
                  const dayEvents = events[key] || [];
                  const hasOverdue = dayEvents.some((event) => event.isOverdue);

                  return (
                    <button
                      key={key}
                      type="button"
                      className={[
                        'calendar-cell',
                        isToday(day) ? 'today' : '',
                        selectedDay === day ? 'selected' : '',
                        hasOverdue ? 'has-overdue' : '',
                        dayEvents.length > 0 ? 'has-events' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setSelectedDay(day)}
                    >
                      <span className="cell-day">{day}</span>
                      {dayEvents.length > 0 && (
                        <span className={`cell-event-indicator ${hasOverdue ? 'is-overdue' : ''}`}>
                          {dayEvents.length > 9 ? '9+' : dayEvents.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="calendar-content">
          <div className="filters-panel calendar-day-panel">
            <div className="calendar-day-panel-header">
              <h3>{panelTitle}</h3>
              <span className="filter-summary">
                {selectedEvents.length} {selectedEvents.length === 1 ? 'работа' : selectedEvents.length < 5 ? 'работы' : 'работ'}
              </span>
            </div>

            {loading ? (
              <div className="calendar-events-skeleton">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="calendar-event-skeleton skeleton" />
                ))}
              </div>
            ) : selectedEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Нет работ на этот день"
                description="Выберите другой день в календаре или проверьте план-график."
                actionLabel="Открыть план-график"
                actionTo="/schedule"
              />
            ) : (
              <div className="calendar-events-stack">
                {selectedEvents.map((event, index) => (
                  <CalendarEventCard
                    key={`${event.equipmentId}-${event.workId}-${index}`}
                    event={event}
                    canExecute={canExecute}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default CalendarPage;
