import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superadminAPI } from './api';
import { Building2, Users, Key, Plus, Copy, CheckCircle } from 'lucide-react';

const SA_TABS = [
  { id: 'companies', label: 'Компании', icon: Building2 },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'licenses', label: 'Лицензии', icon: Key },
];

function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const res = await superadminAPI.getCompanies();
      setCompanies(res.data);
    } catch {
      setError('Ошибка загрузки компаний');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await superadminAPI.createCompany(newName.trim());
      setNewName('');
      setShowForm(false);
      setSuccess('Компания создана');
      fetchCompanies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="sa-section-header">
        <h3>Компании</h3>
        <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> {showForm ? 'Закрыть' : 'Добавить'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="sa-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название компании"
          />
          <button type="submit" className="btn btn-primary btn-small" disabled={creating || !newName.trim()}>
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
      )}

      <div className="sa-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Пользователей</th>
              <th>Лицензия</th>
              <th>Создана</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Нет компаний</td></tr>
            ) : companies.map(c => (
              <tr key={c.id}>
                <td className="td-bold">{c.companyName || 'Без названия'}</td>
                <td>{c.userCount}</td>
                <td>
                  {c.license ? (
                    <span className={`sa-badge ${new Date(c.license.expiresAt) < new Date() ? 'sa-badge-danger' : 'sa-badge-success'}`}>
                      {c.license.plan} до {new Date(c.license.expiresAt).toLocaleDateString('ru-RU')}
                    </span>
                  ) : (
                    <span className="sa-badge sa-badge-gray">Нет лицензии</span>
                  )}
                </td>
                <td>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', companyId: '', positionId: '', isAdmin: true });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      superadminAPI.getUsers(),
      superadminAPI.getCompanies(),
    ]).then(([usersRes, compRes]) => {
      setUsers(usersRes.data);
      setCompanies(compRes.data);
    }).catch(() => setError('Ошибка загрузки данных'))
      .finally(() => setLoading(false));
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await superadminAPI.getUsers();
      setUsers(res.data);
    } catch {
      setError('Ошибка загрузки пользователей');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password || !form.companyId) return;
    setCreating(true);
    setError('');
    try {
      const payload = {
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        companyId: form.companyId,
        positionId: form.isAdmin ? undefined : form.positionId || undefined,
      };
      await superadminAPI.createUser(payload);
      setForm({ username: '', password: '', fullName: '', companyId: '', positionId: '', isAdmin: true });
      setShowForm(false);
      setSuccess('Пользователь создан');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="sa-section-header">
        <h3>Пользователи</h3>
        <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> {showForm ? 'Закрыть' : 'Добавить'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="sa-form-grid">
          <div className="form-row">
            <div className="form-group">
              <label>Логин</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin_name"
                required
              />
            </div>
            <div className="form-group">
              <label>Пароль</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Мин. 6 символов"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>ФИО</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div className="form-group">
              <label>Компания (портал)</label>
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} required>
                <option value="">Выберите компанию</option>
                {companies.map(c => (
                  <option key={c.companyId} value={c.companyId}>{c.companyName || 'Без названия'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
                />
                <span>Администратор компании</span>
              </label>
              <span className="field-hint">Полный доступ ко всем разделам</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-small" disabled={creating || !form.username.trim() || !form.password || !form.companyId}>
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
      )}

      <div className="sa-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Логин</th>
              <th>ФИО</th>
              <th>Компания</th>
              <th>Должность</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Нет пользователей</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td className="td-bold">{u.username}</td>
                <td>{u.fullName || '—'}</td>
                <td>{u.companyName || '—'}</td>
                <td>
                  {u.positionName ? (
                    <span className="sa-badge sa-badge-primary">{u.positionName}</span>
                  ) : <span className="sa-badge sa-badge-gray">Не назначена</span>}
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LicensesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ companyId: '', plan: 'DEMO', daysValid: 30 });
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    superadminAPI.getCompanies()
      .then(res => setCompanies(res.data))
      .catch(() => setError('Ошибка загрузки компаний'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.companyId) { setError('Выберите компанию'); return; }
    setGenerating(true);
    setError('');
    setSuccess('');
    setGeneratedKey('');
    try {
      const res = await superadminAPI.generateLicense(form.companyId, form.plan, parseInt(form.daysValid));
      setGeneratedKey(res.data.key);
      setSuccess('Лицензия сгенерирована');
      setCompanies(prev => prev.map(c =>
        c.companyId === form.companyId
          ? { ...c, license: { plan: res.data.plan, expiresAt: res.data.expiresAt }, licenseKey: res.data.key }
          : c
      ));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <div className="sa-section-header">
        <h3>Генерация лицензионного ключа</h3>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleGenerate} className="sa-license-form">
        <div className="form-group">
          <label>Компания</label>
          <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">Выберите компанию</option>
            {companies.map(c => (
              <option key={c.companyId} value={c.companyId}>
                {c.companyName || 'Без названия'}
                {c.license ? ` (текущая: ${c.license.plan})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>План</label>
            <input
              type="text"
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              placeholder="DEMO"
            />
          </div>
          <div className="form-group">
            <label>Срок действия (дней)</label>
            <input
              type="number"
              min="1"
              value={form.daysValid}
              onChange={(e) => setForm({ ...form, daysValid: e.target.value })}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={generating || !form.companyId || !form.plan.trim()}>
          {generating ? 'Генерация...' : 'Сгенерировать ключ'}
        </button>
      </form>

      {generatedKey && (
        <div className="sa-generated-key">
          <label>Лицензионный ключ (отправьте клиенту):</label>
          <div className="sa-key-row">
            <input type="text" readOnly value={generatedKey} className="sa-key-display" />
            <button type="button" className="btn btn-secondary btn-small" onClick={handleCopy}>
              {copied ? <><CheckCircle size={14} /> Скопировано</> : <><Copy size={14} /> Копировать</>}
            </button>
          </div>
        </div>
      )}

      <div className="sa-section-header" style={{ marginTop: 24 }}>
        <h3>Активные лицензии</h3>
      </div>

      <div className="sa-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Компания</th>
              <th>План</th>
              <th>Действует до</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {companies.filter(c => c.license).length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Нет активных лицензий</td></tr>
            ) : companies.filter(c => c.license).map(c => (
              <tr key={c.id}>
                <td className="td-bold">{c.companyName || 'Без названия'}</td>
                <td>{c.license.plan}</td>
                <td>{new Date(c.license.expiresAt).toLocaleDateString('ru-RU')}</td>
                <td>
                  <span className={`sa-badge ${new Date(c.license.expiresAt) < new Date() ? 'sa-badge-danger' : 'sa-badge-success'}`}>
                    {new Date(c.license.expiresAt) < new Date() ? 'Истекла' : 'Активна'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState('companies');
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    if (!token) {
      navigate('/login', { replace: true });
    } else {
      setAuthorized(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_user');
    navigate('/login');
  };

  if (!authorized) return null;

  return (
    <div className="sa-page">
      <header className="sa-header">
        <h2>Суперадмин</h2>
        <button className="btn btn-small" onClick={handleLogout}>Выйти</button>
      </header>

      <div className="sa-tabs">
        {SA_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`sa-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="sa-content">
        {activeTab === 'companies' && <CompaniesTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'licenses' && <LicensesTab />}
      </div>
    </div>
  );
}

export default SuperAdminPage;
