import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function CalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [events, setEvents] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/calendar', { params: { month, year } })
      .then(res => { setEvents(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month, year]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

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

  const formatDateKey = (day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const selectedEvents = selectedDay ? (events[formatDateKey(selectedDay)] || []) : [];

  return (
    <div className="calendar-page">
      <div className="header">
        <h1>Календарь обходов</h1>
        <Link to="/scan" className="btn btn-primary">QR-сканер</Link>
      </div>

      <div className="calendar-container">
        <div className="calendar-nav">
          <button onClick={prevMonth} className="btn">◄</button>
          <h2>{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="btn">►</button>
        </div>

        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <div className="calendar-grid">
            {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`pad-${idx}`} className="calendar-cell empty" />;
              const key = formatDateKey(day);
              const dayEvents = events[key] || [];
              const hasOverdue = dayEvents.some(e => e.isOverdue);
              const hasFuture = dayEvents.some(e => !e.isOverdue);

              return (
                <div
                  key={key}
                  className={`calendar-cell ${isToday(day) ? 'today' : ''} ${selectedDay === day ? 'selected' : ''} ${hasOverdue ? 'has-overdue' : ''} ${hasFuture ? 'has-future' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="cell-day">{day}</span>
                  {dayEvents.length > 0 && (
                    <span className="cell-badge">{dayEvents.length}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="calendar-detail">
          <h3>{selectedDay} {MONTHS[month]} {year}</h3>
          {selectedEvents.length === 0 ? (
            <p className="no-events">Нет запланированных работ</p>
          ) : (
            <div className="calendar-events-list">
              {selectedEvents.map((ev, idx) => (
                <div key={idx} className={`calendar-event-card ${ev.isOverdue ? 'overdue' : 'ok'}`}>
                  <div className="event-main">
                    <Link to={`/equipment/${ev.equipmentId}`} className="event-equipment">
                      {ev.equipmentName}
                    </Link>
                    <span className="event-inv">{ev.inventoryNumber}</span>
                  </div>
                  <div className="event-work">{ev.workName}</div>
                  <div className="event-meta">
                    {ev.roomName && <span>📍 {ev.roomName}</span>}
                    {ev.employeeName && <span>👤 {ev.employeeName}</span>}
                  </div>
                  {ev.isOverdue && <span className="overdue-badge overdue">просрочено</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CalendarPage;
