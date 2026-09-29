import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CirclePower, Play, RotateCcw, Square } from 'lucide-react';
import { monitoringAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { MachineStatusBadge } from '../components/monitoring/machineStatus';
import '../components/monitoring/monitoring.css';
import './KutezSimulatorPage.css';

export default function KutezSimulatorPage() {
  const { user, canEdit } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [duration, setDuration] = useState('60');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const isAdmin = canEdit('equipment') && (user?.role === 'admin' || user?.role === 'superadmin' || String(user?.positionName || '').trim().toLowerCase() === 'администратор');

  const refresh = useCallback(async () => {
    try {
      const response = await monitoringAPI.kutezSimulator();
      setStatus(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Эмулятор недоступен');
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    const initialize = async () => {
      try {
        const response = await monitoringAPI.kutezSimulator();
        if (cancelled) return;
        setStatus(response.data);
        if (!response.data.connected) {
          setBusy(true);
          const connected = await monitoringAPI.connectKutezSimulator();
          if (cancelled) return;
          setStatus(connected.data);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.response?.data?.error || 'Не удалось подключить тестовый сигнал');
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    initialize();
    const timer = setInterval(refresh, 2000);
    const clockTimer = setInterval(() => setClock(Date.now()), 1000);
    return () => { cancelled = true; clearInterval(timer); clearInterval(clockTimer); };
  }, [isAdmin, refresh]);

  const run = async (action) => {
    const durationSec = Number(duration);
    if (action === 'start_work' && (!Number.isInteger(durationSec) || durationSec < 1 || durationSec > 86400)) {
      setError('Укажите целое время работы от 1 до 86400 секунд');
      return;
    }
    setBusy(true);
    try {
      const response = await monitoringAPI.commandKutezSimulator(action, durationSec);
      setStatus((current) => ({ ...current, ...response.data }));
      setError('');
      toast.success('Команда отправлена эмулятору');
      await refresh();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Не удалось выполнить команду');
    } finally {
      setBusy(false);
    }
  };

  const remaining = status?.workEndsAt ? Math.max(0, Math.ceil((new Date(status.workEndsAt).getTime() - clock) / 1000)) : null;

  return <div className="monitor-page kutez-simulator-page">
    <div className="header"><div><h1><Activity size={25} /> Эмулятор Kutez FC7</h1><p>Тестовый сигнал, не управление реальным станком</p></div></div>
    {!isAdmin ? <div className="monitor-panel">Управление эмулятором доступно только администратору.</div> : <>
      {error && <div className="kutez-error" role="alert">{error}</div>}
      <div className="monitor-panel kutez-simulator-status">
        <div><span className="monitor-muted">Сигнал эмулятора (сразу)</span><h2>{status ? <MachineStatusBadge status={status} /> : 'Загрузка…'}</h2></div>
        <div><span className="monitor-muted">Статус станка (после опроса)</span><h2>{status?.polledState ? <MachineStatusBadge status={{ state: status.polledState }} /> : 'Ожидает опроса'}</h2></div>
        <div><span className="monitor-muted">Подключение</span><strong>{status?.connected ? 'Тестовый Modbus подключён' : 'Не подключено'}</strong></div>
        <div><span className="monitor-muted">До окончания работы</span><strong>{remaining == null ? '—' : `${remaining} сек`}</strong></div>
      </div>
      {!status?.connected ? <div className="monitor-panel"><p className="monitor-muted">{busy ? 'Подключаем тестовый сигнал…' : 'Тестовый сигнал не подключён'}</p></div> : <div className="monitor-panel">
        <h2>Управление состоянием</h2>
        <div className="kutez-duration"><label htmlFor="kutez-duration">Время работы, секунд</label><input id="kutez-duration" type="number" min="1" max="86400" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} /><span className="monitor-muted">После этого времени станок сам перейдёт в «Простаивает».</span></div>
        <div className="kutez-actions">
          <button className="btn" disabled={busy || status?.state !== 'off'} onClick={() => run('power_on')}><CirclePower size={18} /> Включить</button>
          <button className="btn btn-primary" disabled={busy || status?.state !== 'idle'} onClick={() => run('start_work')}><Play size={18} /> Начать работу</button>
          <button className="btn" disabled={busy || status?.state === 'off'} onClick={() => run('power_off')}><Square size={18} /> Выключить</button>
          <button className="btn" disabled={busy || status?.state === 'off' || status?.state === 'fault'} onClick={() => run('fault')}><AlertTriangle size={18} /> Авария</button>
          <button className="btn" disabled={busy || status?.state !== 'fault'} onClick={() => run('restore')}><RotateCcw size={18} /> Восстановить</button>
        </div>
      </div>}
    </>}
  </div>;
}
