/**
 * @module NotificationBell
 * @description Компонент колокольчика уведомлений.
 * Отображает выпадающий список уведомлений с возможностью
 * отметки прочитанными. Автоматически обновляется каждые 30 секунд.
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Clock, CheckCircle, Info } from 'lucide-react';
import api from '../services/api';
import { formatDateTime } from '../utils/date';
import { useNotifications } from '../contexts/NotificationsContext';

/** Компонент колокольчика уведомлений в шапке приложения */
function NotificationBell() {
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** Загружает список уведомлений */
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.slice(0, 20));
      await refreshUnreadCount();
    } catch {
      setNotifications([]);
    }
  };

  /** Помечает уведомление как прочитанное по ID */
  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch {}
  };

  /** Помечает все уведомления как прочитанные */
  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      await fetchNotifications();
    } catch {}
  };

  /** Возвращает иконку по типу уведомления */
  const icon = (type) => {
    const size = 16;
    switch (type) {
      case 'incident': return <AlertTriangle size={size} className="notif-type-icon incident" />;
      case 'overdue_work': return <AlertCircle size={size} className="notif-type-icon overdue" />;
      case 'upcoming_work': return <Clock size={size} className="notif-type-icon upcoming" />;
      case 'incident_resolved': return <CheckCircle size={size} className="notif-type-icon resolved" />;
      case 'work_acceptance': return <CheckCircle size={size} className="notif-type-icon upcoming" />;
      default: return <Info size={size} className="notif-type-icon info" />;
    }
  };

  return (
    <div className="notification-bell" ref={ref}>
      <button
        type="button"
        className="bell-button"
        onClick={() => setOpen(!open)}
        aria-label={unreadCount > 0 ? `Уведомления: ${unreadCount} непрочитанных` : 'Уведомления'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="bell-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notif-header">
            <h4>Уведомления</h4>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="btn btn-small">Прочитать все</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">Нет уведомлений</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => markRead(n.id)}>
                  <span className="notif-icon">{icon(n.type)}</span>
                  <div className="notif-body">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">{formatDateTime(n.createdAt ?? n.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
