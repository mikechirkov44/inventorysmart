import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import {
  MoreHorizontal, X, LogOut, Settings, HelpCircle, Bell, Download, Building2, User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { companyAPI } from '../services/api';

function AndroidIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 16V9a7 7 0 0 1 14 0v7" />
      <path d="M3 16h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
    </svg>
  );
}

/**
 * Мобильное меню «Ещё»: профиль, настройки, выход.
 */
export default function MobileMoreMenu({ unreadCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const { user, logout, canView } = useAuth();

  useEffect(() => {
    if (user) {
      companyAPI.get().then((res) => {
        if (res.data?.companyName) setCompanyName(res.data.companyName);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        className="mobile-more-trigger"
        onClick={() => setOpen(true)}
        aria-label="Ещё"
      >
        <MoreHorizontal size={20} />
        <span>Ещё</span>
      </button>

      {open && createPortal(
        <div className="mobile-more-overlay" onClick={() => setOpen(false)}>
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-more-header">
              <h3>Меню</h3>
              <button type="button" className="mobile-more-close" onClick={() => setOpen(false)} aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>

            <div className="mobile-more-user">
              <div className="mobile-more-avatar"><User size={20} /></div>
              <div>
                <div className="mobile-more-name">{user.fullName || user.username}</div>
                {companyName && (
                  <div className="mobile-more-company"><Building2 size={14} /> {companyName}</div>
                )}
              </div>
            </div>

            <nav className="mobile-more-links">
              {canView('settings') && (
                <NavLink to="/settings" onClick={() => setOpen(false)}>
                  <Settings size={18} /> Настройки
                </NavLink>
              )}
              <NavLink to="/notifications" onClick={() => setOpen(false)}>
                <Bell size={18} />
                Уведомления
                {unreadCount > 0 && <span className="mobile-more-badge">{unreadCount}</span>}
              </NavLink>
              <NavLink to="/help" onClick={() => setOpen(false)}>
                <HelpCircle size={18} /> Справка
              </NavLink>
              <a href="/downloads/InventorySmart.apk" download onClick={() => setOpen(false)}>
                <AndroidIcon /> Мобильное приложение
              </a>
            </nav>

            <button type="button" className="mobile-more-logout" onClick={() => { setOpen(false); logout(); }}>
              <LogOut size={18} /> Выйти
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
