import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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
import UsersPage from './pages/UsersPage';
import ImportExcel from './pages/ImportExcel';
import CalendarPage from './pages/CalendarPage';
import IncidentsPage from './pages/IncidentsPage';
import './App.css';

function DirDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = ['/', '/equipment-table', '/employees', '/works', '/rooms'].some(p => location.pathname === p);

  return (
    <li className={`nav-dropdown ${open ? 'open' : ''}`} ref={ref}>
      <button className={`nav-dropdown-trigger ${isActive ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        Справочники ▾
      </button>
      {open && (
        <ul className="nav-dropdown-menu">
          <li><NavLink to="/" end>Оборудование (карточки)</NavLink></li>
          <li><NavLink to="/equipment-table">Оборудование (таблица)</NavLink></li>
          <li className="nav-dropdown-divider" />
          <li><NavLink to="/employees">Сотрудники</NavLink></li>
          <li><NavLink to="/works">Работы</NavLink></li>
          <li><NavLink to="/rooms">Помещения</NavLink></li>
        </ul>
      )}
    </li>
  );
}

function AppNav() {
  const { user, logout, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">InventorySmart</Link>
      </div>
      <ul className="nav-links">
        <DirDropdown />
        <li><NavLink to="/work-orders">Журнал</NavLink></li>
        <li><NavLink to="/scan">QR-сканер</NavLink></li>
        <li><NavLink to="/calendar">Календарь</NavLink></li>
        {isAdmin && <li><NavLink to="/incidents">Инциденты</NavLink></li>}
        {isAdmin && <li><NavLink to="/import">Импорт</NavLink></li>}
        {isAdmin && <li><NavLink to="/users">Пользователи</NavLink></li>}
      </ul>
      <div className="nav-user">
        <NotificationBell />
        <span className="nav-user-name">{user.fullName || user.username}</span>
        <button onClick={logout} className="btn btn-small nav-logout">Выйти</button>
      </div>
    </nav>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* User routes */}
      <Route path="/" element={<ProtectedRoute><EquipmentList /></ProtectedRoute>} />
      <Route path="/equipment-table" element={<ProtectedRoute><EquipmentTable /></ProtectedRoute>} />
      <Route path="/equipment/:id" element={<ProtectedRoute><EquipmentDetail /></ProtectedRoute>} />
      <Route path="/equipment/new" element={<ProtectedRoute><EquipmentForm /></ProtectedRoute>} />
      <Route path="/equipment/:id/edit" element={<ProtectedRoute><EquipmentForm /></ProtectedRoute>} />
      <Route path="/scan" element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />
      <Route path="/scan/:qrCode" element={<ProtectedRoute><ScanResult /></ProtectedRoute>} />
      <Route path="/work-orders" element={<ProtectedRoute><WorkOrders /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/incidents" element={<ProtectedRoute adminOnly><IncidentsPage /></ProtectedRoute>} />
      <Route path="/works" element={<ProtectedRoute adminOnly><WorksDirectory /></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute adminOnly><RoomsDirectory /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute adminOnly><EmployeesDirectory /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute adminOnly><ImportExcel /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />

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
          <main className="main-content">
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
