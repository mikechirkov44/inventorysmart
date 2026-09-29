import { useEffect, useState } from 'react';
import { monitoringAPI } from '../../services/api';
import { MONITORING_STATES, readMonitoringMode, writeMonitoringMode } from '../../services/monitoring/model';
import './monitoring.css';

export function useMonitoringMode() {
  const [mode, setMode] = useState(readMonitoringMode);
  useEffect(() => {
    const sync = () => setMode(readMonitoringMode());
    window.addEventListener('monitoring-mode', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('monitoring-mode', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return [mode, (next) => setMode(writeMonitoringMode(next))];
}

export function useMachineStatuses(enabled = true) {
  const [map, setMap] = useState({});
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const load = () => monitoringAPI.statuses().then((response) => {
      if (cancelled) return;
      const next = {};
      for (const item of response.data || []) next[item.equipmentId] = item;
      setMap(next);
    }).catch(() => {});
    load();
    const timer = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [enabled]);
  return map;
}

export function MachineStatusBadge({ status }) {
  if (!status) return null;
  const state = MONITORING_STATES[status.state] || MONITORING_STATES.unknown;
  const label = status.state === 'unknown' ? 'Нет связи' : state.label;
  return <span className="machine-status"><i className={state.className} />{label}</span>;
}

export function EquipmentStatusBadge({ equipment, machineStatus }) {
  if (machineStatus) return <MachineStatusBadge status={machineStatus} />;
  const fallback = {
    working: { label: 'Работает', className: 'status-working' },
    under_repair: { label: 'В ремонте', className: 'status-under-repair' },
    needs_repair: { label: 'Требует ремонта', className: 'status-needs-repair' },
    reserve: { label: 'Резерв', className: 'status-reserve' },
  }[equipment.status] || { label: 'Неизвестно', className: 'status-reserve' };
  return <span className={`status-badge ${fallback.className}`}>{fallback.label}</span>;
}

export function statusSummary(statuses) {
  const list = Object.values(statuses || {});
  return {
    total: list.length,
    working: list.filter((item) => item.state === 'working').length,
    fault: list.filter((item) => item.state === 'fault').length,
    offline: list.filter((item) => item.state === 'unknown').length,
  };
}
