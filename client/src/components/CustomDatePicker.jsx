import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateValue(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function CustomDatePicker({ value, onChange, placeholder = 'ДД.ММ.ГГГГ', className = '' }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(parseDateValue(value) || new Date());
  const ref = useRef(null);

  const selectedDate = parseDateValue(value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const prevMonthDays = Array.from({ length: firstDay }, (_, i) => daysInPrevMonth - firstDay + 1 + i);
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalCells = firstDay + daysInMonth;
  const nextMonthDays = Array.from({ length: (7 - (totalCells % 7)) % 7 }, (_, i) => i + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSelect = (day) => {
    const date = new Date(year, month, day);
    onChange(formatDateValue(date));
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const handleToday = () => {
    const now = new Date();
    onChange(formatDateValue(now));
    setViewDate(now);
    setOpen(false);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('ru-RU')
    : '';

  return (
    <div ref={ref} className={`cs-wrapper ${className}`}>
      <button type="button" className={`cs-trigger ${open ? 'cs-open' : ''}`} onClick={() => setOpen(!open)}>
        <span className={!displayValue ? 'cs-placeholder' : ''}>
          {displayValue || placeholder}
        </span>
        <Calendar size={16} className="cs-chevron" />
      </button>
      {open && (
        <div className="cs-dropdown calendar-dropdown">
          <div className="calendar-header">
            <button type="button" className="calendar-nav" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="calendar-title">{MONTHS[month]} {year}</span>
            <button type="button" className="calendar-nav" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="calendar-weekdays">
            {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="calendar-days">
            {prevMonthDays.map(day => (
              <span key={`prev-${day}`} className="calendar-day other-month">{day}</span>
            ))}
            {currentDays.map(day => {
              const date = new Date(year, month, day);
              const isToday = date.getTime() === today.getTime();
              const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
              return (
                <button
                  key={day}
                  type="button"
                  className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(day)}
                >
                  {day}
                </button>
              );
            })}
            {nextMonthDays.map(day => (
              <span key={`next-${day}`} className="calendar-day other-month">{day}</span>
            ))}
          </div>
          <div className="calendar-footer">
            <button type="button" className="calendar-action" onClick={handleClear}>Очистить</button>
            <button type="button" className="calendar-action" onClick={handleToday}>Сегодня</button>
          </div>
        </div>
      )}
    </div>
  );
}
