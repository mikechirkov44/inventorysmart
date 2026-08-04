/**
 * @fileoverview Страница аналитики.
 * Отображает статистику выполнения работ по сотрудникам,
 * диаграмму эффективности и отчёт по остаткам ЗИП.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart3, Wrench } from 'lucide-react';
import { analyticsAPI, sparePartsAPI, equipmentAPI, incidentsAPI, roomsAPI, companyAPI } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import { formatDate, toDateInputValue } from '../utils/date';
import PageHeader from '../components/PageHeader';
import { SkeletonTable, SkeletonPage } from '../components/Skeleton';
import {
  MobileDataCards, MobileDataCard, MobileDataCardTitle, MobileDataCardRow,
} from '../components/MobileDataCard';

const ANALYTICS_QUICK_PERIODS = [
  { label: 'Текущий месяц', monthsOffset: 0 },
  { label: 'Прошлый месяц', monthsOffset: -1 },
  { label: '7 дней', days: 7 },
];

function getMonthRange(monthsOffset = 0) {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() + monthsOffset, 1);
  const to = new Date(today.getFullYear(), today.getMonth() + monthsOffset + 1, 0);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function getLastDaysRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

/** Компонент горизонтальной диаграммы эффективности сотрудников */
function PerformanceChart({ data }) {
  const [animated, setAnimated] = useState(false);
  const chartRef = useRef(null);

  /** Запуск анимации диаграммы после монтирования */
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  /** Сортировка сотрудников по проценту выполнения */
  const sorted = [...data]
    .filter(e => e.totalPlanned > 0)
    .sort((a, b) => b.completionRate - a.completionRate);

  if (sorted.length === 0) return null;

  const maxRate = 100;

  return (
    <div className="perf-chart" ref={chartRef}>
      <div className="perf-chart-header">
        <h3>Процент выполнения по сотрудникам</h3>
        <div className="perf-chart-legend">
          <span className="legend-item"><span className="legend-dot good" /> ≥ 80%</span>
          <span className="legend-item"><span className="legend-dot warn" /> 50–79%</span>
          <span className="legend-item"><span className="legend-dot bad" /> &lt; 50%</span>
        </div>
      </div>
      <div className="perf-chart-body">
        {sorted.map((emp) => {
          const rate = emp.completionRate;
          const color = rate >= 80 ? 'good' : rate >= 50 ? 'warn' : 'bad';
          return (
            <div key={emp.employeeId} className="perf-row">
              <div className="perf-label" title={emp.employeeName}>
                <span className="perf-name">{emp.employeeName}</span>
                <span className="perf-position">{emp.jobTitle || ''}</span>
              </div>
              <div className="perf-bar-track">
                <div
                  className={`perf-bar-fill ${color} ${animated ? 'animated' : ''}`}
                  style={{ width: animated ? `${(rate / maxRate) * 100}%` : '0%' }}
                />
              </div>
              <div className="perf-counts">
                <span className={`perf-rate ${color}`}>{rate}%</span>
                <span className="perf-done">{emp.totalCompleted}</span>
                <span className="perf-sep">/</span>
                <span className="perf-total">{emp.totalPlanned}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Компонент отчёта по остаткам ЗИП на складе */
function StockReport() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  /** Загрузка всех позиций ЗИП */
  useEffect(() => { fetchItems(); }, []);

  /** Загрузка данных остатков с сервера */
  const fetchItems = async () => {
    try {
      const res = await sparePartsAPI.getAll();
      setItems(res.data);
      setLoading(false);
    } catch {
      setError('Ошибка загрузки');
      setLoading(false);
    }
  };

  /** Фильтрация позиций по поиску и статусу остатков */
  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(s) ||
        (i.article && i.article.toLowerCase().includes(s)) ||
        (i.manufacturer && i.manufacturer.toLowerCase().includes(s))
      );
    }
    if (filterStatus === 'ok') result = result.filter(i => (i.quantity || 0) > (i.minStock || 0));
    else if (filterStatus === 'low') result = result.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.minStock || 0));
    else if (filterStatus === 'empty') result = result.filter(i => (i.quantity || 0) === 0);
    return result;
  }, [items, search, filterStatus]);

  /** Расчёт сводной статистики остатков */
  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const empty = items.filter(i => (i.quantity || 0) === 0).length;
    const low = items.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.minStock || 0)).length;
    const ok = items.filter(i => (i.quantity || 0) > (i.minStock || 0)).length;
    return { total, empty, low, ok };
  }, [items]);

  if (loading) return <SkeletonTable rows={6} cols={6} />;

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="analytics-summary" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0, flex: 1 }}>
          <div className="summary-card success">
            <div className="summary-value">{stats.ok}</div>
            <div className="summary-label">В норме</div>
          </div>
          <div className="summary-card" style={{ borderTopColor: 'var(--warning)' }}>
            <div className="summary-value" style={{ color: 'var(--warning)' }}>{stats.low}</div>
            <div className="summary-label">Мало</div>
          </div>
          <div className="summary-card danger">
            <div className="summary-value">{stats.empty}</div>
            <div className="summary-label">Нет на складе</div>
          </div>
          <div className="summary-card primary">
            <div className="summary-value">{stats.total}</div>
            <div className="summary-label">Всего единиц</div>
          </div>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по наименованию, артикулу..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <CustomSelect value={filterStatus} onChange={setFilterStatus} placeholder="Все" options={[
            { value: '', label: 'Все' },
            { value: 'ok', label: 'В норме' },
            { value: 'low', label: 'Мало' },
            { value: 'empty', label: 'Нет на складе' }
          ]} />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {items.length}</div>
      </div>

      <div className="table-container desktop-table-only">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Артикул</th>
                <th>Производитель</th>
                <th>На складе</th>
                <th>Мин. запас</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="no-results-cell">Позиции не найдены</td></tr>
              ) : (
                filtered.map(item => {
                  const qty = item.quantity || 0;
                  const min = item.minStock || 0;
                  const status = qty === 0 ? 'empty' : qty <= min ? 'low' : 'ok';
                  const statusLabel = qty === 0 ? 'Нет' : qty <= min ? 'Мало' : 'В норме';
                  return (
                    <tr key={item.id} className={status === 'empty' ? 'row-warning' : ''}>
                      <td className="td-bold">{item.name}</td>
                      <td>{item.article || '—'}</td>
                      <td>{item.manufacturer || '—'}</td>
                      <td><span className={`sp-quantity ${status}`}>{qty}</span></td>
                      <td>{min}</td>
                      <td>
                        <span className={`overdue-badge ${status === 'ok' ? 'ok' : status === 'low' ? 'new' : 'overdue'}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <MobileDataCards empty={filtered.length === 0} emptyMessage="Позиции не найдены">
        {filtered.map((item) => {
          const qty = item.quantity || 0;
          const min = item.minStock || 0;
          const status = qty === 0 ? 'empty' : qty <= min ? 'low' : 'ok';
          const statusLabel = qty === 0 ? 'Нет' : qty <= min ? 'Мало' : 'В норме';
          return (
            <MobileDataCard key={item.id}>
              <MobileDataCardTitle>{item.name}</MobileDataCardTitle>
              <MobileDataCardRow label="Артикул">{item.article || '—'}</MobileDataCardRow>
              <MobileDataCardRow label="На складе">{qty}</MobileDataCardRow>
              <MobileDataCardRow label="Статус">{statusLabel}</MobileDataCardRow>
            </MobileDataCard>
          );
        })}
      </MobileDataCards>
    </>
  );
}

/** Компонент отчёта по оборудованию и инцидентам */
function EquipmentReport() {
  const [equipment, setEquipment] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRoom, setFilterRoom] = useState('');

  /** Загрузка оборудования, инцидентов и помещений */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eqRes, incRes, roomRes] = await Promise.all([
          equipmentAPI.getAll(),
          incidentsAPI.getAll(),
          roomsAPI.getAll()
        ]);
        setEquipment(eqRes.data);
        setIncidents(incRes.data);
        setRooms(roomRes.data);
        setLoading(false);
      } catch {
        setError('Ошибка загрузки данных');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /** Словарь помещений */
  const roomMap = useMemo(() => {
    const m = {};
    rooms.forEach(r => { m[r.id] = r.name; });
    return m;
  }, [rooms]);

  /** Подсчёт инцидентов по оборудованию */
  const incidentCountByEquipment = useMemo(() => {
    const counts = {};
    incidents.forEach(inc => {
      if (inc.equipmentId) {
        counts[inc.equipmentId] = (counts[inc.equipmentId] || 0) + 1;
      }
    });
    return counts;
  }, [incidents]);

  /** Уникальные категории */
  const categories = useMemo(() => {
    return [...new Set(equipment.map(e => e.category).filter(Boolean))].sort();
  }, [equipment]);

  /** Фильтрация оборудования */
  const filtered = useMemo(() => {
    let result = [...equipment];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(s) ||
        (e.inventoryNumber && e.inventoryNumber.toLowerCase().includes(s))
      );
    }
    if (filterCategory) result = result.filter(e => e.category === filterCategory);
    if (filterStatus) result = result.filter(e => e.status === filterStatus);
    if (filterRoom) result = result.filter(e => e.roomId === filterRoom);
    return result;
  }, [equipment, search, filterCategory, filterStatus, filterRoom]);

  /** Статистика */
  const stats = useMemo(() => {
    const total = equipment.length;
    const withIncidents = equipment.filter(e => (incidentCountByEquipment[e.id] || 0) > 0).length;
    const totalIncidents = incidents.length;
    const avgIncidents = total > 0 ? (totalIncidents / total).toFixed(1) : 0;
    return { total, withIncidents, totalIncidents, avgIncidents };
  }, [equipment, incidents, incidentCountByEquipment]);

  if (loading) return <SkeletonTable rows={6} cols={6} />;

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div className="analytics-summary" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        <div className="summary-card primary">
          <div className="summary-value">{stats.total}</div>
          <div className="summary-label">Всего единиц</div>
        </div>
        <div className="summary-card danger">
          <div className="summary-value">{stats.withIncidents}</div>
          <div className="summary-label">С инцидентами</div>
        </div>
        <div className="summary-card warning">
          <div className="summary-value">{stats.totalIncidents}</div>
          <div className="summary-label">Всего инцидентов</div>
        </div>
        <div className="summary-card muted">
          <div className="summary-value">{stats.avgIncidents}</div>
          <div className="summary-label">Среднее на единицу</div>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по наименованию, инв. номеру..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <CustomSelect value={filterCategory} onChange={setFilterCategory} placeholder="Все категории" options={categories.map(c => ({ value: c, label: c }))} />
          <CustomSelect value={filterStatus} onChange={setFilterStatus} placeholder="Все статусы" options={[
            { value: 'working', label: 'Работает' },
            { value: 'under_repair', label: 'В ремонте' },
            { value: 'needs_repair', label: 'Требует ремонта' }
          ]} />
          <CustomSelect value={filterRoom} onChange={setFilterRoom} placeholder="Все помещения" options={rooms.map(r => ({ value: r.id, label: r.name }))} />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {equipment.length}</div>
      </div>

      <div className="table-container desktop-table-only">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Инв. номер</th>
                <th>Категория</th>
                <th>Помещение</th>
                <th>Статус</th>
                <th>Инциденты</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="no-results-cell">Оборудование не найдено</td></tr>
              ) : (
                filtered.map(item => {
                  const incCount = incidentCountByEquipment[item.id] || 0;
                  const statusMap = {
                    working: { label: 'Работает', className: 'status-working' },
                    under_repair: { label: 'В ремонте', className: 'status-under-repair' },
                    needs_repair: { label: 'Требует ремонта', className: 'status-needs-repair' }
                  };
                  const st = statusMap[item.status] || statusMap.working;
                  return (
                    <tr key={item.id}>
                      <td className="td-bold">{item.name}</td>
                      <td>{item.inventoryNumber || '—'}</td>
                      <td>{item.category || '—'}</td>
                      <td>{roomMap[item.roomId] || '—'}</td>
                      <td><span className={`status-badge ${st.className}`}>{st.label}</span></td>
                      <td>
                        {incCount > 0 ? (
                          <span className={`overdue-badge ${incCount >= 3 ? 'overdue' : incCount >= 1 ? 'new' : 'ok'}`}>
                            {incCount}
                          </span>
                        ) : (
                          <span className="td-muted">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <MobileDataCards empty={filtered.length === 0} emptyMessage="Оборудование не найдено">
        {filtered.map((item) => {
          const incCount = incidentCountByEquipment[item.id] || 0;
          const statusMap = {
            working: 'Работает',
            under_repair: 'В ремонте',
            needs_repair: 'Требует ремонта',
          };
          return (
            <MobileDataCard key={item.id}>
              <MobileDataCardTitle>{item.name}</MobileDataCardTitle>
              <MobileDataCardRow label="Инв. №">{item.inventoryNumber || '—'}</MobileDataCardRow>
              <MobileDataCardRow label="Помещение">{roomMap[item.roomId] || '—'}</MobileDataCardRow>
              <MobileDataCardRow label="Статус">{statusMap[item.status] || 'Работает'}</MobileDataCardRow>
              <MobileDataCardRow label="Инциденты">{incCount}</MobileDataCardRow>
            </MobileDataCard>
          );
        })}
      </MobileDataCards>
    </>
  );
}

/** Горизонтальная диаграмма по количеству */
function CountBarChart({ title, data, nameKey = 'name' }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="perf-chart perf-chart--full-labels">
      <div className="perf-chart-header">
        <h3>{title}</h3>
      </div>
      <div className="perf-chart-body">
        {data.slice(0, 10).map((item) => (
          <div key={item.id || item[nameKey]} className="perf-row">
            <div className="perf-label" title={item[nameKey]}>
              <span className="perf-name">{item[nameKey]}</span>
            </div>
            <div className="perf-bar-track">
              <div
                className={`perf-bar-fill warn ${animated ? 'animated' : ''}`}
                style={{ width: animated ? `${(item.count / max) * 100}%` : '0%' }}
              />
            </div>
            <div className="perf-counts">
              <span className="perf-done">{item.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Аналитика по инцидентам и RCA */
function IncidentsReport({ dateFrom, dateTo, onDateFromChange, onDateToChange, onQuickPeriod }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useRca, setUseRca] = useState(true);

  useEffect(() => {
    companyAPI.get()
      .then((res) => setUseRca(res.data.useRca !== false))
      .catch(() => setUseRca(true));
  }, []);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    analyticsAPI.getIncidents({ from: dateFrom, to: dateTo })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Ошибка загрузки');
        setLoading(false);
      });
  }, [dateFrom, dateTo]);

  if (loading) return <SkeletonPage />;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const { summary, byCause, byCommonFault, byEquipment, period } = data;

  return (
    <>
      <div className="analytics-period-toolbar">
        <div className="filter-row compact">
          <div className="filter-group">
            <CustomDatePicker value={dateFrom} onChange={onDateFromChange} placeholder="От" />
          </div>
          <div className="filter-group">
            <CustomDatePicker value={dateTo} onChange={onDateToChange} placeholder="До" />
          </div>
          <div className="quick-periods">
            {ANALYTICS_QUICK_PERIODS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="btn btn-small btn-secondary"
                onClick={() => onQuickPeriod(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        {period && (
          <p className="analytics-period-label">
            Отчёт за {formatDate(period.from)} — {formatDate(period.to)}
          </p>
        )}
      </div>

      <div className="analytics-summary" style={{ gridTemplateColumns: useRca ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', marginBottom: 16 }}>
        <div className="summary-card primary">
          <div className="summary-value">{summary.total}</div>
          <div className="summary-label">Всего инцидентов</div>
        </div>
        {useRca && (
          <div className="summary-card danger">
            <div className="summary-value">{summary.investigating + summary.rca_done}</div>
            <div className="summary-label">RCA в работе</div>
          </div>
        )}
        <div className="summary-card">
          <div className="summary-value">{summary.mttrHours != null ? `${summary.mttrHours} ч` : '—'}</div>
          <div className="summary-label">MTTR (среднее)</div>
        </div>
        <div className="summary-card" style={{ borderTopColor: 'var(--warning)' }}>
          <div className="summary-value" style={{ color: 'var(--warning)' }}>{summary.recurrenceRate}%</div>
          <div className="summary-label">Повторяемость (90 дн.)</div>
        </div>
      </div>

      <div className="analytics-summary" style={{ gridTemplateColumns: useRca ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', marginBottom: 24 }}>
        <div className="summary-card success">
          <div className="summary-value">{summary.resolved}</div>
          <div className="summary-label">Решено</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{summary.new + summary.in_progress}</div>
          <div className="summary-label">Открытые</div>
        </div>
        {useRca && (
          <>
            <div className="summary-card">
              <div className="summary-value">{summary.requiresRca}</div>
              <div className="summary-label">С флагом RCA</div>
            </div>
            <div className="summary-card danger">
              <div className="summary-value">{summary.overdueActions}</div>
              <div className="summary-label">Просроченные мероприятия</div>
            </div>
          </>
        )}
      </div>

      <CountBarChart title="Топ причин возникновения" data={byCause} />
      <CountBarChart title="Топ типовых неисправностей" data={byCommonFault} />

      <div className="table-container desktop-table-only" style={{ marginTop: 24 }}>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Оборудование</th>
                <th>Инв. №</th>
                <th>Инцидентов</th>
              </tr>
            </thead>
            <tbody>
              {byEquipment.length === 0 ? (
                <tr><td colSpan="3" className="no-results-cell">Нет данных</td></tr>
              ) : (
                byEquipment.map((eq) => (
                  <tr key={eq.id}>
                    <td className="td-bold">{eq.name}</td>
                    <td>{eq.inventoryNumber || '—'}</td>
                    <td><span className="overdue-badge new">{eq.count}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** Основной компонент страницы аналитики */
function AnalyticsPage() {
  const initialRange = useMemo(() => getMonthRange(0), []);
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState(initialRange);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('employees');

  const loadAnalytics = useCallback(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    const params = { from: dateFrom, to: dateTo };
    Promise.all([
      analyticsAPI.getAnalytics(params),
      analyticsAPI.getSummary(params),
    ])
      .then(([analyticsResponse, summaryResponse]) => {
        setAnalytics(analyticsResponse.data.employees || []);
        setPeriod(analyticsResponse.data.period || summaryResponse.data.period || params);
        setSummary(summaryResponse.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (view === 'employees') {
      loadAnalytics();
    }
  }, [view, loadAnalytics]);

  const applyQuickPeriod = (preset) => {
    const range = preset.days
      ? getLastDaysRange(preset.days)
      : getMonthRange(preset.monthsOffset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  if (loading && view === 'employees') return <SkeletonPage />;

  return (
    <div className="analytics-page">
      <PageHeader icon={BarChart3} title="Аналитика">
        <button type="button" onClick={() => setView('employees')} className={`btn ${view === 'employees' ? 'btn-primary' : ''}`}>Сотрудники</button>
        <button type="button" onClick={() => setView('incidents')} className={`btn ${view === 'incidents' ? 'btn-primary' : ''}`}>Инциденты</button>
        <button type="button" onClick={() => setView('equipment')} className={`btn ${view === 'equipment' ? 'btn-primary' : ''}`}>Оборудование</button>
        <button type="button" onClick={() => setView('stock')} className={`btn ${view === 'stock' ? 'btn-primary' : ''}`}>ЗИП</button>
      </PageHeader>

      {view === 'stock' ? (
        <StockReport />
      ) : view === 'equipment' ? (
        <EquipmentReport />
      ) : view === 'incidents' ? (
        <IncidentsReport
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onQuickPeriod={applyQuickPeriod}
        />
      ) : (
        <>
          <div className="analytics-period-toolbar">
            <div className="filter-row compact">
              <div className="filter-group">
                <CustomDatePicker value={dateFrom} onChange={setDateFrom} placeholder="От" />
              </div>
              <div className="filter-group">
                <CustomDatePicker value={dateTo} onChange={setDateTo} placeholder="До" />
              </div>
              <div className="quick-periods">
                {ANALYTICS_QUICK_PERIODS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => applyQuickPeriod(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {period && (
              <p className="analytics-period-label">
                Отчёт за {formatDate(period.from)} — {formatDate(period.to)}
              </p>
            )}
          </div>

          {summary && (
            <div className="analytics-summary">
              <div className="summary-card">
                <div className="summary-value">{summary.totalPlanned}</div>
                <div className="summary-label">Запланировано</div>
              </div>
              <div className="summary-card success">
                <div className="summary-value">{summary.totalCompleted}</div>
                <div className="summary-label">Выполнено</div>
              </div>
              <div className="summary-card primary">
                <div className="summary-value">{summary.completionRate}%</div>
                <div className="summary-label">Процент выполнения</div>
              </div>
              <div className="summary-card ok">
                <div className="summary-value">{summary.totalOnTime}</div>
                <div className="summary-label">Вовремя</div>
              </div>
              <div className="summary-card danger">
                <div className="summary-value">{summary.totalOverdue}</div>
                <div className="summary-label">Просрочено</div>
              </div>
              <div className="summary-card muted">
                <div className="summary-value">{summary.totalNever}</div>
                <div className="summary-label">Не выполнялось</div>
              </div>
            </div>
          )}

          <PerformanceChart data={analytics} />

          <div className="table-container desktop-table-only">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th>Должность</th>
                    <th>Запланировано</th>
                    <th>Выполнено</th>
                    <th>% выполнения</th>
                    <th>KPI / премия</th>
                    <th>Вовремя</th>
                    <th>С опозданием</th>
                    <th>Не выполнялось</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.length === 0 ? (
                    <tr><td colSpan="9" className="no-results-cell">Нет данных</td></tr>
                  ) : (
                    analytics.map(emp => (
                      <tr key={emp.employeeId}>
                        <td className="td-bold">{emp.employeeName}</td>
                        <td>{emp.jobTitle || '—'}</td>
                        <td>{emp.totalPlanned}</td>
                        <td>{emp.totalCompleted}</td>
                        <td>
                          <div className="rate-cell">
                            <span className={`rate-value ${emp.completionRate >= 80 ? 'good' : emp.completionRate >= 50 ? 'warn' : 'bad'}`}>
                              {emp.completionRate}%
                            </span>
                            <div className="rate-bar">
                              <div className={`rate-bar-fill ${emp.completionRate >= 80 ? 'good' : emp.completionRate >= 50 ? 'warn' : 'bad'}`} style={{ width: `${emp.completionRate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>{emp.kpi ? <strong>{emp.kpi.score}% / {emp.kpi.payout}%</strong> : '—'}</td>
                        <td><span className="overdue-badge ok">{emp.onTime}</span></td>
                        <td><span className="overdue-badge overdue">{emp.completedLate}</span></td>
                        <td><span className="overdue-badge new">{emp.neverCompleted}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <MobileDataCards empty={analytics.length === 0} emptyMessage="Нет данных">
            {analytics.map((emp) => (
              <MobileDataCard key={emp.employeeId}>
                <MobileDataCardTitle>{emp.employeeName}</MobileDataCardTitle>
                <MobileDataCardRow label="Должность">{emp.jobTitle || '—'}</MobileDataCardRow>
                <MobileDataCardRow label="Выполнено">{emp.totalCompleted} / {emp.totalPlanned}</MobileDataCardRow>
                <MobileDataCardRow label="% выполнения">{emp.completionRate}%</MobileDataCardRow>
                {emp.kpi && <MobileDataCardRow label="KPI / премия">{emp.kpi.score}% / {emp.kpi.payout}%</MobileDataCardRow>}
                <MobileDataCardRow label="Просрочено">{emp.overdue}</MobileDataCardRow>
              </MobileDataCard>
            ))}
          </MobileDataCards>
        </>
      )}
    </div>
  );
}

export default AnalyticsPage;
