import { useEffect, useMemo, useState } from 'react';
import { Activity, Search, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { equipmentAPI, roomsAPI } from '../services/api';
import { monitoringSource } from '../services/monitoring/source';
import { dateRange, displayDate, loadLabel, monitoringToday, shiftDate } from '../services/monitoring/model';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import MonitoringDialog from '../components/monitoring/MonitoringDialog';
import '../components/monitoring/monitoring.css';

const PAGE_SIZE = 25;
const initialPeriod = () => { const to = shiftDate(monitoringToday(), -1); return { from: shiftDate(to, -6), to }; };

export default function MonitoringPage() {
  const [equipment, setEquipment] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [period, setPeriod] = useState(initialPeriod);
  const [search, setSearch] = useState('');
  const [roomId, setRoomId] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(null);
  const [dataError, setDataError] = useState(false);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    let cancelled = false; setLoading(true); setError(false);
    Promise.all([equipmentAPI.getAll(), roomsAPI.getAll().catch(() => ({ data: [] }))]).then(([items, roomList]) => {
      if (!cancelled) { setEquipment(items.data); setRooms(roomList.data); }
    }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retry]);
  const filtered = useMemo(() => equipment.filter(item =>
    `${item.name} ${item.inventoryNumber || ''}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!roomId || item.roomId === roomId) && (!category || item.categoryName === category)
  ), [equipment, search, roomId, category]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = useMemo(() => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE), [filtered, currentPage]);
  let periodError = ''; let dates = [];
  try { dates = dateRange(period.from, period.to); } catch (err) { periodError = err.message; }
  useEffect(() => {
    let cancelled = false; setRows(null); setDataError(false);
    if (periodError) return undefined;
    monitoringSource.getRange(visible.map(item => item.id), period.from, period.to).then(data => { if (!cancelled) setRows(data); }).catch(() => { if (!cancelled) setDataError(true); });
    return () => { cancelled = true; };
  }, [visible, period.from, period.to, periodError, retry]);
  const byId = new Map((rows || []).map(row => [row.equipmentId, row.days]));
  const reset = () => { setPeriod(initialPeriod()); setSearch(''); setRoomId(''); setCategory(''); setPage(0); };
  const setDays = count => { const to = shiftDate(monitoringToday(), -1); setPeriod({ from: shiftDate(to, 1 - count), to }); };
  return <div className="monitor-page">
    <div className="header"><h1><Activity size={24} />Мониторинг</h1><span className="monitor-demo-badge">Демо без связи</span></div>
    <div className="monitor-demo-notice"><Activity size={19} /><div><strong>Загрузка оборудования</strong><p>Станки без подключения показывают демо-график. У оборудования с Modbus TCP в карточке отображаются реальные интервалы. Статусы справочника и моточасы не изменяются.</p></div></div>
    <section className="monitor-filters" aria-label="Фильтры мониторинга">
      <div className="monitor-period"><label>С даты<CustomDatePicker value={period.from} onChange={value => setPeriod(old => ({ ...old, from: value }))} ariaLabel="Начало периода" /></label><label>По дату<CustomDatePicker value={period.to} onChange={value => setPeriod(old => ({ ...old, to: value }))} ariaLabel="Конец периода" /></label><div className="monitor-presets"><button className="btn btn-small" onClick={() => setDays(7)}>7 дней</button><button className="btn btn-small" onClick={() => setDays(14)}>14 дней</button><button className="btn btn-small" onClick={() => setDays(30)}>30 дней</button></div></div>
      <div className="monitor-filter-row"><label className="monitor-search"><Search size={17} /><input aria-label="Поиск оборудования" placeholder="Название или инвентарный номер" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label><CustomSelect value={roomId} onChange={value => { setRoomId(value); setPage(0); }} options={[{ value: '', label: 'Все помещения' }, ...rooms.map(room => ({ value: room.id, label: room.name }))]} /><CustomSelect value={category} onChange={value => { setCategory(value); setPage(0); }} options={[{ value: '', label: 'Все категории' }, ...[...new Set(equipment.map(item => item.categoryName).filter(Boolean))].sort().map(name => ({ value: name, label: name }))]} /><button className="btn btn-small" onClick={reset}><RotateCcw size={15} />Сбросить</button></div>
      <p className="monitor-muted">Найдено: {filtered.length} из {equipment.length} · Не больше 31 дня за раз · Время: Москва (UTC+3)</p>
      {periodError && <p className="monitor-error" role="alert">{periodError}</p>}
    </section>
    {error || dataError ? <div className="monitor-empty" role="alert">Не удалось загрузить мониторинг.<button className="btn" onClick={() => setRetry(value => value + 1)}>Повторить</button></div> : loading ? <div className="monitor-empty" role="status">Загрузка оборудования…</div> : !periodError && <>
      <div className="monitor-table-caption"><span>Загрузка по дням</span><small>Нажмите на процент, чтобы открыть подробности</small></div>
      <div className="monitor-table-scroll" tabIndex="0" role="region" aria-label="Таблица загрузки оборудования">
        <table className="monitor-table"><thead><tr><th scope="col">Оборудование</th>{dates.map(date => <th key={date} scope="col"><span>{displayDate(date)}</span><small>{new Date(`${date}T12:00:00Z`).toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'UTC' })}</small></th>)}</tr></thead><tbody>
          {visible.map(item => <tr key={item.id}><th scope="row"><Link to={`/equipment/${item.id}`}>{item.name}</Link><small>{item.inventoryNumber || 'Без номера'}{item.roomId ? ` · ${rooms.find(room => room.id === item.roomId)?.name || ''}` : ''}</small></th>{dates.map((date, i) => {
            const day = byId.get(item.id)?.[i]; const value = day?.utilization;
            return <td key={date}>{!day ? <span className="monitor-muted">…</span> : <button className={`monitor-load-cell ${value == null ? 'load-unknown' : value >= 60 ? 'load-high' : value >= 30 ? 'load-medium' : 'load-low'}`} data-utilization={value ?? ''} onClick={() => setSelected({ equipment: item, date })} aria-label={`${item.name}, ${displayDate(date)}: ${loadLabel(value)}`}><strong>{value == null ? '—' : loadLabel(value)}</strong><span className="monitor-cell-track"><i style={{ width: `${value || 0}%` }} /></span>{value == null && <small>Нет данных</small>}</button>}</td>;
          })}</tr>)}
          {!visible.length && <tr><td colSpan={dates.length + 1}><div className="monitor-empty">{equipment.length ? 'Оборудование по заданным фильтрам не найдено.' : 'В справочнике пока нет оборудования.'}</div></td></tr>}
        </tbody></table>
      </div>
      <div className="monitor-table-footer"><span>Процент времени работы за сутки. Сегодня — за прошедшее время; будущие даты — без данных.</span><div><button className="btn btn-small" aria-label="Предыдущая страница" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button><span>{currentPage + 1} / {pages}</span><button className="btn btn-small" aria-label="Следующая страница" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div></div>
    </>}
    {selected && <MonitoringDialog {...selected} onClose={() => setSelected(null)} />}
  </div>;
}
