/**
 * @module App
 * @description Корневой компонент приложения InventorySmart.
 * Содержит навигацию, маршрутизацию и обёртки провайдеров
 * (авторизация, уведомления, подтверждения).
 */

import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { FolderTree, ClipboardList, ScanLine, CalendarDays, AlertTriangle, BarChart3, Upload, Users, ChevronDown, FileText, Settings, PanelLeft, PanelRight, LogOut, Building2, Bell, HelpCircle, Download, LayoutDashboard } from 'lucide-react';

function AndroidIcon({ size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 16V9a7 7 0 0 1 14 0v7" />
      <path d="M3 16h18v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
      <circle cx="8.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="M7 8.5a.5.5 0 0 1 .5-.5" />
      <path d="M17 8.5a.5.5 0 0 0 .5-.5" />
    </svg>
  );
}
import { AuthProvider, useAuth } from './contexts/AuthContext';
import api, { companyAPI } from './services/api';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import ProtectedRoute from './components/ProtectedRoute';
import LicenseBanner from './components/LicenseBanner';
import MobileMoreMenu from './components/MobileMoreMenu';
import NotificationBell from './components/NotificationBell';
import { applyThemeColor } from './utils/theme';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail'));
const EquipmentForm = lazy(() => import('./pages/EquipmentForm'));
const QRScanner = lazy(() => import('./pages/QRScanner'));
const ScanResult = lazy(() => import('./pages/ScanResult'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const WorksDirectory = lazy(() => import('./pages/WorksDirectory'));
const RoomsDirectory = lazy(() => import('./pages/RoomsDirectory'));
const EmployeesDirectory = lazy(() => import('./pages/EmployeesDirectory'));
const EquipmentCategoriesDirectory = lazy(() => import('./pages/EquipmentCategoriesDirectory'));
const ImportExcel = lazy(() => import('./pages/ImportExcel'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const SparePartsDirectory = lazy(() => import('./pages/SparePartsDirectory'));
const SparePartsReceipts = lazy(() => import('./pages/SparePartsReceipts'));
const CommonFaultsDirectory = lazy(() => import('./pages/CommonFaultsDirectory'));
const CausesDirectory = lazy(() => import('./pages/CausesDirectory'));
const OverdueReasonsDirectory = lazy(() => import('./pages/OverdueReasonsDirectory'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SetupPage = lazy(() => import('./pages/SetupPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
import './App.css';
import './styles/saas.css';

/** Выпадающее меню раздела «Справочники» в боковой навигации */
function DirDropdown({ collapsed }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, isMobile: false });
  const location = useLocation();
  const { canView } = useAuth();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setMenuPos({ top: rect.top - 260, left: 8, isMobile: true });
      } else {
        setMenuPos({ top: rect.top, left: rect.right + 4, isMobile: false });
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
    }
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        const menu = document.getElementById('nav-dropdown-portal');
        if (menu && !menu.contains(e.target)) setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
      return () => {
        document.removeEventListener('mousedown', handler);
        document.removeEventListener('touchstart', handler);
      };
    }
  }, [open]);

  const hasDirAccess = canView('equipment') || canView('employees') || canView('works') || canView('rooms') || canView('spareParts') || canView('causes') || canView('overdueReasons');
  if (!hasDirAccess) return null;

  const isActive = ['/equipment', '/equipment-table', '/employees', '/works', '/rooms', '/spare-parts', '/common-faults', '/causes', '/overdue-reasons'].some(p => location.pathname === p);

  const menuStyle = menuPos.isMobile
    ? { position: 'fixed', bottom: 68, left: 8, right: 8, top: 'auto', margin: 0 }
    : { position: 'fixed', top: menuPos.top, left: menuPos.left, margin: 0 };

  return (
    <li className={`nav-dropdown ${open ? 'open' : ''}`}>
      <button ref={triggerRef} className={`nav-dropdown-trigger ${isActive ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        <FolderTree size={18} />
        {!collapsed && <span>Справочники</span>}
        {!collapsed && <ChevronDown size={14} className={`dropdown-arrow ${open ? 'open' : ''}`} />}
      </button>
      {open && createPortal(
        <ul id="nav-dropdown-portal" className="nav-dropdown-menu" style={menuStyle}>
          {canView('equipment') && <li><NavLink to="/equipment" onClick={() => setOpen(false)}>Оборудование</NavLink></li>}
          {(canView('employees') || canView('works') || canView('rooms') || canView('spareParts')) && <li className="nav-dropdown-divider" />}
          {canView('employees') && <li><NavLink to="/employees" onClick={() => setOpen(false)}>Сотрудники</NavLink></li>}
          {canView('works') && <li><NavLink to="/works" onClick={() => setOpen(false)}>Работы</NavLink></li>}
          {canView('rooms') && <li><NavLink to="/rooms" onClick={() => setOpen(false)}>Помещения</NavLink></li>}
          {canView('equipment') && <li><NavLink to="/equipment-categories" onClick={() => setOpen(false)}>Категории оборудования</NavLink></li>}
          {canView('spareParts') && <li><NavLink to="/spare-parts" onClick={() => setOpen(false)}>ЗИП</NavLink></li>}
          {canView('spareParts') && <li><NavLink to="/common-faults" onClick={() => setOpen(false)}>Типовые неисправности</NavLink></li>}
          {canView('causes') && <li><NavLink to="/causes" onClick={() => setOpen(false)}>Причины возникновения</NavLink></li>}
          {canView('overdueReasons') && <li><NavLink to="/overdue-reasons" onClick={() => setOpen(false)}>Причины просрочки</NavLink></li>}
        </ul>,
        document.body
      )}
    </li>
  );
}

/** Верхняя панель (десктоп): уведомления */
function AppTopBar() {
  const { user, canView } = useAuth();
  if (!user) return null;

  return (
    <header className="top-header">
      {canView('settings') && <NotificationBell />}
    </header>
  );
}

/** Боковая панель навигации приложения */
function AppNav({ collapsed, onToggle }) {
  const { user, logout, canView } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      companyAPI.get().then(res => {
        if (res.data && res.data.companyName) {
          setCompanyName(res.data.companyName);
        }
        if (res.data?.themeColor) {
          applyThemeColor(res.data.themeColor);
        }
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      api.get('/notifications/unread-count').then(res => {
        setUnreadCount(res.data.count || 0);
      }).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="nav-brand">
        <Link to="/">
          <img src="/logo.svg" alt="InventorySmart" className="nav-logo" />
          {!collapsed && <span>InventorySmart</span>}
        </Link>
      </div>
      {user.companyName && (
        <div className="nav-company">
          <Building2 size={16} />
          {!collapsed && <span>{user.companyName}</span>}
        </div>
      )}
      <ul className="nav-links">
        <li><NavLink to="/" end><LayoutDashboard size={18} />{!collapsed && <span>Главная</span>}</NavLink></li>
        <DirDropdown collapsed={collapsed} />
        {canView('workOrders') && <li><NavLink to="/work-orders"><ClipboardList size={18} />{!collapsed && <span>Журнал</span>}</NavLink></li>}
        {canView('sparePartsReceipts') && <li><NavLink to="/spare-parts-receipts"><FileText size={18} />{!collapsed && <span>Документы</span>}</NavLink></li>}
        {canView('scanner') && <li><NavLink to="/scan"><ScanLine size={18} />{!collapsed && <span>QR-сканер</span>}</NavLink></li>}
        {canView('schedule') && <li><NavLink to="/schedule"><CalendarDays size={18} />{!collapsed && <span>План-график</span>}</NavLink></li>}
        {canView('incidents') && <li><NavLink to="/incidents"><AlertTriangle size={18} />{!collapsed && <span>Инциденты</span>}</NavLink></li>}
        {canView('analytics') && <li><NavLink to="/analytics"><BarChart3 size={18} />{!collapsed && <span>Аналитика</span>}</NavLink></li>}
        {canView('import') && <li className="nav-item-desktop-only"><NavLink to="/import"><Upload size={18} />{!collapsed && <span>Импорт</span>}</NavLink></li>}
        {canView('settings') && <li className="nav-item-desktop-only"><NavLink to="/settings"><Settings size={18} />{!collapsed && <span>Настройки</span>}</NavLink></li>}
        <li className="nav-item-desktop-only"><NavLink to="/notifications"><Bell size={18} />{!collapsed && <span>Уведомления {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}</span>}</NavLink></li>
        <li className="nav-item-desktop-only"><NavLink to="/help"><HelpCircle size={18} />{!collapsed && <span>Справка</span>}</NavLink></li>
        <li className="nav-item-desktop-only"><a href="/downloads/InventorySmart.apk" download><AndroidIcon size={18} />{!collapsed && <span>Мобильное приложение</span>}</a></li>
        <li className="mobile-more-nav-item"><MobileMoreMenu unreadCount={unreadCount} /></li>
      </ul>
      <div className="nav-footer">
        {!collapsed && (
          <div className="nav-user">
            <span className="nav-user-name">{user.fullName || user.username}</span>
            {companyName && <span className="nav-company-name">Компания: {companyName}</span>}
          </div>
        )}
        <button className="nav-logout" onClick={logout} title="Выйти">
          <LogOut size={18} />
          {!collapsed && <span>Выйти</span>}
        </button>
        <button className="nav-collapse-btn" onClick={onToggle} title={collapsed ? 'Развернуть' : 'Свернуть'}>
          {collapsed ? <PanelRight size={18} /> : <PanelLeft size={18} />}
          {!collapsed && <span>Свернуть</span>}
        </button>
      </div>
    </nav>
  );
}

/** Экран блокировки при истёкшем демо */
function LicenseBlockScreen() {
  const { logout } = useAuth();
  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div className="login-header">
          <h1>Демо-режим истёк</h1>
          <p>Срок действия демонстрационного доступа (5 рабочих дней) истёк.</p>
        </div>
        <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
          Обратитесь к суперадминистратору для получения лицензионного ключа,
          затем введите его в разделе «Настройки → Компания».
        </p>
        <button onClick={logout} className="btn btn-primary btn-full">Выйти</button>
      </div>
    </div>
  );
}

import { SkeletonPage } from './components/Skeleton';

/** Обёртка страницы с анимацией входа при смене маршрута и ленивой загрузкой */
function PageWrapper({ children }) {
  const location = useLocation();
  return (
    <Suspense fallback={<SkeletonPage />}>
      <div key={location.pathname} className="page-enter">
        {children}
      </div>
    </Suspense>
  );
}

/** Маршруты приложения. Каждый маршрут защищён ProtectedRoute. */
function AppRoutes() {
  const { user, loading, canView, license } = useAuth();

  if (loading) return <SkeletonPage />;

  if (user && license && license.status === 'blocked') {
    return <LicenseBlockScreen />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<PageWrapper><SetupPage /></PageWrapper>} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <PageWrapper><LoginPage /></PageWrapper>} />

      <Route path="/" element={<ProtectedRoute><PageWrapper><DashboardPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/equipment" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/equipment-table" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/equipment/:id" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentDetail /></PageWrapper></ProtectedRoute>} />
      <Route path="/equipment/new" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentForm /></PageWrapper></ProtectedRoute>} />
      <Route path="/equipment/:id/edit" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentForm /></PageWrapper></ProtectedRoute>} />
      <Route path="/scan" element={<ProtectedRoute requiredPermission="scanner"><PageWrapper><QRScanner /></PageWrapper></ProtectedRoute>} />
      <Route path="/scan/:qrCode" element={<ProtectedRoute requiredPermission="scanner"><PageWrapper><ScanResult /></PageWrapper></ProtectedRoute>} />
      <Route path="/work-orders" element={<ProtectedRoute requiredPermission="workOrders"><PageWrapper><WorkOrders /></PageWrapper></ProtectedRoute>} />

      {/* Resource routes */}
      <Route path="/incidents" element={<ProtectedRoute requiredPermission="incidents"><PageWrapper><IncidentsPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute requiredPermission="analytics"><PageWrapper><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute requiredPermission="schedule"><PageWrapper><SchedulePage /></PageWrapper></ProtectedRoute>} />
      <Route path="/works" element={<ProtectedRoute requiredPermission="works"><PageWrapper><WorksDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute requiredPermission="rooms"><PageWrapper><RoomsDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute requiredPermission="employees"><PageWrapper><EmployeesDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/equipment-categories" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentCategoriesDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/spare-parts" element={<ProtectedRoute requiredPermission="spareParts"><PageWrapper><SparePartsDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/spare-parts-receipts" element={<ProtectedRoute requiredPermission="sparePartsReceipts"><PageWrapper><SparePartsReceipts /></PageWrapper></ProtectedRoute>} />
      <Route path="/common-faults" element={<ProtectedRoute requiredPermission="spareParts"><PageWrapper><CommonFaultsDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/causes" element={<ProtectedRoute requiredPermission="causes"><PageWrapper><CausesDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/overdue-reasons" element={<ProtectedRoute requiredPermission="overdueReasons"><PageWrapper><OverdueReasonsDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute requiredPermission="import"><PageWrapper><ImportExcel /></PageWrapper></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requiredPermission="settings"><PageWrapper><SettingsPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute requiredPermission="settings"><PageWrapper><NotificationsPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><PageWrapper><HelpPage /></PageWrapper></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Корневой компонент приложения с провайдерами и маршрутизацией */
function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
              <AppNav collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
              <div className="app-body">
                <LicenseBanner />
                <AppTopBar />
                <main className="main-content page-container">
                  <AppRoutes />
                </main>
              </div>
            </div>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
