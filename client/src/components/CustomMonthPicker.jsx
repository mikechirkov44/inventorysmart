import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const PICKER_WIDTH = 320;
const PICKER_HEIGHT = 290;
const EDGE = 8;

function parseValue(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1 };
}

function formatValue(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function CustomMonthPicker({ value, onChange, placeholder = 'Выберите месяц', disabled = false, className = '' }) {
  const selected = parseValue(value);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selected?.year || new Date().getFullYear());
  const [position, setPosition] = useState({ top: 0, left: 0, width: PICKER_WIDTH });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (selected) setYear(selected.year);
  }, [value]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, PICKER_WIDTH);
    let left = Math.min(rect.left, window.innerWidth - width - EDGE);
    left = Math.max(EDGE, left);
    let top = rect.bottom + 6;
    if (top + PICKER_HEIGHT > window.innerHeight - EDGE) top = Math.max(EDGE, rect.top - PICKER_HEIGHT - 6);
    setPosition({ top, left, width });
  };

  useLayoutEffect(() => { if (open) updatePosition(); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    const closeOnScroll = () => setOpen(false);
    const reposition = () => updatePosition();
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const selectMonth = (month) => {
    onChange(formatValue(year, month));
    setOpen(false);
  };
  const selectCurrent = () => {
    const now = new Date();
    setYear(now.getFullYear());
    onChange(formatValue(now.getFullYear(), now.getMonth()));
    setOpen(false);
  };
  const displayValue = selected ? `${MONTHS[selected.month]} ${selected.year}` : '';
  const now = new Date();

  return <div className={`month-picker ${className}`}>
    <button ref={triggerRef} type="button" className={`month-picker-trigger ${open ? 'open' : ''}`} disabled={disabled}
      aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span className={!displayValue ? 'month-picker-placeholder' : ''}>{displayValue || placeholder}</span>
      <CalendarDays size={16}/>
    </button>
    {open && createPortal(<div ref={dropdownRef} className="month-picker-dropdown" role="dialog" aria-label="Выбор месяца"
      style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 99999 }}>
      <div className="month-picker-header">
        <button type="button" className="month-picker-nav" aria-label="Предыдущий год" onClick={() => setYear((current) => current - 1)}><ChevronLeft size={18}/></button>
        <div><strong>{year}</strong><span>Выберите месяц</span></div>
        <button type="button" className="month-picker-nav" aria-label="Следующий год" onClick={() => setYear((current) => current + 1)}><ChevronRight size={18}/></button>
      </div>
      <div className="month-picker-grid">
        {MONTHS.map((month, index) => {
          const active = selected?.year === year && selected?.month === index;
          const current = now.getFullYear() === year && now.getMonth() === index;
          return <button type="button" key={month} className={`month-picker-month ${active ? 'selected' : ''} ${current ? 'current' : ''}`}
            onClick={() => selectMonth(index)}>{month.slice(0, 3)}</button>;
        })}
      </div>
      <div className="month-picker-footer">
        <span>● отмечен выбранный период</span>
        <button type="button" onClick={selectCurrent}>Текущий месяц</button>
      </div>
    </div>, document.body)}
  </div>;
}
