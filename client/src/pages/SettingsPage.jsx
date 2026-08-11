/**
 * @fileoverview Страница настроек системы.
 * Включает вкладки: профиль компании, пользователи, роли,
 * интеграции и оформление. Управление лицензией и правами доступа.
 */

import { useState, useEffect } from 'react';
import { companyAPI, usersAPI, positionsAPI, jobPositionsAPI, employeesAPI, licenseAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Server, CheckCircle, XCircle, Shield, Settings, Copy, Pencil, Trash2, Key } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import ActionsMenu from '../components/ActionsMenu';
import Toggle from '../components/Toggle';
import PasswordInput from '../components/PasswordInput';
import UploadImage from '../components/UploadImage';
import AppearanceTab from '../components/AppearanceTab';
import ActivityHistoryTab from '../components/ActivityHistoryTab';
import KpiFormulaBuilder from '../components/KpiFormulaBuilder';
import KpiIndicatorsTab from '../components/KpiIndicatorsTab';
import PageHeader from '../components/PageHeader';
import { SkeletonTable, SkeletonPage } from '../components/Skeleton';
import {
  MobileDataCards, MobileDataCard, MobileDataCardTitle, MobileDataCardRow, MobileDataCardActions,
} from '../components/MobileDataCard';
import { formatDate } from '../utils/date';

/** Список доступных часовых поясов */
const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: '(GMT+2:00) Kaliningrad' },
  { value: 'Europe/Moscow', label: '(GMT+3:00) Istanbul, Minsk, Moscow, St. Petersburg, Volgograd' },
  { value: 'Europe/Samara', label: '(GMT+4:00) Samara, Ulyanovsk' },
  { value: 'Asia/Yekaterinburg', label: '(GMT+5:00) Yekaterinburg' },
  { value: 'Asia/Omsk', label: '(GMT+6:00) Omsk' },
  { value: 'Asia/Krasnoyarsk', label: '(GMT+7:00) Krasnoyarsk, Novosibirsk' },
  { value: 'Asia/Irkutsk', label: '(GMT+8:00) Irkutsk' },
  { value: 'Asia/Yakutsk', label: '(GMT+9:00) Yakutsk' },
  { value: 'Asia/Vladivostok', label: '(GMT+10:00) Vladivostok' },
  { value: 'Asia/Magadan', label: '(GMT+11:00) Magadan' },
  { value: 'Asia/Kamchatka', label: '(GMT+12:00) Kamchatka' },
];

/** Метки прав доступа для отображения */
const PERMISSION_LABELS = {
  equipment: 'Оборудование',
  employees: 'Сотрудники',
  works: 'Работы',
  rooms: 'Помещения',
  spareParts: 'ЗИП',
  workOrders: 'Журнал',
  sparePartsReceipts: 'Документы ЗИП',
  scanner: 'QR-сканер',
  schedule: 'План-график',
  incidents: 'Инциденты',
  analytics: 'Аналитика',
  import: 'Импорт',
  instructions: 'Инструкции',
  commonFaults: 'Типовые неисправности',
  causes: 'Причины возникновения',
  overdueReasons: 'Причины просрочки',
  settings: 'Настройки',
};

/** Значения уровней доступа */
const PERM_VALUES = {
  full: 'Полный доступ',
  view: 'Только чтение',
  none: 'Нет доступа',
};

/** Вкладки настроек */
const TABS = [
  { id: 'history', label: 'История' },
  { id: 'company', label: 'Компания' },
  { id: 'users', label: 'Пользователи' },
  { id: 'positions', label: 'Роли' },
  { id: 'jobPositions', label: 'Должности и KPI' },
  { id: 'indicators', label: 'Показатели' },
  { id: 'integrations', label: 'Интеграции' },
  { id: 'appearance', label: 'Оформление' },
];

const LICENSE_STATUS_LABELS = {
  active: 'Активна',
  demo: 'Демо-режим',
  expired: 'Истекла',
  invalid: 'Недействительна',
  blocked: 'Заблокирована',
};

function getLicenseBadgeClass(status) {
  if (status === 'active') return 'license-active';
  if (status === 'demo') return 'license-demo';
  if (status === 'blocked') return 'license-blocked';
  return 'license-expired';
}

/** Генерация случайного API ключа */
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Вкладка настроек подключения к API-серверу */
function IntegrationsTab() {
  const [apiUrl, setApiUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSettingsLoading, setApiSettingsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const toast = useToast();

  /** Загрузка сохранённого URL из localStorage и API настроек */
  useEffect(() => {
    const stored = localStorage.getItem('inventorysmart_api_url') || '';
    setApiUrl(stored);
    setSavedUrl(stored);
    
    // Load API settings from company
    companyAPI.get().then(res => {
      if (res.data) {
        setApiEnabled(res.data.apiEnabled || false);
        setApiKey(res.data.apiKey || '');
      }
      setApiSettingsLoading(false);
    }).catch(() => {
      setApiSettingsLoading(false);
    });
  }, []);

  /** Проверка соединения с API-сервером */
  const handleTest = async () => {
    if (!apiUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/health`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      setTestResult({ ok: true, message: `Сервер доступен (${data.status || 'ok'})` });
    } catch (e) {
      setTestResult({ ok: false, message: `Ошибка: ${e.name === 'TimeoutError' ? 'Таймаут' : e.message}` });
    }
    setTesting(false);
  };

  /** Сохранение URL API-сервера в localStorage */
  const handleSave = () => {
    const url = apiUrl.trim();
    if (url && !url.startsWith('http')) {
      alert('URL должен начинаться с http:// или https://');
      return;
    }
    if (url) {
      localStorage.setItem('inventorysmart_api_url', url);
    } else {
      localStorage.removeItem('inventorysmart_api_url');
    }
    setSavedUrl(url);
    setSuccess('Настройки API сохранены. Перезагрузите страницу для применения.');
    setTimeout(() => setSuccess(''), 5000);
  };

  /** Сброс URL API на значение по умолчанию */
  const handleReset = () => {
    localStorage.removeItem('inventorysmart_api_url');
    setApiUrl('');
    setSavedUrl('');
    setTestResult(null);
    setSuccess('URL сброшен на значение по умолчанию. Перезагрузите страницу.');
    setTimeout(() => setSuccess(''), 5000);
  };

  /** Сохранение настроек API доступа */
  const handleSaveApiSettings = async () => {
    setSaving(true);
    try {
      await companyAPI.update({
        apiEnabled,
        apiKey
      });
      setSuccess('Настройки API доступа сохранены.');
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      toast.error('Ошибка', 'Не удалось сохранить настройки API');
    }
    setSaving(false);
  };

  /** Генерация нового API ключа */
  const handleGenerateApiKey = () => {
    const newKey = generateApiKey();
    setApiKey(newKey);
  };

  /** Копирование API ключа в буфер обмена */
  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('Скопировано', 'API ключ скопирован в буфер обмена');
  };

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Подключение к серверу</h2>
      <p className="settings-section-desc">Укажите адрес API сервера для подключения к базе данных. По умолчанию используется текущий сервер (/api).</p>

      {success && <div className="success">{success}</div>}

      <div className="settings-card">
        <div className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={18} /> API сервер
        </div>

        <div className="form-group">
          <label>URL API</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3001 (пусто = по умолчанию)"
          />
          <span className="form-hint">Текущий: <strong>{savedUrl || '/api (текущий сервер)'}</strong></span>
        </div>

        <div className="form-actions-inline" style={{ gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing || !apiUrl.trim()}
          >
            {testing ? 'Проверка...' : 'Проверить соединение'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
          >
            Сохранить
          </button>
          {savedUrl && (
            <button type="button" className="btn" onClick={handleReset}>Сбросить</button>
          )}
        </div>

        {testResult && (
          <div className={`test-result ${testResult.ok ? 'test-ok' : 'test-fail'}`} style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            {testResult.ok ? <CheckCircle size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}
            <span style={{ color: testResult.ok ? 'var(--success)' : 'var(--danger)' }}>{testResult.message}</span>
          </div>
        )}
      </div>

      <h2 className="settings-section-title" style={{ marginTop: 32 }}>Открытый API</h2>
      <p className="settings-section-desc">Настройте доступ к данным оборудования для внешних сервисов через API.</p>

      <div className="settings-card">
        <div className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} /> Доступ по API ключу
        </div>

        {apiSettingsLoading ? (
          <div className="form-group">Загрузка...</div>
        ) : (
          <>
            <div className="form-group">
              <Toggle
                label="Включить API доступ"
                checked={apiEnabled}
                onChange={(checked) => setApiEnabled(checked)}
              />
              <span className="form-hint">Разрешить внешним сервисам получать данные об оборудовании по API ключу.</span>
            </div>

            {apiEnabled && (
              <>
                <div className="form-group">
                  <label>API ключ</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Нажмите 'Сгенерировать' для создания ключа"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? 'Скрыть' : 'Показать'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCopyApiKey}
                      disabled={!apiKey}
                      title="Копировать в буфер обмена"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <span className="form-hint">Передайте этот ключ внешнему сервису для доступа к данным.</span>
                </div>

                <div className="form-group">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleGenerateApiKey}
                  >
                    Сгенерировать новый ключ
                  </button>
                  <span className="form-hint" style={{ color: 'var(--warning)' }}>Внимание: генерация нового ключа отзовёт старый ключ и потребует обновления настроек во внешних сервисах.</span>
                </div>

                <div className="form-group" style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 8, marginTop: 16 }}>
                  <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>Использование API:</label>
                  <code style={{ display: 'block', background: 'var(--gray-100)', padding: 12, borderRadius: 4, fontSize: 13, wordBreak: 'break-all' }}>
                    GET /api/public/equipment<br />
                    Header: X-API-Key: {apiKey || 'ваш-api-ключ'}
                  </code>
                  <a 
                    href="/help#api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: 'var(--primary)' }}
                  >
                    Подробная документация →
                  </a>
                </div>
              </>
            )}

            <div className="form-actions-inline" style={{ gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveApiSettings}
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки API'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Вкладка управления ролями и правами доступа */
function PositionsTab() {
  const { canEdit, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [readOnlyForm, setReadOnlyForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', permissions: {} });
  const canEditSettings = canEdit('settings');
  const canViewRows = user?.positionName === 'Руководитель';

  /** Загрузка ролей при монтировании */
  useEffect(() => { fetchPositions(); }, []);

  /** Загрузка списка ролей с сервера */
  const fetchPositions = async () => {
    try {
      const res = await positionsAPI.getAll();
      setPositions(res.data);
      setLoading(false);
    } catch {
      toast.error('Ошибка загрузки ролей');
      setLoading(false);
    }
  };

  /** Сброс формы роли */
  const resetForm = () => {
    setFormData({ name: '', permissions: {} });
    setEditId(null);
    setReadOnlyForm(false);
    setShowForm(false);
  };

  /** Открытие формы редактирования роли */
  const handleEdit = (pos) => {
    setFormData({ name: pos.name, permissions: { ...pos.permissions } });
    setEditId(pos.id);
    setReadOnlyForm(false);
    setShowForm(true);
  };

  const handleView = (pos) => {
    setFormData({ name: pos.name, permissions: { ...pos.permissions } });
    setEditId(pos.id);
    setReadOnlyForm(true);
    setShowForm(true);
  };

  /** Дублирование роли */
  const handleDuplicate = (pos) => {
    setFormData({ name: pos.name + ' (копия)', permissions: { ...pos.permissions } });
    setEditId(null);
    setShowForm(true);
  };

  /** Обновление права доступа для роли */
  const handlePermChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Введите название роли'); return; }
    try {
      if (editId) {
        await positionsAPI.update(editId, formData);
        toast.success('Роль обновлена');
      } else {
        await positionsAPI.create(formData);
        toast.success('Роль создана');
      }
      resetForm();
      fetchPositions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  /** Удаление роли с предупреждением о последствиях */
  const handleDelete = async (id) => {
    if (await confirm('Удалить роль? Пользователи с этой ролью потеряют доступ.')) {
      try {
        await positionsAPI.delete(id);
        fetchPositions();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Ошибка удаления');
      }
    }
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Роли</h2>
      <p className="settings-section-desc">Роли определяют только права доступа пользователей к разделам системы.</p>

      <div className="settings-card">
        <div className="settings-card-header">
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} /> Роли доступа
          </h3>
          {canEditSettings && (
            <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary btn-small">
              {showForm ? 'Закрыть' : '+ Добавить'}
            </button>
          )}
        </div>

        {showForm && (
          <div className="settings-user-form">
            <h4>{editId ? 'Редактирование роли' : 'Новая роль'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название *</label>
                <input disabled={readOnlyForm} type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="permissions-grid">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                  const val = formData.permissions[key];
                  const isBoolean = typeof val === 'boolean' || key === 'scanner' || key === 'schedule' || key === 'analytics' || key === 'import';
                  const isInstructions = key === 'instructions';
                  return (
                    <div key={key} className="permission-row">
                      <span className="permission-label">{label}</span>
                      {isBoolean ? (
                        <Toggle
                          checked={val === true}
                          onChange={(checked) => handlePermChange(key, checked)}
                          label=""
                          disabled={readOnlyForm}
                        />
                      ) : isInstructions ? (
                        <CustomSelect
                          value={val || 'none'}
                          onChange={(v) => handlePermChange(key, v)}
                          options={[
                            { value: 'full', label: 'Полный доступ' },
                            { value: 'view', label: 'Только просмотр' },
                            { value: 'none', label: 'Нет доступа' },
                          ]}
                          disabled={readOnlyForm}
                        />
                      ) : (
                        <CustomSelect
                          value={val || 'none'}
                          onChange={(v) => handlePermChange(key, v)}
                          options={[
                            { value: 'full', label: 'Полный доступ' },
                            { value: 'view', label: 'Только чтение' },
                            { value: 'none', label: 'Нет доступа' },
                          ]}
                          disabled={readOnlyForm}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="form-actions-inline">
                {!readOnlyForm && <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Создать'}</button>}
                <button type="button" onClick={resetForm} className="btn">Отмена</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Права доступа</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr key={pos.id} className={canEditSettings ? 'row-interactive' : canViewRows ? 'row-interactive row-readonly' : ''}
                    onClick={() => canEditSettings ? handleEdit(pos) : canViewRows ? handleView(pos) : undefined}>
                    <td className="td-bold">{pos.name}</td>
                    <td>
                      <div className="permissions-summary">
                        {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                          const val = pos.permissions[key];
                          if (val === undefined || val === null || val === 'none' || val === false) return null;
                          const display = typeof val === 'boolean' ? (val ? 'Да' : 'Нет') : PERM_VALUES[val] || val;
                          return <span key={key} className="permission-badge">{label}: {display}</span>;
                        })}
                      </div>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      {canEditSettings && (
                        <ActionsMenu items={[
                          { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(pos) },
                          { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(pos) },
                          { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(pos.id), danger: true },
                        ]} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function JobPositionsTab() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [readOnlyForm, setReadOnlyForm] = useState(false);
  const emptyConfig = { enabled: false, tokens: [], thresholds: [] };
  const [formData, setFormData] = useState({ name: '', kpiConfig: emptyConfig });
  const isAdministrator = user?.role === 'admin' || user?.role === 'superadmin' || user?.positionName === 'Администратор';
  const canViewRows = user?.positionName === 'Руководитель';

  const load = async () => {
    try {
      const response = await jobPositionsAPI.getAll();
      setItems(response.data);
      if (isAdministrator || canViewRows) {
        const metricsResponse = await jobPositionsAPI.getKpiMetrics();
        setMetrics(metricsResponse.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Не удалось загрузить должности');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setFormData({ name: '', kpiConfig: emptyConfig });
    setEditId(null);
    setReadOnlyForm(false);
    setShowForm(false);
  };

  const edit = (item) => {
    setFormData({ name: item.name, kpiConfig: item.kpiConfig || emptyConfig });
    setEditId(item.id);
    setReadOnlyForm(false);
    setShowForm(true);
  };

  const view = (item) => {
    setFormData({ name: item.name, kpiConfig: item.kpiConfig || emptyConfig });
    setEditId(item.id);
    setReadOnlyForm(true);
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) return toast.error('Введите название должности');
    try {
      if (editId) await jobPositionsAPI.update(editId, formData);
      else await jobPositionsAPI.create(formData);
      toast.success(editId ? 'Должность обновлена' : 'Должность создана');
      reset();
      load();
    } catch (error) { toast.error(error.response?.data?.error || 'Не удалось сохранить должность'); }
  };

  const remove = async (id) => {
    if (!await confirm('Удалить должность? У сотрудников она станет не назначена.')) return;
    try { await jobPositionsAPI.delete(id); load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Не удалось удалить должность'); }
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;
  return (
    <div className="settings-section">
      <h2 className="settings-section-title">Справочник должностей</h2>
      <p className="settings-section-desc">Должность назначается сотруднику и определяет формулу его KPI. Она не управляет доступом к системе.</p>
      {!isAdministrator && <div className="info-banner">Просмотр доступен. Создавать должности и изменять KPI может только администратор.</div>}
      <div className="settings-card">
        <div className="settings-card-header">
          <h3 className="settings-card-title">Должности сотрудников</h3>
          {isAdministrator && <button className="btn btn-primary btn-small" onClick={() => { reset(); setShowForm(true); }}>+ Добавить</button>}
        </div>
        {showForm && (isAdministrator || canViewRows) && (
          <div className="settings-user-form">
            <form onSubmit={submit}>
              <div className="form-group"><label>Название должности *</label><input disabled={readOnlyForm} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} /></div>
              <KpiFormulaBuilder readOnly={readOnlyForm} value={formData.kpiConfig} metrics={metrics} onChange={(kpiConfig) => setFormData((prev) => ({ ...prev, kpiConfig }))} />
              <div className="form-actions-inline">{!readOnlyForm && <button className="btn btn-primary" type="submit">Сохранить</button>}<button className="btn" type="button" onClick={reset}>Закрыть</button></div>
            </form>
          </div>
        )}
        <div className="table-container"><div className="table-scroll"><table className="data-table">
          <thead><tr><th>Должность</th><th>KPI</th>{isAdministrator && <th>Действия</th>}</tr></thead>
          <tbody>{items.map((item) => <tr key={item.id} className={isAdministrator ? 'row-interactive' : canViewRows ? 'row-interactive row-readonly' : ''}
            onClick={() => isAdministrator ? edit(item) : canViewRows ? view(item) : undefined}>
            <td className="td-bold">{item.name}</td>
            <td>{item.kpiConfig?.enabled ? <span className="status-badge status-completed">Настроен</span> : <span className="text-muted">Не задан</span>}</td>
            {isAdministrator && <td onClick={(event) => event.stopPropagation()}><ActionsMenu items={[{ icon: <Pencil size={14} />, label: 'Изменить', onClick: () => edit(item) }, { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => remove(item.id), danger: true }]} /></td>}
          </tr>)}</tbody>
        </table></div></div>
      </div>
    </div>
  );
}

/** Основной компонент страницы настроек */
function SettingsPage() {
  const { canEdit, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('company');
  const [companyData, setCompanyData] = useState({
    companyName: '',
    logo: '',
    timezone: 'Europe/Moscow',
    allowInspectionWithoutQr: true,
    useRca: true,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [readOnlyUserForm, setReadOnlyUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({ username: '', password: '', fullName: '', positionId: '', employeeId: '' });

  const [positions, setPositions] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [license, setLicense] = useState(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activating, setActivating] = useState(false);

  const isSettingsReadOnly = canEdit('settings') === false;
  const isManager = user?.positionName === 'Руководитель';

  /** Загрузка данных компании при монтировании */
  useEffect(() => {
    fetchCompany();
  }, []);

  /** Загрузка данных при смене вкладки */
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
      fetchPositions();
      fetchEmployees();
    }
    if (activeTab === 'positions') fetchPositions();
  }, [activeTab]);

  /** Загрузка данных компании и лицензии */
  const fetchCompany = async () => {
    try {
      const res = await companyAPI.get();
      setCompanyData({
        companyName: res.data.companyName || '',
        logo: res.data.logo || '',
        logoUrl: res.data.logoUrl || '',
        timezone: res.data.timezone || 'Europe/Moscow',
        allowInspectionWithoutQr: res.data.allowInspectionWithoutQr,
        useRca: res.data.useRca !== false,
      });
      if (res.data.logo) {
        setLogoPreview(null);
      }
      setLicense(res.data.license || null);
      setLoading(false);
    } catch {
      toast.error('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  /** Обработка загрузки логотипа компании */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Файл слишком большой (макс. 5 МБ)');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('companyName', companyData.companyName);
      formData.append('timezone', companyData.timezone);
      formData.append('allowInspectionWithoutQr', companyData.allowInspectionWithoutQr);
      formData.append('useRca', companyData.useRca);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      await companyAPI.update(formData);
      toast.success('Изменения сохранены');
      fetchCompany();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  /** Отмена изменений и перезагрузка данных */
  const handleCancel = () => {
    fetchCompany();
  };

  /** Загрузка списка пользователей */
  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data);
      setUsersLoading(false);
    } catch {
      setUsersLoading(false);
    }
  };

  /** Загрузка списка ролей */
  const fetchPositions = async () => {
    try {
      const res = await positionsAPI.getAll();
      setPositions(res.data);
    } catch {}
  };

  /** Загрузка списка сотрудников */
  const fetchEmployees = async () => {
    try {
      const res = await employeesAPI.getAll();
      setEmployees(res.data);
    } catch {}
  };

  /** Активация лицензионного ключа */
  const handleActivateLicense = async () => {
    if (!licenseKeyInput.trim()) return;
    setActivating(true);
    try {
      const res = await licenseAPI.activate(licenseKeyInput.trim());
      setLicenseKeyInput('');
      toast.success('Лицензия активирована');
      setLicense({
        status: 'active',
        plan: res.data.plan,
        expiresAt: res.data.expiresAt,
      });
      fetchCompany();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка активации');
    } finally {
      setActivating(false);
    }
  };

  /** Сброс формы пользователя */
  const resetUserForm = () => {
    setUserFormData({ username: '', password: '', fullName: '', positionId: '', employeeId: '' });
    setEditUserId(null);
    setReadOnlyUserForm(false);
    setShowUserForm(false);
  };

  /** Открытие формы редактирования пользователя */
  const handleEditUser = (user) => {
    setUserFormData({
      username: user.username,
      password: '',
      fullName: user.fullName || '',
      positionId: user.positionId || '',
      employeeId: user.employeeId || ''
    });
    setEditUserId(user.id);
    setReadOnlyUserForm(false);
    setShowUserForm(true);
  };

  const handleViewUser = (item) => {
    setUserFormData({ username: item.username, password: '', fullName: item.fullName || '', positionId: item.positionId || '', employeeId: item.employeeId || '' });
    setEditUserId(item.id);
    setReadOnlyUserForm(true);
    setShowUserForm(true);
  };

  /** Обработка отправки формы пользователя */
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userFormData.username.trim()) { toast.error('Введите логин'); return; }
    if (!editUserId && !userFormData.password) { toast.error('Введите пароль'); return; }

    try {
      const data = { ...userFormData };
      if (editUserId && !data.password) delete data.password;
      if (!data.positionId) delete data.positionId;
      if (!data.employeeId) delete data.employeeId;

      if (editUserId) {
        await usersAPI.update(editUserId, data);
        toast.success('Пользователь обновлён');
      } else {
        await usersAPI.create(data);
        toast.success('Пользователь создан');
      }
      resetUserForm();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  /** Удаление пользователя с подтверждением */
  const handleDeleteUser = async (id) => {
    if (await confirm('Удалить пользователя?')) {
      try {
        await usersAPI.delete(id);
        fetchUsers();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Ошибка удаления');
      }
    }
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="settings-page">
      <PageHeader icon={Settings} title="Настройки" />
      {/* Навигация по вкладкам */}
      <div className="settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Содержимое активной вкладки */}
      <div className="settings-content">
        {/* Вкладка «Компания» */}
        {activeTab === 'company' && (
          <div className="settings-section">
            <h2 className="settings-section-title">Профиль компании</h2>

            <form onSubmit={handleSubmit}>
              <div className="settings-card">
                <div className="form-group">
                  <label>Название предприятия</label>
                  <input
                    type="text"
                    value={companyData.companyName}
                    onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                    placeholder="Название организации"
                    disabled={isSettingsReadOnly}
                  />
                </div>

                <div className="form-group">
                  <label>Логотип</label>
                  <div className="logo-upload-row">
                    {(logoPreview || companyData.logo) && (
                      <div className="logo-preview">
                        <UploadImage
                          src={logoPreview || undefined}
                          item={companyData}
                          field="logo"
                          alt="Логотип"
                        />
                      </div>
                    )}
                    {!isSettingsReadOnly && (
                      <label className="btn btn-secondary logo-upload-btn">
                        <Upload size={16} />
                        <span>Загрузить</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                  <span className="logo-hint">Рекомендуемый размер: 200x200 пикселей (макс. 5 МБ)</span>
                </div>
              </div>

              <div className="settings-card company-license-card">
                <h3 className="settings-card-title">Лицензия</h3>
                {license ? (
                  <div className="company-license-info">
                    <span className={`license-badge ${getLicenseBadgeClass(license.status)}`}>
                      {LICENSE_STATUS_LABELS[license.status] || license.status}
                    </span>
                    {license.status === 'active' && (
                      <div className="company-license-details">
                        <div className="company-license-row">
                          <span className="company-license-label">Тариф</span>
                          <span className="company-license-value">{license.plan}</span>
                        </div>
                        <div className="company-license-row">
                          <span className="company-license-label">Действует до</span>
                          <span className="company-license-value">{formatDate(license.expiresAt)}</span>
                        </div>
                      </div>
                    )}
                    {license.status === 'demo' && (
                      <div className="company-license-details">
                        <div className="company-license-row">
                          <span className="company-license-label">Осталось</span>
                          <span className="company-license-value">{license.daysLeft} раб. дн.</span>
                        </div>
                        {license.demoEnd && (
                          <div className="company-license-row">
                            <span className="company-license-label">Демо до</span>
                            <span className="company-license-value">{formatDate(license.demoEnd)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(license.status === 'expired' || license.status === 'invalid' || license.status === 'blocked') && license.message && (
                      <p className="company-license-message">{license.message}</p>
                    )}
                  </div>
                ) : (
                  <p className="company-license-message">Нет данных о лицензии</p>
                )}
              </div>

              <div className="settings-card">
                <h3 className="settings-card-title">
                  <Key size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  Активация лицензии
                </h3>
                <div className="plan-actions">
                  <input
                    type="text"
                    className="license-key-input"
                    placeholder="Введите лицензионный ключ"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    disabled={activating}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    onClick={handleActivateLicense}
                    disabled={activating || !licenseKeyInput.trim()}
                  >
                    {activating ? 'Активация...' : 'Активировать'}
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <h3 className="settings-card-title">Региональные настройки и настройки осмотров</h3>

                <div className="form-group">
                  <label>Часовой пояс</label>
                  <CustomSelect
                  value={companyData.timezone}
                  onChange={(tz) => setCompanyData({ ...companyData, timezone: tz })}
                  options={TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
                  disabled={isSettingsReadOnly}
                />
                </div>

                <div className="form-group">
                  <Toggle
                    checked={companyData.allowInspectionWithoutQr}
                    onChange={(checked) => setCompanyData({ ...companyData, allowInspectionWithoutQr: checked })}
                    label="Разрешить осмотры и запросы без QR-кода"
                    disabled={isSettingsReadOnly}
                  />
                  <span className="form-hint" style={{ marginTop: 4, display: 'block' }}>Разрешить выполнение осмотров и создание проблем без сканирования QR оборудования</span>
                </div>

                <div className="form-group">
                  <Toggle
                    checked={companyData.useRca}
                    onChange={(checked) => setCompanyData({ ...companyData, useRca: checked })}
                    label="Использовать RCA"
                    disabled={isSettingsReadOnly}
                  />
                  <span className="form-hint" style={{ marginTop: 4, display: 'block' }}>
                    При выключении инциденты работают в упрощённом режиме: без расследования RCA, 5 почему и корректирующих мероприятий. Причина указывается при закрытии.
                  </span>
                </div>
              </div>

              {!isSettingsReadOnly && (
                <div className="settings-actions">
                  <button type="button" onClick={handleCancel} className="btn">Отмена</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Вкладка «Пользователи» */}
        {activeTab === 'users' && (
          <div className="settings-section">
            <h2 className="settings-section-title">Пользователи</h2>

            <div className="settings-card">
              <div className="settings-card-header">
                <h3 className="settings-card-title">Учётные записи</h3>
                {!isSettingsReadOnly && <button onClick={() => { resetUserForm(); setShowUserForm(!showUserForm); }} className="btn btn-primary btn-small">
                  {showUserForm ? 'Закрыть' : '+ Добавить'}
                </button>}
              </div>

              {showUserForm && (
                <div className="settings-user-form">
                  <h4>{editUserId ? 'Редактирование' : 'Новый пользователь'}</h4>
                  <form onSubmit={handleUserSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Логин *</label>
                        <input type="text" value={userFormData.username} onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })} disabled={!!editUserId || readOnlyUserForm} />
                      </div>
                      <div className="form-group">
                        <label>{editUserId ? 'Новый пароль (пусто = без изменений)' : 'Пароль *'}</label>
                        <PasswordInput disabled={readOnlyUserForm} value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>ФИО</label>
                        <input disabled={readOnlyUserForm} type="text" value={userFormData.fullName} onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Роль</label>
                        <CustomSelect
                          value={userFormData.positionId}
                          onChange={(v) => setUserFormData({ ...userFormData, positionId: v })}
                          placeholder="Не назначена"
                          options={positions.map(p => ({ value: p.id, label: p.name }))}
                          disabled={readOnlyUserForm}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Сотрудник</label>
                        <CustomSelect
                          value={userFormData.employeeId}
                          onChange={(v) => setUserFormData({ ...userFormData, employeeId: v })}
                          placeholder="Не привязан"
                          options={employees.map(emp => ({ value: emp.id, label: `${emp.lastName} ${emp.firstName} ${emp.middleName}` }))}
                          disabled={readOnlyUserForm}
                        />
                      </div>
                      <div className="form-group" />
                    </div>
                    <div className="form-actions-inline">
                      {!readOnlyUserForm && <button type="submit" className="btn btn-primary">{editUserId ? 'Обновить' : 'Создать'}</button>}
                      <button type="button" onClick={resetUserForm} className="btn">Отмена</button>
                    </div>
                  </form>
                </div>
              )}

              {usersLoading ? (
                <SkeletonTable rows={5} cols={6} />
              ) : (
                <>
                <div className="table-container desktop-table-only">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Логин</th>
                          <th>ФИО</th>
                          <th>Роль</th>
                          <th>Сотрудник</th>
                          <th>Создан</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className={!isSettingsReadOnly ? 'row-interactive' : isManager ? 'row-interactive row-readonly' : ''}
                            onClick={() => !isSettingsReadOnly ? handleEditUser(u) : isManager ? handleViewUser(u) : undefined}>
                            <td className="td-bold">{u.username}</td>
                            <td>{u.fullName || '—'}</td>
                            <td onClick={(event) => event.stopPropagation()}>
                              {u.positionName ? (
                                <span className="status-badge status-under-repair">{u.positionName}</span>
                              ) : <span className="status-badge status-needs-repair">Не назначена</span>}
                            </td>
                            <td>{u.employeeName || '—'}</td>
                            <td>{formatDate(u.createdAt)}</td>
                            <td>
                              {!isSettingsReadOnly && <ActionsMenu items={[
                                { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEditUser(u) },
                                { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDeleteUser(u.id), danger: true },
                              ]} />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <MobileDataCards empty={users.length === 0} emptyMessage="Пользователей нет">
                  {users.map(u => (
                    <MobileDataCard key={u.id}>
                      <MobileDataCardTitle>{u.username}</MobileDataCardTitle>
                      <MobileDataCardRow label="ФИО">{u.fullName || '—'}</MobileDataCardRow>
                      <MobileDataCardRow label="Роль">{u.positionName || 'Не назначена'}</MobileDataCardRow>
                      <MobileDataCardRow label="Сотрудник">{u.employeeName || '—'}</MobileDataCardRow>
                      <MobileDataCardRow label="Создан">{formatDate(u.createdAt)}</MobileDataCardRow>
                      {!isSettingsReadOnly && <MobileDataCardActions>
                        <ActionsMenu items={[
                          { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEditUser(u) },
                          { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDeleteUser(u.id), danger: true },
                        ]} />
                      </MobileDataCardActions>}
                    </MobileDataCard>
                  ))}
                </MobileDataCards>
                </>
              )}
            </div>
          </div>
        )}

        {/* Вкладка «Роли» */}
        {activeTab === 'positions' && (
          <PositionsTab />
        )}

        {activeTab === 'jobPositions' && <JobPositionsTab />}
        {activeTab === 'indicators' && <KpiIndicatorsTab />}

        {/* Вкладка «Интеграции» */}
        {activeTab === 'integrations' && (
          <IntegrationsTab />
        )}

        {/* Вкладка «Оформление» */}
        {activeTab === 'appearance' && (
          <AppearanceTab readOnly={isSettingsReadOnly} />
        )}
        {activeTab === 'history' && <ActivityHistoryTab />}
      </div>
    </div>
  );
}

export default SettingsPage;
