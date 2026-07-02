import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { roomsAPI, employeesAPI, equipmentAPI, worksAPI } from '../services/api';

const STEPS = [
  { id: 'room', label: 'Добавить помещение', to: '/rooms', permission: 'rooms' },
  { id: 'employee', label: 'Добавить сотрудника', to: '/employees', permission: 'employees' },
  { id: 'equipment', label: 'Добавить оборудование', to: '/equipment/new', permission: 'equipment' },
  { id: 'work', label: 'Создать плановую работу', to: '/works', permission: 'works' },
];

/**
 * Чеклист первых шагов для новой компании.
 */
export default function OnboardingChecklist() {
  const { user, canView, canEdit } = useAuth();
  const [done, setDone] = useState({});
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const storageKey = user?.companyId ? `onboarding-dismissed-${user.companyId}` : null;

  useEffect(() => {
    if (storageKey && localStorage.getItem(storageKey) === '1') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    const checks = {};
    const tasks = [];

    if (canView('rooms')) {
      tasks.push(roomsAPI.getAll().then((r) => { checks.room = r.data.length > 0; }));
    }
    if (canView('employees')) {
      tasks.push(employeesAPI.getAll().then((r) => { checks.employee = r.data.length > 0; }));
    }
    if (canView('equipment')) {
      tasks.push(equipmentAPI.getAll().then((r) => { checks.equipment = r.data.length > 0; }));
    }
    if (canView('works')) {
      tasks.push(worksAPI.getAll().then((r) => { checks.work = r.data.length > 0; }));
    }

    Promise.all(tasks).then(() => {
      setDone(checks);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, canView, storageKey]);

  const visibleSteps = STEPS.filter((s) => canView(s.permission));
  const completedCount = visibleSteps.filter((s) => done[s.id]).length;
  const allDone = visibleSteps.length > 0 && completedCount === visibleSteps.length;

  if (loading || dismissed || allDone || visibleSteps.length === 0) return null;

  const handleDismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div className="onboarding-card">
      <div className="onboarding-header">
        <div className="onboarding-title">
          <Rocket size={20} />
          <span>Первые шаги</span>
          <span className="onboarding-progress">{completedCount}/{visibleSteps.length}</span>
        </div>
        <button type="button" className="onboarding-dismiss" onClick={handleDismiss} aria-label="Скрыть">
          <X size={18} />
        </button>
      </div>
      <ul className="onboarding-steps">
        {visibleSteps.map((step) => {
          const isDone = done[step.id];
          const canGo = canEdit(step.permission) || canView(step.permission);
          return (
            <li key={step.id} className={isDone ? 'done' : ''}>
              {isDone ? <CheckCircle2 size={18} className="step-icon done" /> : <Circle size={18} className="step-icon" />}
              {canGo && !isDone ? (
                <Link to={step.to}>{step.label}</Link>
              ) : (
                <span>{step.label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
