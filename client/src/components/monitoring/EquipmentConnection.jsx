import { useEffect, useState } from 'react';
import { Cable, RefreshCw } from 'lucide-react';
import { monitoringAPI } from '../../services/api';
import { invalidateMonitoringSource } from '../../services/monitoring/source';
import { useToast } from '../Toast';
import CustomSelect from '../CustomSelect';

const PROTOCOLS = [
  { value: 'modbus', label: 'Modbus TCP' },
  { value: 'mtconnect', label: 'MTConnect' },
  { value: 'opcua', label: 'OPC UA' },
  { value: 'focas', label: 'Fanuc FOCAS' },
];
const DEFAULT_PORTS = { modbus: 502, mtconnect: 5000, opcua: 4840, focas: 8193 };
const HINTS = {
  modbus: 'Регистр 0 — выключено, 1 — простой, 2 — работа, 3 — авария.',
  mtconnect: 'Агент MTConnect: ACTIVE — работа, READY — простой, STOPPED — выключено, INTERRUPTED — авария. Пустое устройство читает /current.',
  opcua: 'Один узел без шифрования. Число 0–3 или текст working, idle, off, fault.',
  focas: 'Порт 8193, cnc_statinfo. Авария — авария, пуск — работа, стоп и удержание — простой. На сервере нужна библиотека Fanuc libfwlib32.',
};

const EMPTY = {
  enabled: false,
  protocol: 'modbus',
  host: '',
  port: 502,
  unitId: 1,
  registerAddress: 0,
  signal: '',
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
  const setProtocol = (protocol) => setForm((current) => {
    const knownPorts = Object.values(DEFAULT_PORTS);
    const port = knownPorts.includes(Number(current.port)) ? DEFAULT_PORTS[protocol] : current.port;
    return { ...current, protocol, port };
  });

  const save = async () => {
    setSaving(true);
    try {
      const response = await monitoringAPI.saveLink(equipmentId, {
        ...form,
        protocol: form.protocol || 'modbus',
        signal: form.signal || '',
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

  const connectSimulator = async () => {
    const simulator = { ...EMPTY, enabled: true, host: '127.0.0.1', port: 1502, pollIntervalSec: 10 };
    setSaving(true);
    try {
      const response = await monitoringAPI.saveLink(equipmentId, simulator);
      setForm(simulator);
      setStatus(response.data);
      invalidateMonitoringSource();
      toast.success('Эмулятор подключён. Состояние обновится после опроса.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Не удалось подключить эмулятор');
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
        protocol: form.protocol || 'modbus',
        signal: form.signal || '',
        pollIntervalSec: Number(form.pollIntervalSec),
      });
      const reading = response.data.value == null || response.data.value === '' ? 'без числового значения' : `значение ${response.data.value}`;
      toast.success(`Связь есть. ${reading}, состояние: ${response.data.state}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Шлюз не ответил');
    }
  };

  return (
    <section className="monitor-connection" aria-label="Подключение станка">
      <div className="monitor-panel-header">
        <div>
          <h2><Cable size={20} />Подключение к станку</h2>
          <p className="monitor-muted">{HINTS[form.protocol] || HINTS.modbus} Без подключения график остаётся демонстрационным, если демо не отключено в настройках.</p>
        </div>
      </div>
      <div className="monitor-connection-grid">
        <label className="monitor-connection-check">
          <span className={`custom-checkbox ${form.enabled ? 'checked' : ''}`}>
            <input type="checkbox" checked={form.enabled} onChange={(event) => setField('enabled', event.target.checked)} />
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Опрашивать станок
        </label>
        <div className="monitor-connection-field">
          <span>Протокол</span>
          <CustomSelect value={form.protocol || 'modbus'} onChange={setProtocol} options={PROTOCOLS} />
        </div>
        <label>Адрес<input value={form.host} onChange={(event) => setField('host', event.target.value)} placeholder="192.168.1.50" /></label>
        <label>Порт<input type="number" value={form.port} onChange={(event) => setField('port', event.target.value)} /></label>
        {form.protocol === 'modbus' && <>
          <label>Unit ID<input type="number" value={form.unitId} onChange={(event) => setField('unitId', event.target.value)} /></label>
          <label>Адрес регистра<input type="number" value={form.registerAddress} onChange={(event) => setField('registerAddress', event.target.value)} /></label>
        </>}
        {form.protocol === 'mtconnect' && <label>Устройство или путь<input value={form.signal || ''} onChange={(event) => setField('signal', event.target.value)} placeholder="/current" /></label>}
        {form.protocol === 'opcua' && <label>NodeId<input value={form.signal || ''} onChange={(event) => setField('signal', event.target.value)} placeholder="ns=2;s=Machine.Status" /></label>}
        <label>Опрос, сек<input type="number" value={form.pollIntervalSec} onChange={(event) => setField('pollIntervalSec', event.target.value)} /></label>
      </div>
      <div className="monitor-connection-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={save} disabled={saving}>Сохранить</button>
        {!status?.enabled && !form.host && <button type="button" className="btn btn-small" onClick={connectSimulator} disabled={saving}>Подключить эмулятор</button>}
        <button type="button" className="btn btn-small" onClick={test}><RefreshCw size={14} />Проверить связь</button>
        {status?.lastPolledAt && <span className="monitor-muted">Последний опрос: {new Date(status.lastPolledAt).toLocaleString('ru-RU')} · {status.lastError || status.lastState || 'нет состояния'}</span>}
      </div>
    </section>
  );
}
