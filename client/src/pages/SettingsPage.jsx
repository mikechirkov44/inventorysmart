import { useState, useEffect } from 'react';
import { companyAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Server, CheckCircle, XCircle } from 'lucide-react';

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

const TABS = [
  { id: 'company', label: 'Компания' },
  { id: 'users', label: 'Пользователи' },
  { id: 'positions', label: 'Должность' },
  { id: 'integrations', label: 'Интеграции' },
  { id: 'appearance', label: 'Оформление' },
];

function IntegrationsTab() {
  const [apiUrl, setApiUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('inventorysmart_api_url') || '';
    setApiUrl(stored);
    setSavedUrl(stored);
  }, []);

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

function SettingsPage() {
  const { isAdmin } = useAuth();
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
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [userFormData, setUserFormData] = useState({ username: '', password: '', fullName: '', role: 'user' });

  useEffect(() => {
    fetchCompany();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

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
      setLoading(false);
    } catch {
      setError('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Файл слишком большой (макс. 5 МБ)');
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
    setError(null);
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('companyName', companyData.companyName);
      formData.append('timezone', companyData.timezone);
      formData.append('allowInspectionWithoutQr', companyData.allowInspectionWithoutQr);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      await companyAPI.update(formData);
      setSuccess('Изменения сохранены');
      fetchCompany();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    fetchCompany();
    setSuccess('');
    setError(null);
  };

  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data);
      setUsersLoading(false);
    } catch {
      setUsersLoading(false);
    }
  };

  const resetUserForm = () => {
    setUserFormData({ username: '', password: '', fullName: '', role: 'user' });
    setEditUserId(null);
    setShowUserForm(false);
  };

  const handleEditUser = (user) => {
    setUserFormData({ username: user.username, password: '', fullName: user.fullName || '', role: user.role });
    setEditUserId(user.id);
    setShowUserForm(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!userFormData.username.trim()) { setError('Введите логин'); return; }
    if (!editUserId && !userFormData.password) { setError('Введите пароль'); return; }

    try {
      const data = { ...userFormData };
      if (editUserId && !data.password) delete data.password;

      if (editUserId) {
        await usersAPI.update(editUserId, data);
        setSuccess('Пользователь обновлён');
      } else {
        await usersAPI.create(data);
        setSuccess('Пользователь создан');
      }
      resetUserForm();
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Удалить пользователя?')) {
      try {
        await usersAPI.delete(id);
        fetchUsers();
      } catch (err) {
        setError(err.response?.data?.error || 'Ошибка удаления');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="settings-page">
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

      <div className="settings-content">
        {activeTab === 'company' && (
          <div className="settings-section">
            <h2 className="settings-section-title">Профиль компании</h2>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="settings-card">
                <div className="form-group">
                  <label>Название предприятия</label>
                  <input
                    type="text"
                    value={companyData.companyName}
                    onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                    placeholder="Название организации"
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
                  </div>
                  <span className="logo-hint">Рекомендуемый размер: 200x200 пикселей (макс. 5 МБ)</span>
                </div>
              </div>

              <div className="settings-card settings-card-highlight">
                <div className="plan-info">
                  <span className="plan-badge">DEMO</span>
                  <span className="plan-text">Тариф активен до 28.02.2026</span>
                </div>
                <div className="plan-actions">
                  <button type="button" className="btn btn-primary btn-small">Улучшить</button>
                  <button type="button" className="btn btn-secondary btn-small">Продлить</button>
                </div>
              </div>

              <div className="settings-card">
                <h3 className="settings-card-title">Региональные настройки и настройки осмотров</h3>

                <div className="form-group">
                  <label>Часовой пояс</label>
                  <select
                    value={companyData.timezone}
                    onChange={(e) => setCompanyData({ ...companyData, timezone: e.target.value })}
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
                    />
                    <span className="checkbox-text">
                      <span className="checkbox-text-main">Разрешить осмотры и запросы без QR-кода</span>
                      <span className="checkbox-text-hint">Разрешить выполнение осмотров и создание проблем без сканирования QR оборудования</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="settings-actions">
                <button type="button" onClick={handleCancel} className="btn">Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="settings-section">
            <h2 className="settings-section-title">Пользователи</h2>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

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
                        <label>Роль</label>
                        <select value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}>
                          <option value="user">Пользователь</option>
                          <option value="admin">Администратор</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-actions-inline">
                      <button type="submit" className="btn btn-primary">{editUserId ? 'Обновить' : 'Создать'}</button>
                      <button type="button" onClick={resetUserForm} className="btn">Отмена</button>
                    </div>
                  </form>
                </div>
              )}

              {usersLoading ? (
                <div className="loading">Загрузка...</div>
              ) : (
                <div className="table-container">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Логин</th>
                          <th>ФИО</th>
                          <th>Роль</th>
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
                              <span className={`status-badge ${u.role === 'admin' ? 'status-under-repair' : 'status-working'}`}>
                                {u.role === 'admin' ? 'Администратор' : 'Пользователь'}
                              </span>
                            </td>
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

        {activeTab === 'positions' && (
          <div className="settings-section">
            <h2 className="settings-section-title">Должности</h2>
            <p className="settings-placeholder">Настройка должностей будет доступна в следующем обновлении.</p>
          </div>
        )}

        {activeTab === 'integrations' && (
          <IntegrationsTab />
        )}

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
