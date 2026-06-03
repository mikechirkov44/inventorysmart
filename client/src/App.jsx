import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { FolderTree, ClipboardList, ScanLine, CalendarDays, AlertTriangle, BarChart3, Upload, Users, ChevronDown, FileText, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

function TopHeader() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="top-header">
      <div className="top-header-spacer" />
      <div className="top-header-user">
        <NotificationBell />
        <span className="top-header-name">{user.fullName || user.username}</span>
        <button onClick={logout} className="btn btn-small top-header-logout">Выйти</button>
      </div>
    </header>
  );
}

function AppRoutes() {
  const { user, loading, canView } = useAuth();

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* User routes */}
      <Route path="/" element={<ProtectedRoute requiredPermission="equipment"><EquipmentList /></ProtectedRoute>} />
      <Route path="/equipment-table" element={<ProtectedRoute requiredPermission="equipment"><EquipmentTable /></ProtectedRoute>} />
      <Route path="/equipment/:id" element={<ProtectedRoute requiredPermission="equipment"><EquipmentDetail /></ProtectedRoute>} />
      <Route path="/equipment/new" element={<ProtectedRoute requiredPermission="equipment"><EquipmentForm /></ProtectedRoute>} />
      <Route path="/equipment/:id/edit" element={<ProtectedRoute requiredPermission="equipment"><EquipmentForm /></ProtectedRoute>} />
      <Route path="/scan" element={<ProtectedRoute requiredPermission="scanner"><QRScanner /></ProtectedRoute>} />
      <Route path="/scan/:qrCode" element={<ProtectedRoute requiredPermission="scanner"><ScanResult /></ProtectedRoute>} />
      <Route path="/work-orders" element={<ProtectedRoute requiredPermission="workOrders"><WorkOrders /></ProtectedRoute>} />

      {/* Resource routes */}
      <Route path="/incidents" element={<ProtectedRoute requiredPermission="incidents"><IncidentsPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute requiredPermission="analytics"><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute requiredPermission="schedule"><SchedulePage /></ProtectedRoute>} />
      <Route path="/works" element={<ProtectedRoute requiredPermission="works"><WorksDirectory /></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute requiredPermission="rooms"><RoomsDirectory /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute requiredPermission="employees"><EmployeesDirectory /></ProtectedRoute>} />
      <Route path="/spare-parts" element={<ProtectedRoute requiredPermission="spareParts"><SparePartsDirectory /></ProtectedRoute>} />
      <Route path="/spare-parts-receipts" element={<ProtectedRoute requiredPermission="sparePartsReceipts"><SparePartsReceipts /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute requiredPermission="import"><ImportExcel /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requiredPermission="settings"><SettingsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <AppNav />
          <div className="main-area">
            <TopHeader />
            <main className="main-content">
              <AppRoutes />
            </main>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
