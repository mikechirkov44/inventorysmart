import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'user'
  });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data);
      setLoading(false);
    } catch {
      toast.error('Ошибка загрузки');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', fullName: '', role: 'user' });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (user) => {
    setFormData({ username: user.username, password: '', fullName: user.fullName || '', role: user.role });
    setEditId(user.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) { toast.error('Введите логин'); return; }
    if (!editId && !formData.password) { toast.error('Введите пароль'); return; }

    try {
      const data = { ...formData };
      if (editId && !data.password) delete data.password;

      if (editId) {
        await usersAPI.update(editId, data);
        toast.success('Пользователь обновлён');
      } else {
        await usersAPI.create(data);
        toast.success('Пользователь создан');
      }
      resetForm();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ title: 'Удалить пользователя?', message: 'Это действие нельзя отменить.', type: 'danger' })) {
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
    <div className="directory-page">
      <div className="header">
        <h1>Пользователи</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование' : 'Новый пользователь'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Логин *</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!!editId} />
              </div>
              <div className="form-group">
                <label>{editId ? 'Новый пароль (пусто = без изменений)' : 'Пароль *'}</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>ФИО</label>
                <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Роль</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
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
                      <button onClick={() => handleEdit(u)} className="btn btn-small btn-secondary">Ред.</button>
                      <button onClick={() => handleDelete(u.id)} className="btn btn-small btn-danger">Удал.</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UsersPage;
