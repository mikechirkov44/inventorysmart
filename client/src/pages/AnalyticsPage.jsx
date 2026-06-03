import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/api';
import { sparePartsAPI } from '../services/api';

function PerformanceChart({ data }) {
  const [animated, setAnimated] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
                <span className="perf-position">{emp.position || ''}</span>
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

function StockReport() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { fetchItems(); }, []);

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

  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const empty = items.filter(i => (i.quantity || 0) === 0).length;
    const low = items.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.minStock || 0)).length;
    const ok = items.filter(i => (i.quantity || 0) > (i.minStock || 0)).length;
    return { total, empty, low, ok };
  }, [items]);

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

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
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Все</option>
            <option value="ok">В норме</option>
            <option value="low">Мало</option>
            <option value="empty">Нет на складе</option>
          </select>
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {items.length}</div>
      </div>

      <div className="table-container">
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
    </>
  );
}

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('employees');

  useEffect(() => {
    Promise.all([api.get('/analytics'), api.get('/analytics/summary')])
      .then(([a, s]) => { setAnalytics(a.data); setSummary(s.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="analytics-page">
      <div className="header">
        <h1>Аналитика</h1>
        <div className="header-actions">
          <button onClick={() => setView('employees')} className={`btn ${view === 'employees' ? 'btn-primary' : ''}`}>Сотрудники</button>
          <button onClick={() => setView('stock')} className={`btn ${view === 'stock' ? 'btn-primary' : ''}`}>ЗИП</button>
        </div>
      </div>

      {view === 'stock' ? (
        <StockReport />
      ) : (
        <>
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

          <div className="table-container">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th>Должность</th>
                    <th>Запланировано</th>
                    <th>Выполнено</th>
                    <th>% выполнения</th>
                    <th>Вовремя</th>
                    <th>С опозданием</th>
                    <th>Не выполнялось</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.length === 0 ? (
                    <tr><td colSpan="8" className="no-results-cell">Нет данных</td></tr>
                  ) : (
                    analytics.map(emp => (
                      <tr key={emp.employeeId}>
                        <td className="td-bold">{emp.employeeName}</td>
                        <td>{emp.position || '—'}</td>
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
                        <td><span className="overdue-badge ok">{emp.onTime}</span></td>
                        <td><span className="overdue-badge overdue">{emp.overdue}</span></td>
                        <td><span className="overdue-badge new">{emp.neverCompleted}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsPage;
