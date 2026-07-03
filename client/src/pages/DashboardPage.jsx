/**
 * @module DashboardPage
 * @description Главная страница SaaS: KPI, быстрые действия, чеклист onboarding.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, ClipboardList, AlertTriangle, Package,
  ScanLine, Plus, BarChart3, TrendingUp, Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  equipmentAPI, workOrderAPI, incidentsAPI, sparePartsAPI, analyticsAPI, scheduleAPI,
} from '../services/api';
import { SkeletonPage } from '../components/Skeleton';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { formatDate } from '../utils/date';

const TODAY_STATUS_LABELS = {
  today: 'На сегодня',
  overdue: 'Просрочена',
  never: 'Не выполнялась',
};

function KpiCard({ icon: Icon, label, value, sub, to, color = 'primary' }) {
  const content = (
    <div className={`kpi-card kpi-card-${color}`}>
      <div className="kpi-card-icon"><Icon size={22} /></div>
      <div className="kpi-card-body">
        <div className="kpi-card-value">{value}</div>
        <div className="kpi-card-label">{label}</div>
        {sub && <div className="kpi-card-sub">{sub}</div>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="kpi-card-link">{content}</Link> : content;
}

export default function DashboardPage() {
  const { user, canView } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    equipment: 0,
    pendingOrders: 0,
    openIncidents: 0,
    lowStock: 0,
    completionRate: null,
    overdue: null,
  });
  const [todayTasks, setTodayTasks] = useState([]);

  useEffect(() => {
    const tasks = [];

    if (canView('equipment')) {
      tasks.push(equipmentAPI.getAll().then((r) => {
        setStats((s) => ({ ...s, equipment: r.data.length }));
      }));
    }
    if (canView('workOrders')) {
      tasks.push(workOrderAPI.getAll().then((r) => {
        const pending = r.data.filter((wo) => wo.status === 'pending').length;
        setStats((s) => ({ ...s, pendingOrders: pending }));
      }));
    }
    if (canView('incidents')) {
      tasks.push(incidentsAPI.getAll().then((r) => {
        const open = r.data.filter((i) => i.status === 'new' || i.status === 'in_progress').length;
        setStats((s) => ({ ...s, openIncidents: open }));
      }));
    }
    if (canView('spareParts')) {
      tasks.push(sparePartsAPI.getAll().then((r) => {
        const low = r.data.filter((sp) => sp.quantity <= sp.minStock).length;
        setStats((s) => ({ ...s, lowStock: low }));
      }));
    }
    if (canView('analytics')) {
      tasks.push(analyticsAPI.getSummary().then((r) => {
        setStats((s) => ({
          ...s,
          completionRate: r.data.completionRate,
          overdue: r.data.totalOverdue,
        }));
      }));
    }
    if (canView('schedule')) {
      tasks.push(
        scheduleAPI.getTodayTasks()
          .then((r) => setTodayTasks(r.data.tasks || []))
          .catch(() => setTodayTasks([])),
      );
    }

    Promise.all(tasks).finally(() => setLoading(false));
  }, [canView]);

  if (loading) {
    return (
      <div className="dashboard">
        <SkeletonPage />
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1><LayoutDashboard size={26} />{greeting()}, {user?.fullName || user?.username}</h1>
          <p className="dashboard-subtitle">
            {user?.companyName ? `${user.companyName} · ` : ''}
            Обзор системы технического обслуживания
          </p>
        </div>
      </div>

      <OnboardingChecklist />

      <div className="kpi-grid">
        {canView('equipment') && (
          <KpiCard icon={Wrench} label="Оборудование" value={stats.equipment} to="/equipment" />
        )}
        {canView('workOrders') && (
          <KpiCard
            icon={ClipboardList}
            label="Работ в ожидании"
            value={stats.pendingOrders}
            color={stats.pendingOrders > 0 ? 'warning' : 'primary'}
            to="/work-orders"
          />
        )}
        {canView('incidents') && (
          <KpiCard
            icon={AlertTriangle}
            label="Открытые инциденты"
            value={stats.openIncidents}
            color={stats.openIncidents > 0 ? 'danger' : 'primary'}
            to="/incidents"
          />
        )}
        {canView('spareParts') && (
          <KpiCard
            icon={Package}
            label="ЗИП ниже минимума"
            value={stats.lowStock}
            color={stats.lowStock > 0 ? 'warning' : 'primary'}
            to="/spare-parts"
          />
        )}
        {canView('analytics') && stats.completionRate !== null && (
          <KpiCard
            icon={TrendingUp}
            label="Выполнение плана"
            value={`${stats.completionRate}%`}
            sub={stats.overdue > 0 ? `Просрочено: ${stats.overdue}` : undefined}
            to="/analytics"
          />
        )}
      </div>

      {canView('schedule') && (
        <div className="dashboard-section dashboard-today-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">
              <Clock size={18} />
              Работы на сегодня
              <span className="dashboard-today-count">{todayTasks.length}</span>
            </h2>
            <Link to="/schedule" className="dashboard-section-link">План-график</Link>
          </div>
          {todayTasks.length === 0 ? (
            <div className="dashboard-today-empty">На сегодня запланированных работ нет</div>
          ) : (
            <ul className="dashboard-today-list">
              {todayTasks.map((task) => (
                <li key={task.id} className="dashboard-today-item">
                  <div className="dashboard-today-main">
                    <Link to={`/equipment/${task.equipmentId}`} className="dashboard-today-equipment">
                      {task.equipmentName}
                    </Link>
                    {task.inventoryNumber && (
                      <span className="dashboard-today-inventory">{task.inventoryNumber}</span>
                    )}
                    <span className="dashboard-today-work">{task.workName}</span>
                  </div>
                  <div className="dashboard-today-meta">
                    {task.roomName && <span className="dashboard-today-room">{task.roomName}</span>}
                    <span className={`dashboard-today-status dashboard-today-status-${task.status}`}>
                      {task.status === 'overdue' && task.daysOverdue > 0
                        ? `Просрочена ${task.daysOverdue} дн.`
                        : TODAY_STATUS_LABELS[task.status] || task.status}
                    </span>
                    {task.nextDue && (
                      <span className="dashboard-today-due">Срок: {formatDate(task.nextDue)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="dashboard-section">
        <h2 className="dashboard-section-title">Быстрые действия</h2>
        <div className="quick-actions">
          {canView('scanner') && (
            <Link to="/scan" className="quick-action-btn">
              <ScanLine size={20} />
              <span>QR-сканер</span>
            </Link>
          )}
          {canView('equipment') && (
            <Link to="/equipment/new" className="quick-action-btn">
              <Plus size={20} />
              <span>Добавить оборудование</span>
            </Link>
          )}
          {canView('workOrders') && (
            <Link to="/work-orders" className="quick-action-btn">
              <ClipboardList size={20} />
              <span>Журнал работ</span>
            </Link>
          )}
          {canView('analytics') && (
            <Link to="/analytics" className="quick-action-btn">
              <BarChart3 size={20} />
              <span>Аналитика</span>
            </Link>
          )}
          {canView('schedule') && (
            <Link to="/schedule" className="quick-action-btn">
              <Clock size={20} />
              <span>План-график</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
