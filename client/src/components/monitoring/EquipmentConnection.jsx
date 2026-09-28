import { useEffect, useState } from 'react';
import { Cable, RefreshCw } from 'lucide-react';
import { monitoringAPI } from '../../services/api';
import { invalidateMonitoringSource } from '../../services/monitoring/source';
import { useToast } from '../Toast';

const EMPTY = {
  enabled: false,
  host: '',
  port: 502,
  unitId: 1,
  registerAddress: 0,
  pollIntervalSec: 30,
};

export default function EquipmentConnection({ equipmentId }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    monitoringAPI.getLink(equipmentId).then((response) => {
      if (cancelled) return;
      setForm({ ...EMPTY, ...response.data });
      setStatus(response.data);
    }).catch(() => { if (!cancelled) toast.error('Не удалось загрузить подключение'); });
    return () => { cancelled = true; };
  }, [equipmentId]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const response = await monitoringAPI.saveLink(equipmentId, {
        ...form,
        port: Number(form.port),
        unitId: Number(form.unitId),
        registerAddress: Number(form.registerAddress),
        pollIntervalSec: Number(form.pollIntervalSec),
      });
      setStatus(response.data);
      invalidateMonitoringSource();
      toast.success(form.enabled ? 'Подключение сохранено, опрос запущен' : 'Подключение выключено. Для этого станка остаются демо-данные');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Не удалось сохранить подключение');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    try {
      const response = await monitoringAPI.testLink(equipmentId, {
        ...form,
        enabled: true,
        port: Number(form.port),
        unitId: Number(form.unitId),
        registerAddress: Number(form.registerAddress),
        pollIntervalSec: Number(form.pollIntervalSec),
      });
      toast.success(`Связь есть. Регистр ${response.data.value}, состояние: ${response.data.state}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Шлюз не ответил');
    }
  };

  return (
    <section className="monitor-connection" aria-label="Подключение станка">
      <div className="monitor-panel-header">
        <div>
          <h2><Cable size={20} />Подключение к станку</h2>
          <p className="monitor-muted">Modbus TCP, шаблон шлюза: регистр 0 — выключено, 1 — простой, 2 — работа, 3 — авария. Без подключения график остаётся демонстрационным.</p>
        </div>
      </div>
      <div className="monitor-connection-grid">
        <label className="monitor-connection-check">
          <input type="checkbox" checked={form.enabled} onChange={(event) => setField('enabled', event.target.checked)} />
          Опрашивать станок
        </label>
        <label>Адрес шлюза<input value={form.host} onChange={(event) => setField('host', event.target.value)} placeholder="192.168.1.50" /></label>
        <label>Порт<input type="number" value={form.port} onChange={(event) => setField('port', event.target.value)} /></label>
        <label>Unit ID<input type="number" value={form.unitId} onChange={(event) => setField('unitId', event.target.value)} /></label>
        <label>Адрес регистра<input type="number" value={form.registerAddress} onChange={(event) => setField('registerAddress', event.target.value)} /></label>
        <label>Опрос, сек<input type="number" value={form.pollIntervalSec} onChange={(event) => setField('pollIntervalSec', event.target.value)} /></label>
      </div>
      <div className="monitor-connection-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={save} disabled={saving}>Сохранить</button>
        <button type="button" className="btn btn-small" onClick={test}><RefreshCw size={14} />Проверить связь</button>
        {status?.lastPolledAt && <span className="monitor-muted">Последний опрос: {new Date(status.lastPolledAt).toLocaleString('ru-RU')} · {status.lastError || status.lastState || 'нет состояния'}</span>}
      </div>
    </section>
  );
}
