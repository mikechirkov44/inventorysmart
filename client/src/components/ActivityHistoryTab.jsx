import { useCallback, useEffect, useState } from 'react';
import { FileClock, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';
import { activityHistoryAPI } from '../services/api';
import { formatDateTime } from '../utils/date';

const ACTION_LABELS = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
};

const RESOURCE_LABELS = {
  equipment: 'Оборудование',
  employees: 'Сотрудники',
  works: 'Работы',
  rooms: 'Помещения',
  'spare-parts': 'Запасные части',
  'work-orders': 'Журнал работ',
  incidents: 'Инциденты',
  positions: 'Роли',
  users: 'Пользователи',
  company: 'Компания',
};

const FAILURE_LABELS = {
  missing_credentials: 'Не заполнены учётные данные',
  missing_company: 'Не указана компания',
  invalid_credentials: 'Неверный логин или пароль',
  no_company: 'Нет привязки к компании',
  company_not_found: 'Компания не найдена',
  invalid_company: 'Неверное название компании',
};

function UserCell({ row }) {
  const name = row.full_name || row.username || 'Удалённый пользователь';
  return (
    <div className="history-user">
      <span className="history-user-avatar">{name.charAt(0).toUpperCase()}</span>
      <span>
        <strong>{name}</strong>
        {row.username && row.full_name && <small>@{row.username}</small>}
      </span>
    </div>
  );
}

export default function ActivityHistoryTab() {
  const [section, setSection] = useState('changes');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = section === 'changes'
        ? await activityHistoryAPI.getChanges()
        : await activityHistoryAPI.getLogins();
      setRows(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  const selectSection = (value) => {
    if (value === section) return;
    setRows([]);
    setSection(value);
  };

  return (
    <div className="settings-section activity-history">
      <div className="history-heading">
        <div>
          <h2 className="settings-section-title">История активности</h2>
          <p className="settings-section-desc">
            Контроль изменений в системе и попыток входа сотрудников.
          </p>
        </div>
        <div className="history-heading-icon" aria-hidden="true"><ShieldCheck size={24} /></div>
      </div>

      <div className="settings-card history-card">
        <div className="history-toolbar">
          <div className="history-segmented" role="tablist" aria-label="Раздел истории">
            <button
              type="button"
              role="tab"
              aria-selected={section === 'changes'}
              className={section === 'changes' ? 'active' : ''}
              onClick={() => selectSection('changes')}
            >
              <FileClock size={16} /> Изменения
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'logins'}
              className={section === 'logins' ? 'active' : ''}
              onClick={() => selectSection('logins')}
            >
              <LogIn size={16} /> Входы сотрудников
            </button>
          </div>
          <button type="button" className="btn btn-secondary history-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Обновить
          </button>
        </div>

        <div className="history-table-meta">
          <span>{section === 'changes' ? 'Последние изменения' : 'Последние попытки входа'}</span>
          {!loading && !error && <span className="history-count">Записей: {rows.length}</span>}
        </div>

        {error && <div className="error-message history-error">{error}</div>}

        <div className="table-container history-table-container">
          <table className="data-table history-table">
            <thead>
              {section === 'changes' ? (
                <tr><th>Дата и время</th><th>Сотрудник</th><th>Действие</th><th>Раздел</th><th>IP-адрес</th></tr>
              ) : (
                <tr><th>Дата и время</th><th>Сотрудник</th><th>Результат</th><th>IP-адрес</th><th>Устройство</th></tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="history-state-cell" colSpan="5"><RefreshCw size={20} className="spin" /> Загрузка истории…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="history-state-cell" colSpan="5"><FileClock size={24} /><strong>Записей пока нет</strong><span>Новые события появятся здесь автоматически.</span></td></tr>
              ) : rows.map((row) => section === 'changes' ? (
                <tr key={row.id}>
                  <td className="history-date">{formatDateTime(row.created_at)}</td>
                  <td><UserCell row={row} /></td>
                  <td><span className={`history-badge action-${row.action}`}>{ACTION_LABELS[row.action] || row.action}</span></td>
                  <td>
                    <span className="history-resource">{RESOURCE_LABELS[row.resource] || row.resource}</span>
                    {row.resource_id && <small className="history-resource-id">ID: {row.resource_id}</small>}
                  </td>
                  <td><code className="history-ip">{row.ip_address || '—'}</code></td>
                </tr>
              ) : (
                <tr key={row.id}>
                  <td className="history-date">{formatDateTime(row.created_at)}</td>
                  <td><UserCell row={row} /></td>
                  <td>
                    <span className={`history-badge ${row.success ? 'login-success' : 'login-failure'}`}>
                      {row.success ? 'Успешно' : (FAILURE_LABELS[row.failure_reason] || 'Ошибка')}
                    </span>
                  </td>
                  <td><code className="history-ip">{row.ip_address || '—'}</code></td>
                  <td><span className="history-device" title={row.user_agent || ''}>{row.user_agent || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
