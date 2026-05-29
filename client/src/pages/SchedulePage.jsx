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

function SchedulePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState('employee');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());

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

  const filteredGroups = useMemo(() => {
    if (!data) return [];
    return data.groups.map(group => {
      let rows = group.rows;
      if (filterStatus) rows = rows.filter(r => r.status === filterStatus);
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(r =>
          r.equipmentName.toLowerCase().includes(s) ||
          r.workName.toLowerCase().includes(s) ||
          r.employeeName.toLowerCase().includes(s) ||
          r.roomName.toLowerCase().includes(s)
        );
      }
      return { ...group, rows };
    }).filter(g => g.rows.length > 0);
  }, [data, filterStatus, search]);

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

  if (loading) return <div className="loading">Загрузка...</div>;

  const firstColLabel = { employee: 'ФИО / Оборудование', month: 'Месяц / Оборудование', none: 'Оборудование' };

  return (
    <div className="schedule-page">
      <div className="header">
        <h1>План-график ремонтов</h1>
        <Link to="/calendar" className="btn">Календарь</Link>
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
            <button onClick={expandAll} className="btn btn-small">Развернуть</button>
            <button onClick={collapseAll} className="btn btn-small">Свернуть</button>
          </div>
        </div>
        <div className="filter-summary">
          Найдено: <strong>{filteredGroups.reduce((s, g) => s + g.rows.length, 0)}</strong> записей
        </div>
      </div>

      <div className="schedule-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>{firstColLabel[groupBy]}</th>
              <th>Инв. номер</th>
              <th>Помещение</th>
              <th>Работа</th>
              <th>Периодичность</th>
              <th>План. дата</th>
              <th>Последн. выполнение</th>
              <th>Статус</th>
            </tr>
          </thead>
          {filteredGroups.map((group, gIdx) => (
            <tbody key={gIdx}>
              <tr className="group-header-row" onClick={() => toggleGroup(gIdx)}>
                <td colSpan="8">
                  <span className={`group-arrow ${expandedGroups.has(gIdx) ? 'expanded' : ''}`}></span>
                  <span className="group-label">{group.label}</span>
                </td>
              </tr>
              {expandedGroups.has(gIdx) && group.rows.map(row => {
                const st = STATUS_MAP[row.status] || STATUS_MAP.planned;
                return (
                  <tr key={row.id} className={row.status === 'overdue' || row.status === 'never' ? 'row-warning' : ''}>
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
        {filteredGroups.length === 0 && (
          <div className="no-results">Нет данных для отображения</div>
        )}
      </div>
    </div>
  );
}

export default SchedulePage;
