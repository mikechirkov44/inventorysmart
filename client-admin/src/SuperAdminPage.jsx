import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superadminAPI } from './api';
import { Building2, Users, Key, Plus, Copy, CheckCircle, Pencil, Trash2, BarChart3 } from 'lucide-react';

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
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [companyStats, setCompanyStats] = useState({});

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const res = await superadminAPI.getCompanies();
      console.log('fetchCompanies OK', res.data.length, 'companies');
      setCompanies(res.data);
    } catch (err) {
      console.error('fetchCompanies ERROR', err.response?.status, err.message);
      setError('Ошибка загрузки компаний');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (companyId) => {
    console.log('fetchStats called for', companyId);
    if (expandedCompany === companyId) {
      setExpandedCompany(null);
      return;
    }
    setExpandedCompany(companyId);
    if (companyStats[companyId]) return;
    try {
      const res = await superadminAPI.getCompanyStats(companyId);
      console.log('fetchStats OK', res.data);
      setCompanyStats(prev => ({ ...prev, [companyId]: res.data }));
    } catch (err) {
      console.error('fetchStats ERROR', err.response?.status, err.response?.data, err.message);
      setError(err.response?.data?.error || 'Ошибка загрузки статистики');
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

  const handleUpdate = async (companyId) => {
    if (!editName.trim()) return;
    setError('');
    try {
      await superadminAPI.updateCompany(companyId, editName.trim());
      setEditingId(null);
      setEditName('');
      setSuccess('Компания обновлена');
      fetchCompanies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    }
  };

  const handleDelete = async (companyId, companyName) => {
    if (!confirm(`Удалить компанию "${companyName}"? Все пользователи будут отвязаны.`)) return;
    setError('');
    try {
      await superadminAPI.deleteCompany(companyId);
      setSuccess('Компания удалена');
      fetchCompanies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const startEdit = (c) => {
    setEditingId(c.companyId);
    setEditName(c.companyName || '');
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
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Нет компаний</td></tr>
            ) : companies.map(c => (
              <tr key={c.id}>
                <td className="td-bold">
                  {editingId === c.companyId ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(c.companyId); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                      className="inline-edit"
                    />
                  ) : (
                    c.companyName || 'Без названия'
                  )}
                </td>
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
                <td>
                  {editingId === c.companyId ? (
                    <div className="sa-actions-inline">
                      <button className="btn btn-primary btn-tiny" onClick={() => handleUpdate(c.companyId)}>Сохранить</button>
                      <button className="btn btn-secondary btn-tiny" onClick={() => setEditingId(null)}>Отмена</button>
                    </div>
                  ) : (
                    <div className="sa-actions-inline">
                      <button className="btn btn-secondary btn-tiny" onClick={() => startEdit(c)} title="Редактировать"><Pencil size={12} /></button>
                      <button className="btn btn-danger btn-tiny" onClick={() => handleDelete(c.companyId, c.companyName)} title="Удалить"><Trash2 size={12} /></button>
                      <button className="btn btn-secondary btn-tiny" onClick={() => fetchStats(c.companyId)} title="Статистика"><BarChart3 size={12} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expandedCompany && companyStats[expandedCompany] && (
        <div className="sa-stats-panel">
          <h4>Статистика: {companies.find(c => c.companyId === expandedCompany)?.companyName || ''}</h4>
          <div className="sa-stats-grid">
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].counts?.equipment ?? 0}</span>
              <span className="sa-stat-label">Оборудование</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].counts?.employees ?? 0}</span>
              <span className="sa-stat-label">Сотрудники</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].counts?.works ?? 0}</span>
              <span className="sa-stat-label">Работы</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].counts?.rooms ?? 0}</span>
              <span className="sa-stat-label">Помещения</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].counts?.spareParts ?? 0}</span>
              <span className="sa-stat-label">Запчасти</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].counts?.workOrders ?? 0}</span>
              <span className="sa-stat-label">Заявки</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].pendingWorkOrders ?? 0}</span>
              <span className="sa-stat-label">Незавершённые заявки</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">{companyStats[expandedCompany].counts?.users ?? 0}</span>
              <span className="sa-stat-label">Пользователи</span>
            </div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">
                {companyStats[expandedCompany].license?.status === 'active' ? (
                  <span className="sa-badge sa-badge-success">Активна</span>
                ) : companyStats[expandedCompany].license?.status === 'demo' ? (
                  <span className="sa-badge sa-badge-warning">DEMO</span>
                ) : (
                  <span className="sa-badge sa-badge-gray">Нет</span>
                )}
              </span>
              <span className="sa-stat-label">Лицензия</span>
            </div>
          </div>
        </div>
      )}
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
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', companyId: '', positionId: '', newPassword: '' });

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

  const startEdit = (u) => {
    setEditingUser(u.id);
    setEditForm({
      fullName: u.fullName || '',
      companyId: u.companyId || '',
      positionId: u.positionId || '',
      newPassword: '',
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ fullName: '', companyId: '', positionId: '', newPassword: '' });
  };

  const handleUpdate = async (userId) => {
    setError('');
    try {
      const payload = {
        fullName: editForm.fullName,
        companyId: editForm.companyId,
        positionId: editForm.positionId || undefined,
      };
      if (editForm.newPassword.trim()) {
        payload.password = editForm.newPassword;
      }
      await superadminAPI.updateUser(userId, payload);
      setEditingUser(null);
      setSuccess('Пользователь обновлён');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    }
  };

  const handleDelete = async (userId, username) => {
    if (!confirm(`Удалить пользователя "${username}"?`)) return;
    setError('');
    try {
      await superadminAPI.deleteUser(userId);
      setSuccess('Пользователь удалён');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
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
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Нет пользователей</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                {editingUser === u.id ? (
                  <>
                    <td className="td-bold">{u.username}</td>
                    <td>
                      <input
                        type="text"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        className="inline-edit"
                        placeholder="ФИО"
                      />
                    </td>
                    <td>
                      <select
                        value={editForm.companyId}
                        onChange={(e) => setEditForm({ ...editForm, companyId: e.target.value })}
                        className="inline-edit"
                      >
                        <option value="">Без компании</option>
                        {companies.map(c => (
                          <option key={c.companyId} value={c.companyId}>{c.companyName || 'Без названия'}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={editForm.positionId}
                        onChange={(e) => setEditForm({ ...editForm, positionId: e.target.value })}
                        className="inline-edit"
                      >
                        <option value="">Не назначена</option>
                        {companies.find(c => c.companyId === editForm.companyId)?.positions?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="password"
                        value={editForm.newPassword}
                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                        className="inline-edit"
                        placeholder="Новый пароль (необязательно)"
                      />
                    </td>
                    <td>
                      <div className="sa-actions-inline">
                        <button className="btn btn-primary btn-tiny" onClick={() => handleUpdate(u.id)}>Сохранить</button>
                        <button className="btn btn-secondary btn-tiny" onClick={cancelEdit}>Отмена</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="td-bold">{u.username}</td>
                    <td>{u.fullName || '—'}</td>
                    <td>{u.companyName || '—'}</td>
                    <td>
                      {u.positionName ? (
                        <span className="sa-badge sa-badge-primary">{u.positionName}</span>
                      ) : <span className="sa-badge sa-badge-gray">Не назначена</span>}
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <div className="sa-actions-inline">
                        <button className="btn btn-secondary btn-tiny" onClick={() => startEdit(u)} title="Редактировать">
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-danger btn-tiny" onClick={() => handleDelete(u.id, u.username)} title="Удалить">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
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
