/**
 * @module SchedulePage
 * @description План-график ремонтов: таблица с фильтрами и Gantt-диаграмма по оборудованию.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

/** Варианты периодичности плановых работ */
const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Ежедневно' },
  { value: 7, label: '1 раз в неделю' },
  { value: 10, label: '1 раз в 10 дней' },
  { value: 14, label: '1 раз в 2 недели' },
  { value: 30, label: '1 раз в месяц' },
  { value: 60, label: '1 раз в 2 месяца' },
  { value: 90, label: '1 раз в 3 месяца' },
  { value: 180, label: '1 раз в 6 месяцев' },
  { value: 365, label: '1 раз в год' },
];

function getFrequencyLabel(days) {
  const opt = FREQUENCY_OPTIONS.find(o => o.value === days);
  return opt ? opt.label : `каждые ${days} дн.`;
}

const STATUS_MAP = {
  planned: { label: 'Запланировано', className: 'status-working' },
  upcoming: { label: 'Близко', className: 'status-under-repair' },
  overdue: { label: 'Просрочено', className: 'status-needs-repair' },
  never: { label: 'Не выполнялось', className: 'status-needs-repair' },
};

const COLUMNS = [
  { key: 'equipmentName', label: 'Оборудование', sortable: true },
  { key: 'inventoryNumber', label: 'Инв. номер', sortable: true },
  { key: 'roomName', label: 'Помещение', sortable: true },
  { key: 'workName', label: 'Работа', sortable: true },
  { key: 'frequencyDays', label: 'Периодичность', sortable: true },
  { key: 'plannedDate', label: 'План. дата', sortable: true },
  { key: 'lastCompleted', label: 'Последн. выполнение', sortable: true },
  { key: 'status', label: 'Статус', sortable: true },
];

const TOTAL_COLS = COLUMNS.length;

const QUICK_PERIODS = [
  { label: 'Текущая неделя', days: 7, months: 1 },
  { label: 'Текущий месяц', days: 30, months: 1 },
  { label: 'Текущий квартал', days: 90, months: 3 },
  { label: 'Текущий год', days: 365, months: 12 },
];

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function SchedulePage() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('employee');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [activeTab, setActiveTab] = useState('plan');

  const [sortField, setSortField] = useState('plannedDate');
  const [sortDir, setSortDir] = useState('asc');

  const [filterEquipment, setFilterEquipment] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterWork, setFilterWork] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [chartMonths, setChartMonths] = useState(6);
  const [expandedEquipment, setExpandedEquipment] = useState(new Set());

  /** Загрузка план-графика при изменении группировки */
  useEffect(() => { fetchSchedule(); }, [groupBy]);

  /** Получение данных план-графика с сервера */
  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedule', { params: { group: groupBy } });
      setData(res.data);
      const allGroups = new Set(res.data.groups.map((_, i) => i));
      setExpandedGroups(allGroups);
    } catch {}
    setLoading(false);
  };

  /** Уникальные помещения из данных */
  const uniqueRooms = useMemo(() => {
    if (!data) return [];
    const set = new Set();
    data.groups.forEach(g => g.rows.forEach(r => { if (r.roomName) set.add(r.roomName); }));
    return [...set].sort();
  }, [data]);

  const uniqueWorks = useMemo(() => {
    if (!data) return [];
    const set = new Set();
    data.groups.forEach(g => g.rows.forEach(r => { if (r.workName) set.add(r.workName); }));
    return [...set].sort();
  }, [data]);

  const uniqueEquipment = useMemo(() => {
    if (!data) return [];
    const set = new Set();
    data.groups.forEach(g => g.rows.forEach(r => { if (r.equipmentName) set.add(r.equipmentName); }));
    return [...set].sort();
  }, [data]);

  /** Фильтрация и сортировка всех строк план-графика */
  const allFilteredRows = useMemo(() => {
    if (!data) return [];
    let rows = [];
    data.groups.forEach(g => rows = rows.concat(g.rows));

    if (filterStatus) rows = rows.filter(r => r.status === filterStatus);
    if (filterEquipment) rows = rows.filter(r => r.equipmentName === filterEquipment);
    if (filterRoom) rows = rows.filter(r => r.roomName === filterRoom);
    if (filterWork) rows = rows.filter(r => r.workName === filterWork);
    if (filterFrequency) rows = rows.filter(r => r.frequencyDays === parseInt(filterFrequency));

    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
      const to = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
      rows = rows.filter(r => {
        if (!r.plannedDate) return true;
        const plannedMs = new Date(r.plannedDate).getTime();
        const freq = r.frequencyDays || 30;
        if (plannedMs >= from && plannedMs <= to) return true;
        if (plannedMs < from && freq > 0) {
          const diffDays = Math.floor((from - plannedMs) / 86400000);
          const periodsForward = Math.ceil(diffDays / freq);
          const nextOccurrence = plannedMs + periodsForward * freq * 86400000;
          return nextOccurrence <= to;
        }
        return false;
      });
    }

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.equipmentName.toLowerCase().includes(s) ||
        r.workName.toLowerCase().includes(s) ||
        r.employeeName.toLowerCase().includes(s) ||
        r.roomName.toLowerCase().includes(s) ||
        r.inventoryNumber.toLowerCase().includes(s)
      );
    }

    rows.sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (sortField === 'plannedDate' || sortField === 'lastCompleted') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else if (sortField === 'frequencyDays') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [data, filterStatus, filterEquipment, filterRoom, filterWork, filterFrequency, dateFrom, dateTo, search, sortField, sortDir]);

  /** Группировка отфильтрованных строк */
  const filteredGroups = useMemo(() => {
    if (!data) return [];
    const rowSet = new Set(allFilteredRows.map(r => r.id));
    return data.groups.map(group => {
      let rows = group.rows.filter(r => rowSet.has(r.id));
      return { ...group, rows };
    }).filter(g => g.rows.length > 0);
  }, [data, allFilteredRows]);

  /** Подготовка данных для Gantt-диаграммы */
  const chartData = useMemo(() => {
    let startDate, endDate;
    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      startDate = new Date(today);
      startDate.setDate(1);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + chartMonths);
    }

    const days = [];
    const d = new Date(startDate);
    while (d < endDate) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    const totalDays = days.length;

    const enrichRow = (row) => {
      const completedDays = new Set();
      if (row.lastCompleted) {
        const lc = new Date(row.lastCompleted);
        completedDays.add(formatDateShort(lc.toISOString()));
      }

      const plannedDays = new Set();
      if (row.plannedDate) {
        const pd = new Date(row.plannedDate);
        plannedDays.add(formatDateShort(pd.toISOString()));
      }

      const frequencyDays = row.frequencyDays || 30;
      const todayMs = today.getTime();
      const plannedMs = row.plannedDate ? new Date(row.plannedDate).getTime() : null;

      if (plannedMs && plannedMs < todayMs && frequencyDays > 0) {
        const diffDays = Math.floor((todayMs - plannedMs) / 86400000);
        const periodsBack = Math.floor(diffDays / frequencyDays);
        for (let i = 0; i <= periodsBack + 1; i++) {
          const projDate = addDays(new Date(row.plannedDate), i * frequencyDays);
          if (projDate >= startDate && projDate < endDate) {
            plannedDays.add(formatDateShort(projDate.toISOString()));
          }
        }
      }

      if (plannedMs && plannedMs >= todayMs && frequencyDays > 0) {
        for (let i = 0; i < totalDays + frequencyDays; i++) {
          const projDate = addDays(new Date(row.plannedDate), i * frequencyDays);
          if (projDate >= startDate && projDate < endDate) {
            plannedDays.add(formatDateShort(projDate.toISOString()));
          }
        }
      }

      if (!plannedMs && frequencyDays > 0) {
        for (let i = 0; i < totalDays + frequencyDays; i++) {
          const projDate = addDays(today, i * frequencyDays);
          if (projDate >= startDate && projDate < endDate) {
            plannedDays.add(formatDateShort(projDate.toISOString()));
          }
        }
      }

      return { ...row, completedDays, plannedDays };
    };

    const enrichedRows = allFilteredRows.map(enrichRow);

    const equipmentMap = new Map();
    enrichedRows.forEach(row => {
      const key = row.equipmentName || '';
      if (!equipmentMap.has(key)) {
        equipmentMap.set(key, { equipmentName: key, equipmentId: row.equipmentId, works: [] });
      }
      equipmentMap.get(key).works.push(row);
    });

    const equipmentGroups = [...equipmentMap.values()];

    const months = [];
    const seen = new Set();
    days.forEach(day => {
      const key = `${day.getFullYear()}-${day.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        const year = day.getFullYear();
        const month = day.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInThisRange = days.filter(d => d.getFullYear() === year && d.getMonth() === month).length;
        months.push({
          label: `${MONTHS_RU[month]} ${year}`,
          key: `${year}-${String(month + 1).padStart(2, '0')}`,
          year,
          month,
          daysInMonth,
          daysInThisRange,
        });
      }
    });

    return { days, months, equipmentGroups, startDate, endDate, totalDays };
  }, [allFilteredRows, chartMonths, dateFrom, dateTo]);

  /** Переключение сортировки */
  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortClass = (field) => {
    if (sortField !== field) return 'sortable';
    return `sortable sorted-${sortDir}`;
  };

  /** Переключение свёрнутости группы в таблице */
  const toggleGroup = (idx) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAll = () => setExpandedGroups(new Set(filteredGroups.map((_, i) => i)));
  const collapseAll = () => setExpandedGroups(new Set());

  /** Переключение свёрнутости оборудования на диаграмме */
  const toggleEquipment = (name) => {
    setExpandedEquipment(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const expandAllEquipment = () => setExpandedEquipment(new Set(chartData.equipmentGroups.map(g => g.equipmentName)));
  const collapseAllEquipment = () => setExpandedEquipment(new Set());

  /** Применение быстрого периода (неделя, месяц и т.д.) */
  const applyQuickPeriod = (days, months) => {
    setDateFrom(todayStr());
    setDateTo(dateOffsetStr(days));
    setChartMonths(months);
  };

  /** Сброс всех фильтров */
  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterEquipment('');
    setFilterRoom('');
    setFilterWork('');
    setFilterFrequency('');
    setDateFrom('');
    setDateTo('');
    setChartMonths(6);
  };

  const hasActiveFilters = search || filterStatus || filterEquipment || filterRoom || filterWork || filterFrequency || dateFrom || dateTo;

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="schedule-page">
      <div className="header">
        <h1>План-график ремонтов</h1>
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>План</button>
          <button className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`} onClick={() => setActiveTab('chart')}>График</button>
        </div>
      </div>

      {activeTab === 'plan' && (
        <>
          <div className="filters-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label>Группировка</label>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="employee">По ответственным</option>
                  <option value="month">По месяцам</option>
                  <option value="none">Без группировки</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Статус</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Все</option>
                  <option value="planned">Запланировано</option>
                  <option value="upcoming">Близко</option>
                  <option value="overdue">Просрочено</option>
                  <option value="never">Не выполнялось</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Оборудование</label>
                <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)}>
                  <option value="">Все</option>
                  {uniqueEquipment.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Помещение</label>
                <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
                  <option value="">Все</option>
                  {uniqueRooms.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Работа</label>
                <select value={filterWork} onChange={(e) => setFilterWork(e.target.value)}>
                  <option value="">Все</option>
                  {uniqueWorks.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Периодичность</label>
                <select value={filterFrequency} onChange={(e) => setFilterFrequency(e.target.value)}>
                  <option value="">Все</option>
                  {FREQUENCY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="filter-group-actions">
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn btn-small btn-secondary">Сбросить</button>
                )}
                <button onClick={expandAll} className="btn btn-small">Все</button>
                <button onClick={collapseAll} className="btn btn-small">Свернуть</button>
              </div>
            </div>

            <div className="filter-row compact">
              <div className="filter-group flex-1">
                <input type="text" placeholder="Поиск по оборудованию, работе, сотруднику..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="filter-group">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="От" />
              </div>
              <div className="filter-group">
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="До" />
              </div>
            </div>

            <div className="filter-summary">
              Найдено: <strong>{allFilteredRows.length}</strong> записей
              {hasActiveFilters && <span style={{ color: 'var(--primary)', marginLeft: 8, fontSize: 12 }}>(фильтры активны)</span>}
            </div>
          </div>

          <div className="schedule-table-wrapper">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {COLUMNS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={col.sortable ? sortClass(col.key) : ''}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                {filteredGroups.map((group, gIdx) => (
                  <tbody key={gIdx}>
                    {groupBy !== 'none' && (
                      <tr className="group-header-row" onClick={() => toggleGroup(gIdx)}>
                        <td colSpan={TOTAL_COLS}>
                          <span className={`group-arrow ${expandedGroups.has(gIdx) ? 'expanded' : ''}`}></span>
                          <span className="group-label">{group.label}</span>
                          <span className="group-count">{group.rows.length}</span>
                        </td>
                      </tr>
                    )}
                    {expandedGroups.has(gIdx) && group.rows.map(row => {
                      const st = STATUS_MAP[row.status] || STATUS_MAP.planned;
                      return (
                        <tr key={row.id} className={row.status === 'overdue' || row.status === 'never' ? 'row-overdue' : ''}>
                          <td>
                            <Link to={`/equipment/${row.equipmentId}`} className="table-link">{row.equipmentName}</Link>
                          </td>
                          <td>{row.inventoryNumber}</td>
                          <td>{row.roomName}</td>
                          <td className="td-bold">{row.workName}</td>
                          <td><span className="frequency-badge">{getFrequencyLabel(row.frequencyDays)}</span></td>
                          <td>{row.plannedDate ? new Date(row.plannedDate).toLocaleDateString('ru-RU') : '—'}</td>
                          <td>{row.lastCompleted ? new Date(row.lastCompleted).toLocaleDateString('ru-RU') : '—'}</td>
                          <td><span className={`status-badge ${st.className}`}>{st.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
            {filteredGroups.length === 0 && (
              <div className="no-results">Нет данных для отображения</div>
            )}
          </div>
        </>
      )}

      {activeTab === 'chart' && (
        <>
          <div className="chart-controls">
            <div className="filter-row">
              <div className="filter-group">
                <label>Оборудование</label>
                <select value={filterEquipment} onChange={(e) => setFilterEquipment(e.target.value)}>
                  <option value="">Все</option>
                  {uniqueEquipment.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Помещение</label>
                <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
                  <option value="">Все</option>
                  {uniqueRooms.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Работа</label>
                <select value={filterWork} onChange={(e) => setFilterWork(e.target.value)}>
                  <option value="">Все</option>
                  {uniqueWorks.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Периодичность</label>
                <select value={filterFrequency} onChange={(e) => setFilterFrequency(e.target.value)}>
                  <option value="">Все</option>
                  {FREQUENCY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="filter-group-actions">
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="btn btn-small btn-secondary">Сбросить</button>
                )}
                <button onClick={expandAllEquipment} className="btn btn-small">Все</button>
                <button onClick={collapseAllEquipment} className="btn btn-small">Свернуть</button>
              </div>
            </div>
            <div className="filter-row compact">
              <div className="filter-group flex-1">
                <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="quick-periods">
                {QUICK_PERIODS.map(p => (
                  <button
                    key={p.days}
                    className={`btn btn-small ${(dateFrom && dateTo) ? 'btn-secondary' : ''}`}
                    onClick={() => applyQuickPeriod(p.days, p.months)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="gantt-wrapper">
            <div className="gantt-scroll">
              <table className="gantt-table">
                <thead>
                  <tr>
                    <th className="gantt-label-col">Оборудование / Работа</th>
                    {chartData.months.map(m => (
                      <th key={m.key} className="gantt-month-header" colSpan={m.daysInThisRange}>
                        {m.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="gantt-days-row">
                    <th className="gantt-label-col"></th>
                    {chartData.days.map(day => {
                      const isToday = sameDay(day, today);
                      return (
                        <th key={day.toISOString().slice(0, 10)} className={`gantt-day-cell ${isToday ? 'today' : ''}`}>
                          {day.getDate()}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {chartData.equipmentGroups.map(group => {
                    const isExpanded = expandedEquipment.has(group.equipmentName);
                    return [
                      <tr key={`eq-${group.equipmentName}`} className={`gantt-equipment-row ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleEquipment(group.equipmentName)}>
                        <td className="gantt-label-cell gantt-equipment-cell">
                          <div className="gantt-equipment-content">
                            <svg className={`gantt-chevron ${isExpanded ? 'rotated' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div className="gantt-equipment-text">
                              <div className="gantt-label-main">{group.equipmentName}</div>
                              <div className="gantt-label-sub">{group.works.length} {group.works.length === 1 ? 'работа' : 'работ'}</div>
                            </div>
                          </div>
                        </td>
                        {chartData.days.map(day => <td key={day.toISOString().slice(0, 10)} className="gantt-cell"></td>)}
                      </tr>,
                      isExpanded && group.works.map(row => (
                        <tr key={`work-${row.id}`} className="gantt-work-row">
                          <td className="gantt-label-cell gantt-work-cell">
                            <div className="gantt-work-content">
                              <div className="gantt-label-sub">{row.workName}</div>
                            </div>
                          </td>
                          {chartData.days.map(day => {
                            const dateKey = formatDateShort(day.toISOString());
                            const isCompleted = row.completedDays.has(dateKey);
                            const isPlanned = row.plannedDays.has(dateKey);
                            const isToday = sameDay(day, today);
                            const dow = day.getDay();
                            const isWeekend = dow === 0 || dow === 6;

                            let cellClass = 'gantt-cell';
                            if (isCompleted) cellClass += ' completed';
                            else if (isPlanned) cellClass += ' planned';
                            if (isToday) cellClass += ' today-col';
                            if (isWeekend) cellClass += ' weekend';

                            return <td key={day.toISOString().slice(0, 10)} className={cellClass} title={isCompleted ? 'Выполнено' : isPlanned ? 'Запланировано' : ''}></td>;
                          })}
                        </tr>
                      )),
                    ].filter(Boolean);
                  })}
                </tbody>
              </table>
            </div>
            {chartData.equipmentGroups.length === 0 && (
              <div className="no-results">Нет данных для отображения</div>
            )}
            <div className="gantt-legend">
              <span className="legend-item"><span className="legend-dot completed"></span> Выполнено</span>
              <span className="legend-item"><span className="legend-dot planned"></span> Запланировано</span>
              <span className="legend-item"><span className="legend-dot today"></span> Сегодня</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SchedulePage;
