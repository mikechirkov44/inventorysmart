import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
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
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <Link to="/">InventorySmart</Link>
          </div>
          <ul className="nav-links">
            <li><NavLink to="/" end>Оборудование</NavLink></li>
            <li><NavLink to="/equipment-table">Таблица</NavLink></li>
            <li><NavLink to="/works">Работы</NavLink></li>
            <li><NavLink to="/rooms">Помещения</NavLink></li>
            <li><NavLink to="/employees">Сотрудники</NavLink></li>
            <li><NavLink to="/work-orders">Журнал</NavLink></li>
            <li><NavLink to="/scan">QR-сканер</NavLink></li>
            <li><NavLink to="/import">Импорт</NavLink></li>
          </ul>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<EquipmentList />} />
            <Route path="/equipment-table" element={<EquipmentTable />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/equipment/new" element={<EquipmentForm />} />
            <Route path="/equipment/:id/edit" element={<EquipmentForm />} />
            <Route path="/works" element={<WorksDirectory />} />
            <Route path="/rooms" element={<RoomsDirectory />} />
            <Route path="/employees" element={<EmployeesDirectory />} />
            <Route path="/scan" element={<QRScanner />} />
            <Route path="/scan/:qrCode" element={<ScanResult />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/import" element={<ImportExcel />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
