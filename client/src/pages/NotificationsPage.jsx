/**
 * @module NotificationsPage
 * @description Страница уведомлений с таблицей.
 * Отображает список всех уведомлений с датой, типом и содержанием.
 */

import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Clock, CheckCircle, Info, Eye, EyeOff, Trash2 } from 'lucide-react';
import api from '../services/api';
import ActionsMenu from '../components/ActionsMenu';

const TYPE_LABELS = {
  incident: 'Инцидент',
  overdue_work: 'Просрочено',
  upcoming_work: 'Скоро',
  incident_resolved: 'Решено',
  info: 'Информация'
};

const TYPE_ICONS = {
  incident: AlertTriangle,
  overdue_work: AlertCircle,
  upcoming_work: Clock,
  incident_resolved: CheckCircle,
  info: Info
};

const TYPE_COLORS = {
  incident: 'var(--danger)',
  overdue_work: 'var(--danger)',
  upcoming_work: 'var(--warning)',
  incident_resolved: 'var(--success)',
  info: 'var(--primary)'
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.slice(0, 100));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };

  const markUnread = async (id) => {
    try {
      await api.put(`/notifications/${id}/unread`);
      fetchNotifications();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
    } catch {}
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch {}
  };

  return (
    <div className="notifications-page">
      <div className="header">
        <h1><Bell size={24} />Уведомления</h1>
        <button onClick={markAllRead} className="btn btn-small btn-secondary">
          Отметить все прочитанными
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Загрузка...</div>
      ) : notifications.length === 0 ? (
        <div className="no-results">Нет уведомлений</div>
      ) : (
        <div className="table-container">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Содержание</th>
                  <th>Дата</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map(n => {
                  const Icon = TYPE_ICONS[n.type] || Info;
                  return (
                    <tr
                      key={n.id}
                      className={n.read ? '' : 'row-highlight'}
                    >
                      <td>
                        <span className="notif-type-cell" style={{ color: TYPE_COLORS[n.type] || 'var(--gray-600)' }}>
                          <Icon size={16} />
                          {TYPE_LABELS[n.type] || 'Инфо'}
                        </span>
                      </td>
                      <td>
                        <div className="notif-title-cell">{n.title}</div>
                        <div className="notif-message-cell">{n.message}</div>
                      </td>
                      <td className="notif-date-cell">
                        {new Date(n.createdAt).toLocaleString('ru-RU')}
                      </td>
                      <td>
                        <ActionsMenu items={[
                          n.read
                            ? { icon: <EyeOff size={14} />, label: 'Отменить прочтение', onClick: () => markUnread(n.id) }
                            : { icon: <Eye size={14} />, label: 'Прочитать', onClick: () => markRead(n.id) },
                          { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => deleteNotification(n.id), danger: true }
                        ]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
