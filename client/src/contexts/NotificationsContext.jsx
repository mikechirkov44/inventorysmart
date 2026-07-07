/**
 * @module NotificationsContext
 * @description Единый источник счётчика непрочитанных уведомлений для меню и колокольчика.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const POLL_INTERVAL_MS = 60000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10000;

const NotificationsContext = createContext({
  unreadCount: 0,
  refreshUnreadCount: async () => true,
});

export function NotificationsProvider({ children }) {
  const { user, canView } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const failuresRef = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user || !canView('settings')) {
      setUnreadCount(0);
      failuresRef.current = 0;
      return true;
    }

    try {
      const res = await api.get('/notifications/unread-count', {
        timeout: REQUEST_TIMEOUT_MS,
      });
      setUnreadCount(res.data.count || 0);
      failuresRef.current = 0;
      return true;
    } catch {
      failuresRef.current += 1;
      return false;
    }
  }, [user, canView]);

  useEffect(() => {
    if (!user || !canView('settings')) {
      setUnreadCount(0);
      return undefined;
    }

    let cancelled = false;
    let timeoutId;

    const scheduleNext = (delay) => {
      timeoutId = window.setTimeout(async () => {
        if (cancelled) return;

        if (document.hidden) {
          scheduleNext(POLL_INTERVAL_MS);
          return;
        }

        const ok = await refreshUnreadCount();
        if (cancelled) return;

        const backoff = ok
          ? POLL_INTERVAL_MS
          : Math.min(POLL_INTERVAL_MS * (2 ** failuresRef.current), MAX_BACKOFF_MS);

        scheduleNext(backoff);
      }, delay);
    };

    refreshUnreadCount();
    scheduleNext(POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, canView, refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
