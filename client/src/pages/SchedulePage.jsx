import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

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
  { label: 'Текущая неделя', days: 7 },
  { label: 'Текущий месяц', days: 30 },
  { label: 'Текущий квартал', days: 90 },
  { label: 'Текущий год', days: 365 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function SchedulePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('employee');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const [sortField, setSortField] = useState('plannedDate');
  const [sortDir, setSortDir] = useState('asc');

  const [filterEquipment, setFilterEquipment] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterWork, setFilterWork] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchSchedule(); }, [groupBy]);

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

  const allFilteredRows = useMemo(() => {
    if (!data) return [];
    let rows = [];
    data.groups.forEach(g => rows = rows.concat(g.rows));

    if (filterStatus) rows = rows.filter(r => r.status === filterStatus);
    if (filterEquipment) rows = rows.filter(r => r.equipmentName === filterEquipment);
    if (filterRoom) rows = rows.filter(r => r.roomName === filterRoom);
    if (filterWork) rows = rows.filter(r => r.workName === filterWork);
    if (filterFrequency) rows = rows.filter(r => r.frequencyDays === parseInt(filterFrequency));

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      rows = rows.filter(r => r.plannedDate && new Date(r.plannedDate).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      rows = rows.filter(r => r.plannedDate && new Date(r.plannedDate).getTime() <= to);
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

  const filteredGroups = useMemo(() => {
    if (!data) return [];
    const rowSet = new Set(allFilteredRows.map(r => r.id));
    return data.groups.map(group => {
      let rows = group.rows.filter(r => rowSet.has(r.id));
      return { ...group, rows };
    }).filter(g => g.rows.length > 0);
  }, [data, allFilteredRows]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortClass = (field) => {
    if (sortField !== field) return 'sortable';
    return `sortable sorted-${sortDir}`;
  };

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

  const applyQuickPeriod = (days) => {
    setDateFrom(todayStr());
    setDateTo(dateOffsetStr(days));
  };

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterEquipment('');
    setFilterRoom('');
    setFilterWork('');
    setFilterFrequency('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = search || filterStatus || filterEquipment || filterRoom || filterWork || filterFrequency || dateFrom || dateTo;

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="schedule-page">
      <div className="header">
        <h1>План-график ремонтов</h1>
      </div>

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
          <div className="filter-group flex-1">
            <label>Поиск</label>
            <input type="text" placeholder="Оборудование, работа, сотрудник..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-group-actions">
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn btn-small btn-secondary">Сбросить фильтры</button>
            )}
            <button onClick={expandAll} className="btn btn-small">Развернуть</button>
            <button onClick={collapseAll} className="btn btn-small">Свернуть</button>
          </div>
        </div>

        <div className="filter-row" style={{ marginTop: '10px' }}>
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
        </div>

        <div className="filter-row" style={{ marginTop: '10px' }}>
          <div className="filter-group">
            <label>Период с</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Период по</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Быстрый выбор</label>
            <div className="quick-periods">
              {QUICK_PERIODS.map(p => (
                <button
                  key={p.days}
                  className={`btn btn-small ${dateFrom && dateTo ? 'btn-secondary' : ''}`}
                  onClick={() => applyQuickPeriod(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>
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
                    <tr key={row.id} className={row.status === 'overdue' || row.status === 'never' ? 'row-warning' : ''}>
                      <td>
                        {groupBy !== 'none' && <div className="td-group-label">{group.label}</div>}
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
    </div>
  );
}

export default SchedulePage;
