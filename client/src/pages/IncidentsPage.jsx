/**
 * @fileoverview Страница управления инцидентами (поломками).
 * Отображает список инцидентов с фильтрацией по статусу,
 * позволяет обновлять статус, добавлять заметки и удалять инциденты.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';

/** Маппинг статусов инцидентов на метки и CSS-классы */
const STATUS_MAP = {
  new: { label: 'Новый', className: 'status-needs-repair' },
  in_progress: { label: 'В работе', className: 'status-under-repair' },
  resolved: { label: 'Решён', className: 'status-working' },
};

/** Компонент страницы инцидентов */
function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка инцидентов при монтировании */
  useEffect(() => { fetchIncidents(); }, []);

  /** Загрузка списка инцидентов с фильтрацией по статусу */
  const fetchIncidents = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/incidents', { params });
      setIncidents(res.data);
      setLoading(false);
    } catch { setLoading(false); }
  };

  /** Перезагрузка инцидентов при изменении фильтра статуса */
  useEffect(() => { fetchIncidents(); }, [filterStatus]);

  /** Обновление статуса и заметки инцидента */
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/incidents/${id}`, { status, adminNotes });
      setSelectedIncident(null);
      setAdminNotes('');
      fetchIncidents();
    } catch { toast.error('Ошибка', 'Не удалось обновить статус'); }
  };

  /** Удаление инцидента с подтверждением */
  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удалить инцидент?', message: 'Инцидент будет удалён навсегда.', type: 'danger' });
    if (!confirmed) return;
    try { await api.delete(`/incidents/${id}`); fetchIncidents(); } catch { toast.error('Ошибка', 'Не удалось удалить инцидент'); }
  };

  if (loading) return <SkeletonTable rows={6} cols={7} />;

  return (
    <div className="directory-page">
      <div className="header">
        <h1>Инциденты (поломки)</h1>
      </div>

      {/* Панель фильтрации по статусу */}
      <div className="filters-panel">
        <div className="filter-row">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Все статусы</option>
            <option value="new">Новые</option>
            <option value="in_progress">В работе</option>
            <option value="resolved">Решённые</option>
          </select>
          <span className="filter-summary">Найдено: <strong>{incidents.length}</strong></span>
        </div>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Оборудование</th>
                <th>Проблема</th>
                <th>Сотрудник</th>
                <th>Статус</th>
                <th>Фото</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr><td colSpan="7" className="no-results-cell">Инцидентов нет</td></tr>
              ) : (
                incidents.map(inc => {
                  const st = STATUS_MAP[inc.status] || STATUS_MAP.new;
                  return (
                    <tr key={inc.id}>
                      <td>{new Date(inc.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <Link to={`/equipment/${inc.equipmentId}`} className="table-link">
                          {inc.equipmentName || '—'}
                        </Link>
                        <div className="td-muted">{inc.inventoryNumber}</div>
                      </td>
                      <td className="td-muted">{inc.description.substring(0, 80)}{inc.description.length > 80 ? '...' : ''}</td>
                      <td>{inc.employeeName || '—'}</td>
                      <td><span className={`status-badge ${st.className}`}>{st.label}</span></td>
                      <td>{inc.photos?.length || 0} шт.</td>
                      <td>
                        <div className="table-actions">
                          <button onClick={() => { setSelectedIncident(inc); setAdminNotes(inc.adminNotes || ''); }} className="btn btn-small btn-secondary">Подробнее</button>
                          <button onClick={() => handleDelete(inc.id)} className="btn btn-small btn-danger">Удал.</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно деталей инцидента */}
      {selectedIncident && (
        <div className="complete-task-modal" onClick={() => setSelectedIncident(null)}>
          <div className="modal-content incident-modal" onClick={e => e.stopPropagation()}>
            <h3>Инцидент</h3>
            <div className="incident-detail">
              <p><strong>Оборудование:</strong> {selectedIncident.equipmentName} ({selectedIncident.inventoryNumber})</p>
              <p><strong>Дата:</strong> {new Date(selectedIncident.createdAt).toLocaleString('ru-RU')}</p>
              <p><strong>Сотрудник:</strong> {selectedIncident.employeeName}</p>
              <p><strong>Проблема:</strong> {selectedIncident.description}</p>

              {selectedIncident.photos?.length > 0 && (
                <div className="incident-photos">
                  <strong>Фото:</strong>
                  <div className="incident-photo-grid">
                    {selectedIncident.photos.map((photo, idx) => (
                      <a key={idx} href={`/uploads/${photo}`} target="_blank" rel="noopener noreferrer">
                        <img src={`/uploads/${photo}`} alt="" className="incident-thumb" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Заметка администратора</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" placeholder="Комментарий..." />
              </div>

              <div className="incident-status-actions">
                {selectedIncident.status !== 'in_progress' && (
                  <button onClick={() => updateStatus(selectedIncident.id, 'in_progress')} className="btn btn-secondary">В работу</button>
                )}
                {selectedIncident.status !== 'resolved' && (
                  <button onClick={() => updateStatus(selectedIncident.id, 'resolved')} className="btn btn-primary">Решено</button>
                )}
                <button onClick={() => setSelectedIncident(null)} className="btn">Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IncidentsPage;
