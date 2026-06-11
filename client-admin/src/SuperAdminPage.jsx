import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { superadminAPI } from './api';
import { createPortal } from 'react-dom';
import {
  Building2, Users, Key, Plus, Copy, CheckCircle, Pencil, Trash2,
  BarChart3, Search, MoreVertical, X, AlertTriangle
} from 'lucide-react';

const SA_TABS = [
  { id: 'companies', label: 'Компании', icon: Building2 },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'licenses', label: 'Лицензии', icon: Key },
];

/* ===== Reusable ActionsMenu (portal-based) ===== */
function ActionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left - 120 + rect.width / 2,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const handleClick = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
            btnRef.current && !btnRef.current.contains(e.target)) {
          setOpen(false);
        }
      };
      const handleScroll = () => setOpen(false);
      const handleResize = () => updatePosition();
      document.addEventListener('mousedown', handleClick);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [open]);

  return (
    <div className="actions-menu">
      <button ref={btnRef} className="actions-menu-btn" onClick={() => { if (!open) updatePosition(); setOpen(!open); }} aria-label="Действия">
        <MoreVertical size={16} />
      </button>
      {open && createPortal(
        <div ref={dropdownRef} className="actions-menu-dropdown" style={menuStyle}>
          {items.map((item, idx) => (
            <button key={idx} className={`actions-menu-item ${item.danger ? 'danger' : ''}`} onClick={() => { setOpen(false); item.onClick(); }}>
              {item.icon && <span className="actions-menu-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ===== Custom ConfirmModal ===== */
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Удалить', confirmDanger = true }) {
  if (!isOpen) return null;
  const modalRef = useRef(null);
  return createPortal(
    <div className="modal-overlay" ref={modalRef} onClick={(e) => { if (e.target === modalRef.current) onCancel(); }}>
      <div className="modal-container">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="modal-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <AlertTriangle size={32} color={confirmDanger ? 'var(--danger)' : 'var(--warning)'} />
            <div>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--gray-800)', lineHeight: 1.5 }}>{message}</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Отмена</button>
          <button className={`btn ${confirmDanger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ===== Toast notification ===== */
function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, showToast };
}

function Toast({ toast }) {
  if (!toast) return null;
  return createPortal(
    <div className={`toast-notification toast-${toast.type}`}>{toast.message}</div>,
    document.body
  );
}

/* ===== Companies Tab ===== */
function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [companyStats, setCompanyStats] = useState({});
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toast, showToast } = useToast();

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const res = await superadminAPI.getCompanies();
      setCompanies(res.data);
    } catch (err) {
      setError('Ошибка загрузки компаний');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (companyId) => {
    if (expandedCompany === companyId) { setExpandedCompany(null); return; }
    setExpandedCompany(companyId);
    if (companyStats[companyId]) return;
    try {
      const res = await superadminAPI.getCompanyStats(companyId);
      setCompanyStats(prev => ({ ...prev, [companyId]: res.data }));
    } catch (err) {
      setError('Ошибка загрузки статистики');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true); setError('');
    try {
      await superadminAPI.createCompany(newName.trim());
      setNewName(''); setShowForm(false);
      showToast('Компания создана');
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (company) => {
    const dupName = (company.companyName || 'Компания') + ' (копия)';
    setCreating(true); setError('');
    try {
      await superadminAPI.createCompany(dupName);
      showToast('Компания скопирована');
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка копирования');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (companyId) => {
    if (!editName.trim()) return;
    setError('');
    try {
      await superadminAPI.updateCompany(companyId, editName.trim());
      setEditingId(null); setEditName('');
      showToast('Компания обновлена');
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    }
  };

  const handleDelete = async (companyId) => {
    setError('');
    try {
      await superadminAPI.deleteCompany(companyId);
      setConfirmDelete(null);
      showToast('Компания удалена');
      fetchCompanies();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const startEdit = (c) => {
    setEditingId(c.companyId);
    setEditName(c.companyName || '');
  };

  const filteredCompanies = companies.filter(c =>
    (c.companyName || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <Toast toast={toast} />
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Удаление компании"
        message={`Вы уверены, что хотите удалить компанию «${confirmDelete?.companyName || ''}»? Все пользователи будут отвязаны. Это действие необратимо.`}
        onConfirm={() => handleDelete(confirmDelete.companyId)}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Удалить"
        confirmDanger={true}
      />

      <div className="sa-section-header">
        <h3>Компании</h3>
        <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> {showForm ? 'Закрыть' : 'Добавить'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="sa-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название компании"
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-small" disabled={creating || !newName.trim()}>
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
      )}

      <div className="sa-search-bar">
        <Search size={16} color="var(--gray-400)" />
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="sa-filter-summary">{filteredCompanies.length} из {companies.length}</span>
      </div>

      <div className="sa-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Пользователей</th>
              <th>Лицензия</th>
              <th>Создана</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>
                {search ? 'Ничего не найдено' : 'Нет компаний'}
              </td></tr>
            ) : filteredCompanies.map(c => (
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
                  ) : (c.companyName || 'Без названия')}
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
                    <ActionsMenu items={[
                      { label: 'Редактировать', icon: <Pencil size={14} />, onClick: () => startEdit(c) },
                      { label: 'Статистика', icon: <BarChart3 size={14} />, onClick: () => fetchStats(c.companyId) },
                      { label: 'Дублировать', icon: <Copy size={14} />, onClick: () => handleDuplicate(c) },
                      { label: 'Удалить', icon: <Trash2 size={14} />, danger: true, onClick: () => setConfirmDelete({ companyId: c.companyId, companyName: c.companyName }) },
                    ]} />
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
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].counts?.equipment ?? 0}</span><span className="sa-stat-label">Оборудование</span></div>
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].counts?.employees ?? 0}</span><span className="sa-stat-label">Сотрудники</span></div>
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].counts?.works ?? 0}</span><span className="sa-stat-label">Работы</span></div>
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].counts?.rooms ?? 0}</span><span className="sa-stat-label">Помещения</span></div>
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].counts?.spareParts ?? 0}</span><span className="sa-stat-label">Запчасти</span></div>
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].counts?.workOrders ?? 0}</span><span className="sa-stat-label">Заявки</span></div>
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].pendingWorkOrders ?? 0}</span><span className="sa-stat-label">Незавершённые</span></div>
            <div className="sa-stat-card"><span className="sa-stat-value">{companyStats[expandedCompany].counts?.users ?? 0}</span><span className="sa-stat-label">Пользователи</span></div>
            <div className="sa-stat-card">
              <span className="sa-stat-value">
                {companyStats[expandedCompany].license?.status === 'active' ? <span className="sa-badge sa-badge-success">Активна</span>
                  : companyStats[expandedCompany].license?.status === 'demo' ? <span className="sa-badge sa-badge-warning">DEMO</span>
                  : <span className="sa-badge sa-badge-gray">Нет</span>}
              </span>
              <span className="sa-stat-label">Лицензия</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Users Tab ===== */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', companyId: '', positionId: '', isAdmin: true });
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', companyId: '', positionId: '', newPassword: '' });
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const { toast, showToast } = useToast();

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

  const validateForm = () => {
    const errors = {};
    if (!form.username.trim()) errors.username = 'Введите логин';
    if (!form.password || form.password.length < 8) errors.password = 'Минимум 8 символов';
    if (!/[a-zA-Zа-яА-Я]/.test(form.password) || !/[0-9]/.test(form.password)) errors.password = 'Должен содержать буквы и цифры';
    if (!form.companyId) errors.company = 'Выберите компанию';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setCreating(true); setError('');
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
      setFormErrors({});
      showToast('Пользователь создан');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (user) => {
    const dupUsername = user.username + '_copy';
    const dupName = (user.fullName || user.username) + ' (копия)';
    setCreating(true); setError('');
    try {
      const payload = {
        username: dupUsername,
        password: 'TempPass1!',
        fullName: dupName,
        companyId: user.companyId || '',
        positionId: user.positionId || undefined,
      };
      await superadminAPI.createUser(payload);
      showToast('Пользователь скопирован');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка копирования');
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
      showToast('Пользователь обновлён');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления');
    }
  };

  const handleDelete = async (userId) => {
    setError('');
    try {
      await superadminAPI.deleteUser(userId);
      setConfirmDelete(null);
      showToast('Пользователь удалён');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const filteredUsers = users.filter(u =>
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.companyName || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <Toast toast={toast} />
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Удаление пользователя"
        message={`Вы уверены, что хотите удалить пользователя «${confirmDelete?.username || ''}»? Это действие необратимо.`}
        onConfirm={() => handleDelete(confirmDelete.userId)}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Удалить"
        confirmDanger={true}
      />

      <div className="sa-section-header">
        <h3>Пользователи</h3>
        <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> {showForm ? 'Закрыть' : 'Добавить'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="sa-form-grid">
          <div className="form-row">
            <div className="form-group">
              <label>Логин *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin_name"
                className={formErrors.username ? 'input-error' : ''}
              />
              {formErrors.username && <span className="field-error">{formErrors.username}</span>}
            </div>
            <div className="form-group">
              <label>Пароль *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Мин. 8 символов, буквы и цифры"
                className={formErrors.password ? 'input-error' : ''}
              />
              {formErrors.password && <span className="field-error">{formErrors.password}</span>}
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
              <label>Компания (портал) *</label>
              <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className={formErrors.company ? 'input-error' : ''}>
                <option value="">Выберите компанию</option>
                {companies.map(c => (
                  <option key={c.companyId} value={c.companyId}>{c.companyName || 'Без названия'}</option>
                ))}
              </select>
              {formErrors.company && <span className="field-error">{formErrors.company}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
                <span>Администратор компании</span>
              </label>
              <span className="field-hint">Полный доступ ко всем разделам</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-small" disabled={creating}>
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
      )}

      <div className="sa-search-bar">
        <Search size={16} color="var(--gray-400)" />
        <input
          type="text"
          placeholder="Поиск по логину, ФИО или компании..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="sa-filter-summary">{filteredUsers.length} из {users.length}</span>
      </div>

      <div className="sa-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Логин</th>
              <th>ФИО</th>
              <th>Компания</th>
              <th>Должность</th>
              <th>Создан</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>
                {search ? 'Ничего не найдено' : 'Нет пользователей'}
              </td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.id}>
                {editingUser === u.id ? (
                  <>
                    <td className="td-bold">{u.username}</td>
                    <td><input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="inline-edit" placeholder="ФИО" /></td>
                    <td>
                      <select value={editForm.companyId} onChange={(e) => setEditForm({ ...editForm, companyId: e.target.value })} className="inline-edit">
                        <option value="">Без компании</option>
                        {companies.map(c => (
                          <option key={c.companyId} value={c.companyId}>{c.companyName || 'Без названия'}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={editForm.positionId} onChange={(e) => setEditForm({ ...editForm, positionId: e.target.value })} className="inline-edit">
                        <option value="">Не назначена</option>
                        {companies.find(c => c.companyId === editForm.companyId)?.positions?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td><input type="password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} className="inline-edit" placeholder="Новый пароль" /></td>
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
                      <ActionsMenu items={[
                        { label: 'Редактировать', icon: <Pencil size={14} />, onClick: () => startEdit(u) },
                        { label: 'Дублировать', icon: <Copy size={14} />, onClick: () => handleDuplicate(u) },
                        { label: 'Удалить', icon: <Trash2 size={14} />, danger: true, onClick: () => setConfirmDelete({ userId: u.id, username: u.username }) },
                      ]} />
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

/* ===== Licenses Tab ===== */
function LicensesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ companyId: '', plan: 'DEMO', daysValid: 30 });
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();

  useEffect(() => {
    superadminAPI.getCompanies()
      .then(res => setCompanies(res.data))
      .catch(() => setError('Ошибка загрузки компаний'))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.companyId) { setError('Выберите компанию'); return; }
    setGenerating(true); setError(''); setSuccess(''); setGeneratedKey('');
    try {
      const res = await superadminAPI.generateLicense(form.companyId, form.plan, parseInt(form.daysValid));
      setGeneratedKey(res.data.key);
      showToast('Лицензия сгенерирована');
      setCompanies(prev => prev.map(c =>
        c.companyId === form.companyId
          ? { ...c, license: { plan: res.data.plan, expiresAt: res.data.expiresAt }, licenseKey: res.data.key }
          : c
      ));
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

  const filteredCompanies = companies.filter(c =>
    (c.companyName || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div>
      <Toast toast={toast} />
      <div className="sa-section-header">
        <h3>Генерация лицензионного ключа</h3>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleGenerate} className="sa-license-form">
        <div className="form-group">
          <label>Компания</label>
          <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
            <option value="">Выберите компанию</option>
            {companies.map(c => (
              <option key={c.companyId} value={c.companyId}>
                {c.companyName || 'Без названия'}{c.license ? ` (текущая: ${c.license.plan})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>План</label>
            <input type="text" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="DEMO" />
          </div>
          <div className="form-group">
            <label>Срок действия (дней)</label>
            <input type="number" min="1" value={form.daysValid} onChange={(e) => setForm({ ...form, daysValid: e.target.value })} />
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

      <div className="sa-search-bar">
        <Search size={16} color="var(--gray-400)" />
        <input type="text" placeholder="Поиск по компании..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="sa-filter-summary">{filteredCompanies.filter(c => c.license).length} лицензий</span>
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
            {filteredCompanies.filter(c => c.license).length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>Нет активных лицензий</td></tr>
            ) : filteredCompanies.filter(c => c.license).map(c => (
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

/* ===== SuperAdmin Page ===== */
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
