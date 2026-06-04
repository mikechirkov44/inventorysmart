/**
 * @module App
 * @description Корневой компонент приложения InventorySmart.
 * Содержит навигацию, маршрутизацию и обёртки провайдеров
 * (авторизация, уведомления, подтверждения).
 */

import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { FolderTree, ClipboardList, ScanLine, CalendarDays, AlertTriangle, BarChart3, Upload, Users, ChevronDown, FileText, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationBell from './components/NotificationBell';
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
import './App.css';

/** Выпадающее меню раздела «Справочники» в боковой навигации */
function DirDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const { canView } = useAuth();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasDirAccess = canView('equipment') || canView('employees') || canView('works') || canView('rooms') || canView('spareParts');
  if (!hasDirAccess) return null;

  const isActive = ['/', '/equipment-table', '/employees', '/works', '/rooms', '/spare-parts'].some(p => location.pathname === p);

  return (
    <li className={`nav-dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button className={`nav-dropdown-trigger ${isActive ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        <FolderTree size={18} />
        <span>Справочники</span>
        <ChevronDown size={14} className={`dropdown-arrow ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <ul className="nav-dropdown-menu">
          {canView('equipment') && <li><NavLink to="/" end>Оборудование (карточки)</NavLink></li>}
          {canView('equipment') && <li><NavLink to="/equipment-table">Оборудование (таблица)</NavLink></li>}
          {(canView('employees') || canView('works') || canView('rooms') || canView('spareParts')) && <li className="nav-dropdown-divider" />}
          {canView('employees') && <li><NavLink to="/employees">Сотрудники</NavLink></li>}
          {canView('works') && <li><NavLink to="/works">Работы</NavLink></li>}
          {canView('rooms') && <li><NavLink to="/rooms">Помещения</NavLink></li>}
          {canView('spareParts') && <li><NavLink to="/spare-parts">ЗИП</NavLink></li>}
        </ul>
      )}
    </li>
  );
}

/** Боковая панель навигации приложения */
function AppNav() {
  const { user, logout, canView } = useAuth();

  if (!user) return null;

  return (
    <nav className="sidebar">
      <div className="nav-brand">
        <Link to="/">
          <img src="/logo.svg" alt="InventorySmart" className="nav-logo" />
          InventorySmart
        </Link>
      </div>
      <ul className="nav-links">
        <DirDropdown />
        {canView('workOrders') && <li><NavLink to="/work-orders"><ClipboardList size={18} /><span>Журнал</span></NavLink></li>}
        {canView('sparePartsReceipts') && <li><NavLink to="/spare-parts-receipts"><FileText size={18} /><span>Документы</span></NavLink></li>}
        {canView('scanner') && <li><NavLink to="/scan"><ScanLine size={18} /><span>QR-сканер</span></NavLink></li>}
        {canView('schedule') && <li><NavLink to="/schedule"><CalendarDays size={18} /><span>План-график</span></NavLink></li>}
        {canView('incidents') && <li><NavLink to="/incidents"><AlertTriangle size={18} /><span>Инциденты</span></NavLink></li>}
        {canView('analytics') && <li><NavLink to="/analytics"><BarChart3 size={18} /><span>Аналитика</span></NavLink></li>}
        {canView('import') && <li><NavLink to="/import"><Upload size={18} /><span>Импорт</span></NavLink></li>}
        {canView('settings') && <li><NavLink to="/settings"><Settings size={18} /><span>Настройки</span></NavLink></li>}
      </ul>
    </nav>
  );
}

/** Верхняя шапка с уведомлениями и информацией о пользователе */
function TopHeader() {
  const { user, logout, license } = useAuth();
  if (!user) return null;

  return (
    <header className="top-header">
      {user.companyName && <span className="top-header-company">{user.companyName}</span>}
      {license && (
        <span className={`license-badge ${license.status === 'demo' ? 'license-demo' : license.status === 'active' ? 'license-active' : 'license-blocked'}`}>
          {license.status === 'demo' && `DEMO — ${license.daysLeft} раб. дн.`}
          {license.status === 'active' && `Полная лицензия до ${new Date(license.expiresAt).toLocaleDateString('ru-RU')}`}
          {license.status === 'blocked' && 'Демо истёк'}
          {license.status === 'expired' && 'Лицензия истекла'}
        </span>
      )}
      <div className="top-header-spacer" />
      <div className="top-header-user">
        <NotificationBell />
        <span className="top-header-name">{user.fullName || user.username}</span>
        <button onClick={logout} className="btn btn-small top-header-logout">Выйти</button>
      </div>
    </header>
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Корневой компонент приложения с провайдерами и маршрутизацией */
function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <div className="app">
              <AppNav />
              <div className="main-area">
                <TopHeader />
                <main className="main-content">
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
