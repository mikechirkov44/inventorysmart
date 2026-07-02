/**
 * @module NotificationsContext
 * @description Единый источник счётчика непрочитанных уведомлений для меню и колокольчика.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext({
  unreadCount: 0,
  refreshUnreadCount: () => {},
});

export function NotificationsProvider({ children }) {
  const { user, canView } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || !canView('settings')) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch {
      setUnreadCount(0);
    }
  }, [user, canView]);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
