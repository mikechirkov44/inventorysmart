import { useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomDatePicker from '../CustomDatePicker';
import CustomSelect from '../CustomSelect';
import { monitoringAPI } from '../../services/api';
import { monitoringSource } from '../../services/monitoring/source';
import { MONITORING_STATES, displayDate, loadLabel, minutesLabel, monitoringToday, shiftDate, validDate } from '../../services/monitoring/model';
import MonitoringDay from './MonitoringDay';
import { useMonitoringMode } from './machineStatus';
import './monitoring.css';

const REFRESH_MS = 5000;
const MACHINE_CAPTION = {
  modbus: 'Показания по Modbus TCP.',
  mtconnect: 'Показания по MTConnect.',
  opcua: 'Показания по OPC UA.',
  focas: 'Показания по Fanuc FOCAS.',
};

function moscowStamp(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function connectionLog(snapshot) {
  if (!snapshot || snapshot.source === 'demo' || snapshot.source === 'none') return '';
  const parts = [snapshot.lastSuccessAt ? `Последний ответ ${moscowStamp(snapshot.lastSuccessAt)} МСК` : 'Успешного ответа ещё не было'];
  if (snapshot.offlineMinutes != null) parts.push(`без связи ${snapshot.offlineMinutes} мин`);
  if (snapshot.lastError) parts.push(snapshot.lastError);
  return parts.join(' · ');
}

function segmentMinutes(item) {
  const end = item.endedAt ? new Date(item.endedAt).getTime() : Date.now();
  return Math.max(1, Math.round((end - new Date(item.startedAt).getTime()) / 60000));
}

export default function EquipmentMonitoring({ equipmentId, initialDate, onDateChange, compact = false }) {
  const [date, setDate] = useState(() => validDate(initialDate) ? initialDate : monitoringToday());
  const [mode, setMode] = useMonitoringMode();
  const [data, setData] = useState(null);
  const [downtime, setDowntime] = useState(null);
  const [causeById, setCauseById] = useState({});
  const [savingId, setSavingId] = useState(null);
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
      const dayPromise = !silent || viewingToday ? monitoringSource.getDay(equipmentId, date, now, mode) : null;
      const rangePromise = !silent || viewingToday ? monitoringSource.getRange([equipmentId], shiftDate(date, -6), date, now, mode) : null;
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
  }, [equipmentId, date, reload, mode]);
  const live = data && data.snapshot.source !== 'demo' && data.snapshot.source !== 'none';
  useEffect(() => {
    if (!live) return undefined;
    let cancelled = false;
    const load = () => monitoringAPI.downtime(equipmentId).then((response) => { if (!cancelled) setDowntime(response.data); }).catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [equipmentId, live]);
  const saveReason = async (id) => {
    const causeId = causeById[id];
    if (!causeId) return;
    setSavingId(id);
    try {
      await monitoringAPI.assignDowntime(id, causeId);
      const response = await monitoringAPI.downtime(equipmentId);
      setDowntime(response.data);
    } finally {
      setSavingId(null);
    }
  };
  const state = data && MONITORING_STATES[data.snapshot.state];
  const log = connectionLog(data?.snapshot);
  return <section id={compact ? undefined : 'equipment-monitoring'} className={`monitor-panel ${compact ? 'is-compact' : ''}`} aria-label="Мониторинг оборудования">
    <div className="monitor-panel-header">
      <div><h2><Activity size={21} />Загрузка оборудования</h2><p className="monitor-muted">{MACHINE_CAPTION[data?.day.source] ? <><span className="monitor-demo-badge">Станок</span> {MACHINE_CAPTION[data.day.source]} Моточасы растут, пока станок в работе, если наработка задана в часах.</> : data?.day.source === 'none' ? <><span className="monitor-demo-badge">Нет связи</span> Демо-данные отключены. Подключите станок, чтобы видеть интервалы.</> : <><span className="monitor-demo-badge">Демо-данные</span> Пример работы мониторинга. Не показания станка.</>}</p></div>
      {!compact && <Link className="btn btn-small" to="/monitoring">Общий мониторинг</Link>}
    </div>
    <div className="monitor-day-controls">
      <div className="monitor-date-controls">
        <button className="btn btn-small" aria-label="Предыдущий день" onClick={() => setDate(shiftDate(date, -1))}><ChevronLeft size={17} /></button>
        <CustomDatePicker ariaLabel="Дата мониторинга" value={date} onChange={value => { if (validDate(value)) setDate(value); }} />
        <button className="btn btn-small" aria-label="Следующий день" disabled={date >= monitoringToday()} onClick={() => setDate(shiftDate(date, 1))}><ChevronRight size={17} /></button>
        <button className="btn btn-small" onClick={() => setDate(monitoringToday())}>Сегодня</button>
        {live && <><button className={`btn btn-small ${mode === 'day' ? 'btn-primary' : ''}`} onClick={() => setMode('day')}>Сутки</button><button className={`btn btn-small ${mode === 'shift' ? 'btn-primary' : ''}`} onClick={() => setMode('shift')}>Смена</button></>}
      </div>
      {state && <div className="monitor-snapshot"><span><i className={state.className} />Сейчас{data.snapshot.source === 'demo' ? ' (демо)' : ''}: <strong>{data.snapshot.state === 'unknown' && live ? 'Нет связи' : state.label}</strong></span><small>Снимок на {new Date(data.snapshot.asOf).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })} МСК{data.snapshot.source === 'demo' ? ' · Не онлайн' : ''}</small>{log && <small>{log}</small>}</div>}
    </div>
    {downtime?.pending?.length > 0 && <section className="monitor-reasons" aria-label="Причины простоя">
      <h3>Укажите причину простоя</h3>
      {downtime.pending.map((item) => <form key={item.id} onSubmit={(event) => { event.preventDefault(); saveReason(item.id); }}>
        <span>{MONITORING_STATES[item.state]?.label || item.state} · {minutesLabel(segmentMinutes(item))}</span>
        <CustomSelect value={causeById[item.id] || ''} onChange={(value) => setCauseById((current) => ({ ...current, [item.id]: value }))} options={[{ value: '', label: 'Выберите причину' }, ...(downtime.causes || []).map((cause) => ({ value: cause.id, label: cause.name }))]} />
        <button className="btn btn-small" type="submit" disabled={!causeById[item.id] || savingId === item.id}>Сохранить</button>
      </form>)}
      {!downtime.causes?.length && <p className="monitor-muted">Добавьте причины в справочнике «Причины».</p>}
    </section>}
    {error ? <div className="monitor-empty" role="alert">Не удалось загрузить мониторинг.<button className="btn" onClick={() => setReload(value => value + 1)}>Повторить</button></div> : !data ? <div className="monitor-empty" role="status">Загрузка показателей…</div> : <>
      <MonitoringDay key={`${equipmentId}:${date}:${mode}`} day={data.day} />
      <section className="monitor-trend"><h3>{mode === 'shift' ? 'Загрузка смены за 7 дней' : 'Загрузка за 7 дней'}</h3><div className="monitor-trend-bars">{data.days.map(day => <button key={day.date} className={day.date === date ? 'is-selected' : ''} onClick={() => setDate(day.date)} title={`${displayDate(day.date)}: ${loadLabel(day.utilization)}`} aria-label={`${displayDate(day.date)}: ${loadLabel(day.utilization)}`}><strong>{day.utilization == null ? '—' : loadLabel(day.utilization)}</strong><div>{day.utilization != null && <i style={{ height: `${day.utilization}%`, borderBottom: day.utilization === 0 ? '1px solid currentColor' : undefined }} />}</div><span>{displayDate(day.date)}</span></button>)}</div></section>
    </>}
  </section>;
}
