/**
 * @fileoverview Страница настроек системы.
 * Включает вкладки: профиль компании, пользователи, должности,
 * интеграции и оформление. Управление лицензией и правами доступа.
 */

import { useState, useEffect } from 'react';
import { companyAPI, usersAPI, positionsAPI, employeesAPI, licenseAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Server, CheckCircle, XCircle, Shield } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

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
  { id: 'company', label: 'Компания' },
  { id: 'users', label: 'Пользователи' },
  { id: 'positions', label: 'Должности' },
  { id: 'integrations', label: 'Интеграции' },
  { id: 'appearance', label: 'Оформление' },
];

/** Вкладка настроек подключения к API-серверу */
function IntegrationsTab() {
  const [apiUrl, setApiUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  /** Загрузка сохранённого URL из localStorage */
  useEffect(() => {
    const stored = localStorage.getItem('inventorysmart_api_url') || '';
    setApiUrl(stored);
    setSavedUrl(stored);
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
    </div>
  );
}

/** Вкладка управления должностями и правами доступа */
function PositionsTab() {
  const { canEdit } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', permissions: {} });
  const canEditSettings = canEdit('settings');

  /** Загрузка должностей при монтировании */
  useEffect(() => { fetchPositions(); }, []);

  /** Загрузка списка должностей с сервера */
  const fetchPositions = async () => {
    try {
      const res = await positionsAPI.getAll();
      setPositions(res.data);
      setLoading(false);
    } catch {
      toast.error('Ошибка загрузки должностей');
      setLoading(false);
    }
  };

  /** Сброс формы должности */
  const resetForm = () => {
    setFormData({ name: '', permissions: {} });
    setEditId(null);
    setShowForm(false);
  };

  /** Открытие формы редактирования должности */
  const handleEdit = (pos) => {
    setFormData({ name: pos.name, permissions: { ...pos.permissions } });
    setEditId(pos.id);
    setShowForm(true);
  };

  /** Обновление права доступа для должности */
  const handlePermChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Введите название должности'); return; }
    try {
      if (editId) {
        await positionsAPI.update(editId, formData);
        toast.success('Должность обновлена');
      } else {
        await positionsAPI.create(formData);
        toast.success('Должность создана');
      }
      resetForm();
      fetchPositions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  /** Удаление должности с предупреждением о последствиях */
  const handleDelete = async (id) => {
    if (await confirm('Удалить должность? Пользователи с этой должностью потеряют доступ.')) {
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
      <h2 className="settings-section-title">Должности</h2>
      <p className="settings-section-desc">Управление должностями и правами доступа пользователей к ресурсам системы.</p>

      <div className="settings-card">
        <div className="settings-card-header">
          <h3 className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} /> Список должностей
          </h3>
          {canEditSettings && (
            <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary btn-small">
              {showForm ? 'Закрыть' : '+ Добавить'}
            </button>
          )}
        </div>

        {showForm && (
          <div className="settings-user-form">
            <h4>{editId ? 'Редактирование должности' : 'Новая должность'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="permissions-grid">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                  const val = formData.permissions[key];
                  const isBoolean = typeof val === 'boolean' || key === 'scanner' || key === 'schedule' || key === 'analytics' || key === 'import';
                  return (
                    <div key={key} className="permission-row">
                      <span className="permission-label">{label}</span>
                      {isBoolean ? (
                        <select
                          value={val === undefined ? 'false' : String(val)}
                          onChange={(e) => handlePermChange(key, e.target.value === 'true')}
                        >
                          <option value="true">Да</option>
                          <option value="false">Нет</option>
                        </select>
                      ) : (
                        <select
                          value={val || 'none'}
                          onChange={(e) => handlePermChange(key, e.target.value)}
                        >
                          <option value="full">Полный доступ</option>
                          <option value="view">Только чтение</option>
                          <option value="none">Нет доступа</option>
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="form-actions-inline">
                <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Создать'}</button>
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
                  <tr key={pos.id}>
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
                    <td>
                      <div className="table-actions">
                        {canEditSettings && <button onClick={() => handleEdit(pos)} className="btn btn-small btn-secondary">Ред.</button>}
                        {canEditSettings && <button onClick={() => handleDelete(pos.id)} className="btn btn-small btn-danger">Удал.</button>}
                      </div>
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

/** Основной компонент страницы настроек */
function SettingsPage() {
  const { canEdit } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('company');
  const [companyData, setCompanyData] = useState({
    companyName: '',
    logo: '',
    timezone: 'Europe/Moscow',
    allowInspectionWithoutQr: true,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [userFormData, setUserFormData] = useState({ username: '', password: '', fullName: '', positionId: '', employeeId: '' });

  const [positions, setPositions] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [license, setLicense] = useState(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activating, setActivating] = useState(false);

  const isSettingsReadOnly = canEdit('settings') === false;

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
        timezone: res.data.timezone || 'Europe/Moscow',
        allowInspectionWithoutQr: res.data.allowInspectionWithoutQr,
      });
      if (res.data.logo) {
        setLogoPreview(`/uploads/${res.data.logo}`);
      }
      if (res.data.licenseKey) {
        try {
          const json = atob(res.data.licenseKey);
          const decoded = JSON.parse(json);
          if (decoded.plan && decoded.expiresAt) {
            setLicense({ plan: decoded.plan, expiresAt: decoded.expiresAt });
          }
        } catch {}
      }
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

  /** Загрузка списка должностей */
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
      setLicense({ plan: res.data.plan, expiresAt: res.data.expiresAt });
      setLicenseKeyInput('');
      toast.success('Лицензия активирована');
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

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="settings-page">
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
                    {logoPreview && (
                      <div className="logo-preview">
                        <img src={logoPreview} alt="Логотип" />
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

              <div className="settings-card settings-card-highlight">
                {license && (
                  <div className="plan-info">
                    <span className="plan-badge">{license.plan}</span>
                    <span className="plan-text">Тариф активен до {new Date(license.expiresAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                )}
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
                  <select
                    value={companyData.timezone}
                    onChange={(e) => setCompanyData({ ...companyData, timezone: e.target.value })}
                    disabled={isSettingsReadOnly}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label-inline">
                    <input
                      type="checkbox"
                      checked={companyData.allowInspectionWithoutQr}
                      onChange={(e) => setCompanyData({ ...companyData, allowInspectionWithoutQr: e.target.checked })}
                      disabled={isSettingsReadOnly}
                    />
                    <span className="checkbox-text">
                      <span className="checkbox-text-main">Разрешить осмотры и запросы без QR-кода</span>
                      <span className="checkbox-text-hint">Разрешить выполнение осмотров и создание проблем без сканирования QR оборудования</span>
                    </span>
                  </label>
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
                <button onClick={() => { resetUserForm(); setShowUserForm(!showUserForm); }} className="btn btn-primary btn-small">
                  {showUserForm ? 'Закрыть' : '+ Добавить'}
                </button>
              </div>

              {showUserForm && (
                <div className="settings-user-form">
                  <h4>{editUserId ? 'Редактирование' : 'Новый пользователь'}</h4>
                  <form onSubmit={handleUserSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Логин *</label>
                        <input type="text" value={userFormData.username} onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })} disabled={!!editUserId} />
                      </div>
                      <div className="form-group">
                        <label>{editUserId ? 'Новый пароль (пусто = без изменений)' : 'Пароль *'}</label>
                        <input type="password" value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>ФИО</label>
                        <input type="text" value={userFormData.fullName} onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Должность</label>
                        <select value={userFormData.positionId} onChange={(e) => setUserFormData({ ...userFormData, positionId: e.target.value })}>
                          <option value="">Не назначена</option>
                          {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Сотрудник</label>
                        <select value={userFormData.employeeId} onChange={(e) => setUserFormData({ ...userFormData, employeeId: e.target.value })}>
                          <option value="">Не привязан</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName} {emp.middleName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" />
                    </div>
                    <div className="form-actions-inline">
                      <button type="submit" className="btn btn-primary">{editUserId ? 'Обновить' : 'Создать'}</button>
                      <button type="button" onClick={resetUserForm} className="btn">Отмена</button>
                    </div>
                  </form>
                </div>
              )}

              {usersLoading ? (
                <div className="loading-spinner">Загрузка...</div>
              ) : (
                <div className="table-container">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Логин</th>
                          <th>ФИО</th>
                          <th>Должность</th>
                          <th>Сотрудник</th>
                          <th>Создан</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id}>
                            <td className="td-bold">{u.username}</td>
                            <td>{u.fullName || '—'}</td>
                            <td>
                              {u.positionName ? (
                                <span className="status-badge status-under-repair">{u.positionName}</span>
                              ) : <span className="status-badge status-needs-repair">Не назначена</span>}
                            </td>
                            <td>{u.employeeName || '—'}</td>
                            <td>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                            <td>
                              <div className="table-actions">
                                <button onClick={() => handleEditUser(u)} className="btn btn-small btn-secondary">Ред.</button>
                                <button onClick={() => handleDeleteUser(u.id)} className="btn btn-small btn-danger">Удал.</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Вкладка «Должности» */}
        {activeTab === 'positions' && (
          <PositionsTab />
        )}

        {/* Вкладка «Интеграции» */}
        {activeTab === 'integrations' && (
          <IntegrationsTab />
        )}

        {/* Вкладка «Оформление» */}
        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h2 className="settings-section-title">Оформление</h2>
            <p className="settings-placeholder">Настройка оформления будет доступна в следующем обновлении.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
