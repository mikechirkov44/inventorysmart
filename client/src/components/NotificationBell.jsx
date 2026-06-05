/**
 * @module NotificationBell
 * @description Компонент колокольчика уведомлений.
 * Отображает выпадающий список уведомлений с возможностью
 * отметки прочитанными. Автоматически обновляется каждые 30 секунд.
 */

import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, AlertCircle, Clock, CheckCircle, Info } from 'lucide-react';
import api from '../services/api';

/** Компонент колокольчика уведомлений в шапке приложения */
function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** Загружает список уведомлений и количество непрочитанных */
  const fetchNotifications = async () => {
    try {
      const [notifs, unread] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      setNotifications(notifs.data.slice(0, 20));
      setUnreadCount(unread.data.count);
    } catch {}
  };

  /** Помечает уведомление как прочитанное по ID */
  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };

  /** Помечает все уведомления как прочитанные */
  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchNotifications();
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
      default: return <Info size={size} className="notif-type-icon info" />;
    }
  };

  return (
    <div className="notification-bell" ref={ref}>
      <button className="bell-button" onClick={() => setOpen(!open)}>
        <Bell size={20} />
        {/* Убрано по запросу пользователя */}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notif-header">
            <h4>Уведомления</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn btn-small">Прочитать все</button>
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
                    <div className="notif-time">{new Date(n.createdAt).toLocaleString('ru-RU')}</div>
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
