import { useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomDatePicker from '../CustomDatePicker';
import { monitoringSource } from '../../services/monitoring/source';
import { MONITORING_STATES, displayDate, loadLabel, monitoringToday, shiftDate, validDate } from '../../services/monitoring/model';
import MonitoringDay from './MonitoringDay';
import './monitoring.css';

const REFRESH_MS = 5000;

export default function EquipmentMonitoring({ equipmentId, initialDate, onDateChange, compact = false }) {
  const [date, setDate] = useState(() => validDate(initialDate) ? initialDate : monitoringToday());
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => { onDateChange?.(date); }, [date, onDateChange]);
  useEffect(() => {
    if (!compact && window.location.hash === '#equipment-monitoring') document.getElementById('equipment-monitoring')?.scrollIntoView();
  }, [compact]);
  useEffect(() => {
    let cancelled = false;
    let requestId = 0;
    const load = (silent) => {
      const id = ++requestId;
      const now = new Date();
      const viewingToday = date === monitoringToday(now);
      if (!silent) { setData(null); setError(false); }
      const dayPromise = !silent || viewingToday ? monitoringSource.getDay(equipmentId, date, now) : null;
      const rangePromise = !silent || viewingToday ? monitoringSource.getRange([equipmentId], shiftDate(date, -6), date, now) : null;
      Promise.all([dayPromise, rangePromise, monitoringSource.getSnapshot(equipmentId, now)])
        .then(([day, range, snapshot]) => {
          if (cancelled || id !== requestId) return;
          if (!day || !range?.[0]) {
            setData((current) => (current ? { ...current, snapshot } : current));
            return;
          }
          setError(false);
          setData({ day, days: range[0].days, snapshot });
        })
        .catch(() => { if (!cancelled && id === requestId && !silent) setError(true); });
    };
    load(false);
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [equipmentId, date, reload]);
  const state = data && MONITORING_STATES[data.snapshot.state];
  return <section id={compact ? undefined : 'equipment-monitoring'} className={`monitor-panel ${compact ? 'is-compact' : ''}`} aria-label="Мониторинг оборудования">
    <div className="monitor-panel-header">
      <div><h2><Activity size={21} />Загрузка оборудования</h2><p className="monitor-muted">{data?.day.source === 'modbus' ? <><span className="monitor-demo-badge">Станок</span> Показания с Modbus-шлюза.</> : <><span className="monitor-demo-badge">Демо-данные</span> Пример работы мониторинга. Не показания станка.</>}</p></div>
      {!compact && <Link className="btn btn-small" to="/monitoring">Общий мониторинг</Link>}
    </div>
    <div className="monitor-day-controls">
      <div className="monitor-date-controls">
        <button className="btn btn-small" aria-label="Предыдущий день" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft size={17} /></button>
        <CustomDatePicker ariaLabel="Дата мониторинга" value={date} onChange={value => { if (validDate(value)) setDate(value); }} />
        <button className="btn btn-small" aria-label="Следующий день" disabled={date >= monitoringToday()} onClick={() => setDate(shiftDate(date, 1))}><ChevronRight size={17} /></button>
        <button className="btn btn-small" onClick={() => setDate(monitoringToday())}>Сегодня</button>
      </div>
      {state && <div className="monitor-snapshot"><span><i className={state.className} />Сейчас{data.snapshot.source === 'modbus' ? '' : ' (демо)'}: <strong>{state.label}</strong></span><small>Снимок на {new Date(data.snapshot.asOf).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })} МСК{data.snapshot.source === 'modbus' ? '' : ' · Не онлайн'}</small></div>}
    </div>
    {error ? <div className="monitor-empty" role="alert">Не удалось загрузить мониторинг.<button className="btn" onClick={() => setReload(value => value + 1)}>Повторить</button></div> : !data ? <div className="monitor-empty" role="status">Загрузка показателей…</div> : <>
      <MonitoringDay key={`${equipmentId}:${date}`} day={data.day} />
      <section className="monitor-trend"><h3>Загрузка за 7 дней</h3><div className="monitor-trend-bars">{data.days.map(day => <button key={day.date} className={day.date === date ? 'is-selected' : ''} onClick={() => setDate(day.date)} title={`${displayDate(day.date)}: ${loadLabel(day.utilization)}`} aria-label={`${displayDate(day.date)}: ${loadLabel(day.utilization)}`}><strong>{day.utilization == null ? '—' : loadLabel(day.utilization)}</strong><div>{day.utilization != null && <i style={{ height: `${day.utilization}%`, borderBottom: day.utilization === 0 ? '1px solid currentColor' : undefined }} />}</div><span>{displayDate(day.date)}</span></button>)}</div></section>
    </>}
  </section>;
}
