import { useState, useEffect } from 'react';
import api from '../services/api';

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [view, setView] = useState('cards');

  useEffect(() => {
    Promise.all([api.get('/analytics'), api.get('/analytics/summary')])
      .then(([a, s]) => { setAnalytics(a.data); setSummary(s.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="analytics-page">
      <div className="header">
        <h1>Аналитика выполнения работ</h1>
        <div className="header-actions">
          <button onClick={() => setView('cards')} className={`btn ${view === 'cards' ? 'btn-primary' : ''}`}>Карточки</button>
          <button onClick={() => setView('table')} className={`btn ${view === 'table' ? 'btn-primary' : ''}`}>Таблица</button>
        </div>
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

      {view === 'cards' ? (
        <div className="analytics-content">
          <div className="analytics-sidebar">
            <h3>Сотрудники</h3>
            <div className="employee-list">
              {analytics.map(emp => (
                <div
                  key={emp.employeeId}
                  className={`employee-item ${selectedEmployee === emp.employeeId ? 'active' : ''}`}
                  onClick={() => setSelectedEmployee(selectedEmployee === emp.employeeId ? null : emp.employeeId)}
                >
                  <div className="emp-name">{emp.employeeName}</div>
                  <div className="emp-stats">
                    <span className="emp-rate">{emp.completionRate}%</span>
                    <span className="emp-done">{emp.totalCompleted}/{emp.totalPlanned}</span>
                  </div>
                  <div className="emp-bar">
                    <div className="emp-bar-fill" style={{ width: `${emp.completionRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-main">
            {selectedEmployee ? (
              <EmployeeDetail employee={analytics.find(e => e.employeeId === selectedEmployee)} />
            ) : (
              <div className="analytics-placeholder">
                <p>Выберите сотрудника для подробного отчёта</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
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
                  <tr key={emp.employeeId} className="clickable-row" onClick={() => { setView('cards'); setSelectedEmployee(emp.employeeId); }}>
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
      )}
    </div>
  );
}

function EmployeeDetail({ employee }) {
  const [expanded, setExpanded] = useState(null);

  if (!employee) return null;

  return (
    <div className="employee-detail">
      <h2>{employee.employeeName}</h2>
      <p className="emp-position">{employee.position}</p>

      <div className="detail-stats-row">
        <div className="detail-stat">
          <span className="detail-stat-value">{employee.totalPlanned}</span>
          <span className="detail-stat-label">Запланировано</span>
        </div>
        <div className="detail-stat success">
          <span className="detail-stat-value">{employee.totalCompleted}</span>
          <span className="detail-stat-label">Выполнено</span>
        </div>
        <div className="detail-stat ok">
          <span className="detail-stat-value">{employee.onTime}</span>
          <span className="detail-stat-label">Вовремя</span>
        </div>
        <div className="detail-stat danger">
          <span className="detail-stat-value">{employee.overdue}</span>
          <span className="detail-stat-label">С опозданием</span>
        </div>
      </div>

      <div className="equipment-reports">
        {employee.equipment.map(eq => (
          <div key={eq.equipmentId} className="equipment-report-card">
            <div className="eq-report-header" onClick={() => setExpanded(expanded === eq.equipmentId ? null : eq.equipmentId)}>
              <span className="eq-report-name">{eq.equipmentName}</span>
              <span className="eq-report-inv">{eq.inventoryNumber}</span>
              <span className="eq-report-arrow">{expanded === eq.equipmentId ? '▲' : '▼'}</span>
            </div>
            {expanded === eq.equipmentId && (
              <div className="eq-report-tasks">
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Работа</th>
                      <th>Период</th>
                      <th>План</th>
                      <th>Факт</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eq.tasks.map(task => (
                      <tr key={task.workId}>
                        <td>{task.workName}</td>
                        <td>каждые {task.frequencyDays} дн.</td>
                        <td>{task.plannedDate ? new Date(task.plannedDate).toLocaleDateString('ru-RU') : '—'}</td>
                        <td>{task.lastCompleted ? new Date(task.lastCompleted).toLocaleDateString('ru-RU') : '—'}</td>
                        <td>
                          {task.completedCount === 0 ? (
                            <span className="overdue-badge new">не выполнялось</span>
                          ) : task.daysDiff !== null && task.daysDiff > 0 ? (
                            <span className="overdue-badge overdue">+{task.daysDiff} дн. опоздание</span>
                          ) : task.daysDiff !== null && task.daysDiff <= 0 ? (
                            <span className="overdue-badge ok">{task.daysDiff === 0 ? 'вовремя' : `${Math.abs(task.daysDiff)} дн. раньше`}</span>
                          ) : (
                            <span className="overdue-badge ok">выполнено</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {employee.equipment.length === 0 && (
          <div className="no-data">Нет привязанного оборудования</div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
