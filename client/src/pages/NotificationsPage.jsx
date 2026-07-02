/**
 * @module NotificationsPage
 * @description Страница уведомлений с таблицей.
 * Отображает список всех уведомлений с датой, типом и содержанием.
 */

import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Clock, CheckCircle, Info, Eye, EyeOff, Trash2 } from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import {
  MobileDataCards, MobileDataCard, MobileDataCardTitle,
  MobileDataCardRow, MobileDataCardActions,
} from '../components/MobileDataCard';
import ActionsMenu from '../components/ActionsMenu';
import { formatDateTime } from '../utils/date';
import { useNotifications } from '../contexts/NotificationsContext';

const TYPE_LABELS = {
  incident: 'Инцидент',
  overdue_work: 'Просрочено',
  upcoming_work: 'Скоро',
  incident_resolved: 'Решено',
  work_acceptance: 'Подтверждение',
  info: 'Информация'
};

const TYPE_ICONS = {
  incident: AlertTriangle,
  overdue_work: AlertCircle,
  upcoming_work: Clock,
  incident_resolved: CheckCircle,
  work_acceptance: CheckCircle,
  info: Info
};

const TYPE_COLORS = {
  incident: 'var(--danger)',
  overdue_work: 'var(--danger)',
  upcoming_work: 'var(--warning)',
  incident_resolved: 'var(--success)',
  work_acceptance: 'var(--primary)',
  info: 'var(--primary)'
};

function getNotificationActions(n, { markRead, markUnread, deleteNotification }) {
  return [
    n.read
      ? { icon: <EyeOff size={14} />, label: 'Отменить прочтение', onClick: () => markUnread(n.id) }
      : { icon: <Eye size={14} />, label: 'Прочитать', onClick: () => markRead(n.id) },
    { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => deleteNotification(n.id), danger: true },
  ];
}

export default function NotificationsPage() {
  const { refreshUnreadCount } = useNotifications();
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
      await fetchNotifications();
      await refreshUnreadCount();
    } catch {}
  };

  const markUnread = async (id) => {
    try {
      await api.put(`/notifications/${id}/unread`);
      await fetchNotifications();
      await refreshUnreadCount();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      await fetchNotifications();
      await refreshUnreadCount();
    } catch {}
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      await fetchNotifications();
      await refreshUnreadCount();
    } catch {}
  };

  const actionHandlers = { markRead, markUnread, deleteNotification };

  if (loading) return <SkeletonTable rows={8} cols={4} />;

  return (
    <div className="notifications-page">
      <PageHeader icon={Bell} title="Уведомления">
        {notifications.length > 0 && (
          <button onClick={markAllRead} className="btn btn-small btn-secondary">
            Отметить все прочитанными
          </button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Нет уведомлений"
          description="Здесь будут отображаться оповещения об инцидентах, работах и других событиях."
        />
      ) : (
        <>
          <div className="table-container desktop-table-only">
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
                          {formatDateTime(n.createdAt ?? n.created_at)}
                        </td>
                        <td>
                          <ActionsMenu items={getNotificationActions(n, actionHandlers)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <MobileDataCards>
            {notifications.map(n => {
              const Icon = TYPE_ICONS[n.type] || Info;
              return (
                <MobileDataCard key={n.id} className={n.read ? '' : 'row-highlight'}>
                  <MobileDataCardTitle>
                    <span className="notif-type-cell" style={{ color: TYPE_COLORS[n.type] || 'var(--gray-600)' }}>
                      <Icon size={16} />
                      {TYPE_LABELS[n.type] || 'Инфо'}
                    </span>
                  </MobileDataCardTitle>
                  <MobileDataCardRow label="Заголовок">{n.title}</MobileDataCardRow>
                  <MobileDataCardRow label="Сообщение">{n.message}</MobileDataCardRow>
                  <MobileDataCardRow label="Дата">
                    {formatDateTime(n.createdAt ?? n.created_at)}
                  </MobileDataCardRow>
                  <MobileDataCardActions>
                    <ActionsMenu items={getNotificationActions(n, actionHandlers)} />
                  </MobileDataCardActions>
                </MobileDataCard>
              );
            })}
          </MobileDataCards>
        </>
      )}
    </div>
  );
}
