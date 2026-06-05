/**
 * @module App
 * @description Корневой компонент приложения InventorySmart.
 * Содержит навигацию, маршрутизацию и обёртки провайдеров
 * (авторизация, уведомления, подтверждения).
 */

import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FolderTree, ClipboardList, ScanLine, CalendarDays, AlertTriangle, BarChart3, Upload, Users, ChevronDown, FileText, Settings, PanelLeft, PanelRight, LogOut, Building2, Bell } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { companyAPI } from './services/api';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import EquipmentList from './pages/EquipmentList';
import EquipmentTable from './pages/EquipmentTable';
import EquipmentDetail from './pages/EquipmentDetail';
import EquipmentForm from './pages/EquipmentForm';
import QRScanner from './pages/QRScanner';
import ScanResult from './pages/ScanResult';
import WorkOrders from './pages/WorkOrders';
import WorksDirectory from './pages/WorksDirectory';
import RoomsDirectory from './pages/RoomsDirectory';
import EmployeesDirectory from './pages/EmployeesDirectory';
import ImportExcel from './pages/ImportExcel';
import IncidentsPage from './pages/IncidentsPage';
import SparePartsDirectory from './pages/SparePartsDirectory';
import SparePartsReceipts from './pages/SparePartsReceipts';
import AnalyticsPage from './pages/AnalyticsPage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import SetupPage from './pages/SetupPage';
import NotificationsPage from './pages/NotificationsPage';
import './App.css';

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

  const hasDirAccess = canView('equipment') || canView('employees') || canView('works') || canView('rooms') || canView('spareParts');
  if (!hasDirAccess) return null;

  const isActive = ['/', '/equipment-table', '/employees', '/works', '/rooms', '/spare-parts'].some(p => location.pathname === p);

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
          {canView('equipment') && <li><NavLink to="/" end onClick={() => setOpen(false)}>Оборудование (карточки)</NavLink></li>}
          {canView('equipment') && <li><NavLink to="/equipment-table" onClick={() => setOpen(false)}>Оборудование (таблица)</NavLink></li>}
          {(canView('employees') || canView('works') || canView('rooms') || canView('spareParts')) && <li className="nav-dropdown-divider" />}
          {canView('employees') && <li><NavLink to="/employees" onClick={() => setOpen(false)}>Сотрудники</NavLink></li>}
          {canView('works') && <li><NavLink to="/works" onClick={() => setOpen(false)}>Работы</NavLink></li>}
          {canView('rooms') && <li><NavLink to="/rooms" onClick={() => setOpen(false)}>Помещения</NavLink></li>}
          {canView('spareParts') && <li><NavLink to="/spare-parts" onClick={() => setOpen(false)}>ЗИП</NavLink></li>}
        </ul>,
        document.body
      )}
    </li>
  );
}

/** Боковая панель навигации приложения */
function AppNav({ collapsed, onToggle }) {
  const { user, logout, canView } = useAuth();
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (user) {
      companyAPI.get().then(res => {
        if (res.data && res.data.companyName) {
          setCompanyName(res.data.companyName);
        }
      }).catch(() => {});
    }
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
        <DirDropdown collapsed={collapsed} />
        {canView('workOrders') && <li><NavLink to="/work-orders"><ClipboardList size={18} />{!collapsed && <span>Журнал</span>}</NavLink></li>}
        {canView('sparePartsReceipts') && <li><NavLink to="/spare-parts-receipts"><FileText size={18} />{!collapsed && <span>Документы</span>}</NavLink></li>}
        {canView('scanner') && <li><NavLink to="/scan"><ScanLine size={18} />{!collapsed && <span>QR-сканер</span>}</NavLink></li>}
        {canView('schedule') && <li><NavLink to="/schedule"><CalendarDays size={18} />{!collapsed && <span>План-график</span>}</NavLink></li>}
        {canView('incidents') && <li><NavLink to="/incidents"><AlertTriangle size={18} />{!collapsed && <span>Инциденты</span>}</NavLink></li>}
        {canView('analytics') && <li><NavLink to="/analytics"><BarChart3 size={18} />{!collapsed && <span>Аналитика</span>}</NavLink></li>}
        {canView('import') && <li><NavLink to="/import"><Upload size={18} />{!collapsed && <span>Импорт</span>}</NavLink></li>}
        {canView('settings') && <li><NavLink to="/settings"><Settings size={18} />{!collapsed && <span>Настройки</span>}</NavLink></li>}
        <li><NavLink to="/notifications"><Bell size={18} />{!collapsed && <span>Уведомления</span>}</NavLink></li>
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

/** Обёртка страницы с анимацией входа при смене маршрута */
function PageWrapper({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  );
}

/** Маршруты приложения. Каждый маршрут защищён ProtectedRoute. */
function AppRoutes() {
  const { user, loading, canView, license } = useAuth();

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  if (user && license && license.status === 'blocked') {
    return <LicenseBlockScreen />;
  }

  return (
    <Routes>
      <Route path="/setup" element={<PageWrapper><SetupPage /></PageWrapper>} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <PageWrapper><LoginPage /></PageWrapper>} />

      {/* User routes */}
      <Route path="/" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentList /></PageWrapper></ProtectedRoute>} />
      <Route path="/equipment-table" element={<ProtectedRoute requiredPermission="equipment"><PageWrapper><EquipmentTable /></PageWrapper></ProtectedRoute>} />
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
      <Route path="/spare-parts" element={<ProtectedRoute requiredPermission="spareParts"><PageWrapper><SparePartsDirectory /></PageWrapper></ProtectedRoute>} />
      <Route path="/spare-parts-receipts" element={<ProtectedRoute requiredPermission="sparePartsReceipts"><PageWrapper><SparePartsReceipts /></PageWrapper></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute requiredPermission="import"><PageWrapper><ImportExcel /></PageWrapper></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requiredPermission="settings"><PageWrapper><SettingsPage /></PageWrapper></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute requiredPermission="settings"><PageWrapper><NotificationsPage /></PageWrapper></ProtectedRoute>} />

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
              <main className="main-content">
                <AppRoutes />
              </main>
            </div>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
