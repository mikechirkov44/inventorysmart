/**
 * @fileoverview Страница календаря плановых обходов.
 * Отображает месячный календарь с плановыми работами,
 * позволяет просматривать работы на конкретный день.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarDays } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import FrequencyBadge from '../components/FrequencyBadge';

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

/** Компонент календаря плановых обходов */
function CalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState({});
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [loading, setLoading] = useState(true);

  /** Загрузка событий календаря при смене месяца/года */
  useEffect(() => {
    setLoading(true);
    api.get('/calendar', { params: { month, year } })
      .then(res => { setEvents(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month, year]);

  /** Переход к предыдущему месяцу */
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  /** Переход к следующему месяцу */
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  /** Формирование массива дней для отображения в календаре */
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const days = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [month, year]);

  /** Формирование ключа даты в формате YYYY-MM-DD */
  const formatDateKey = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const todayKey = formatDateKey(today.getDate());
  const todayEvents = (month === today.getMonth() && year === today.getFullYear()) ? (events[formatDateKey(today.getDate())] || []) : [];

  const selectedEvents = selectedDay ? (events[formatDateKey(selectedDay)] || []) : [];

  return (
    <div className="calendar-page">
      <PageHeader icon={Calendar} title="Календарь обходов">
        <Link to="/schedule" className="btn btn-secondary">
          <CalendarDays size={16} /> План-график
        </Link>
      </PageHeader>

      <div className="calendar-layout">
        <div className="calendar-left">
          <div className="calendar-container compact">
            <div className="calendar-nav">
              <button onClick={prevMonth} className="btn btn-small">◄</button>
              <span className="calendar-title">{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} className="btn btn-small">►</button>
            </div>

            {loading ? (
              <div className="loading-spinner">Загрузка...</div>
            ) : (
              <div className="calendar-grid compact">
                {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
                {calendarDays.map((day, idx) => {
                  if (day === null) return <div key={`pad-${idx}`} className="calendar-cell empty" />;
                  const key = formatDateKey(day);
                  const dayEvents = events[key] || [];
                  const hasOverdue = dayEvents.some(e => e.isOverdue);

                  return (
                    <div
                      key={key}
                      className={`calendar-cell ${isToday(day) ? 'today' : ''} ${selectedDay === day ? 'selected' : ''} ${hasOverdue ? 'has-overdue' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <span className="cell-day">{day}</span>
                      {dayEvents.length > 0 && <span className="cell-badge">{dayEvents.length}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Правая панель с событиями дня */}
        <div className="calendar-right">
          {/* Блок событий на сегодня */}
          {todayEvents.length > 0 && (
            <div className="calendar-panel today-panel">
              <h3>Сегодня ({today.getDate()} {MONTHS[today.getMonth()]})</h3>
              <div className="panel-events">
                {todayEvents.map((ev, idx) => (
                  <div key={idx} className={`panel-event ${ev.isOverdue ? 'overdue' : 'ok'}`}>
                    <div className="panel-event-name">
                      <Link to={`/equipment/${ev.equipmentId}`}>{ev.equipmentName}</Link>
                    </div>
                    <div className="panel-event-work">{ev.workName}</div>
                    <div className="panel-event-meta">
                      {ev.roomName && <span>📍 {ev.roomName}</span>}
                      {ev.employeeName && <span>👤 {ev.employeeName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDay && (
            <div className="calendar-panel selected-panel">
              <h3>{selectedDay} {MONTHS[month]} {year}</h3>
              {selectedEvents.length === 0 ? (
                <p className="no-events">Нет работ</p>
              ) : (
                <div className="panel-events">
                  {selectedEvents.map((ev, idx) => (
                    <div key={idx} className={`panel-event ${ev.isOverdue ? 'overdue' : 'ok'}`}>
                      <div className="panel-event-name">
                        <Link to={`/equipment/${ev.equipmentId}`}>{ev.equipmentName}</Link>
                        <span className="panel-event-inv">{ev.inventoryNumber}</span>
                      </div>
                      <div className="panel-event-work">
                        {ev.workName}{' '}
                        <FrequencyBadge days={ev.frequencyDays} />
                      </div>
                      <div className="panel-event-meta">
                        {ev.roomName && <span>📍 {ev.roomName}</span>}
                        {ev.employeeName && <span>👤 {ev.employeeName}</span>}
                        {ev.isOverdue && <span className="overdue-badge overdue">просрочено</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedDay && todayEvents.length === 0 && (
            <div className="calendar-panel empty-panel">
              <p>Выберите день в календаре</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
