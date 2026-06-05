/**
 * @fileoverview Страница справочника сотрудников.
 * Управление карточками сотрудников: добавление, редактирование,
 * удаление, поиск по ФИО и фильтрация по должности.
 */

import { useState, useEffect, useMemo } from 'react';
import { FolderTree } from 'lucide-react';
import { employeesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

/** Компонент справочника сотрудников */
function EmployeesDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    jobTitle: '',
    phone: '',
    email: ''
  });
  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка списка сотрудников при монтировании */
  useEffect(() => {
    fetchEmployees();
  }, []);

  /** Загрузка списка сотрудников с сервера */
  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      setLoading(false);
    } catch { toast.error('Ошибка загрузки'); setLoading(false); }
  };

  /** Фильтрация сотрудников по поиску */
  const filtered = useMemo(() => {
    let result = [...employees];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.lastName.toLowerCase().includes(s) ||
        e.firstName.toLowerCase().includes(s) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(s))
      );
    }
    return result;
  }, [employees, search]);

  /** Сброс формы сотрудника */
  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', middleName: '', jobTitle: '', phone: '', email: '' });
    setEditId(null);
    setShowForm(false);
  };

  /** Открытие формы редактирования сотрудника */
  const handleEdit = (emp) => {
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      middleName: emp.middleName || '',
      jobTitle: emp.jobTitle || '',
      phone: emp.phone || '',
      email: emp.email || ''
    });
    setEditId(emp.id);
    setShowForm(true);
  };

  /** Обработка отправки формы (создание/обновление сотрудника) */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      setError('Введите фамилию и имя');
      return;
    }
    try {
      const data = { ...formData };
      if (editId) {
        await employeesAPI.update(editId, data);
        toast.success('Сотрудник обновлён');
      } else {
        await employeesAPI.create(data);
        toast.success('Сотрудник добавлен');
      }
      resetForm();
      fetchEmployees();
    } catch { toast.error('Ошибка сохранения'); }
  };

  /** Удаление сотрудника с подтверждением */
  const handleDelete = async (delId) => {
    if (await confirm({ title: 'Удалить сотрудника?', message: 'Это действие нельзя отменить.', type: 'danger' })) {
      try { await employeesAPI.delete(delId); fetchEmployees(); }
      catch { toast.error('Ошибка удаления'); }
    }
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1><FolderTree size={24} />Справочник сотрудников</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить сотрудника'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование сотрудника' : 'Новый сотрудник'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Фамилия *</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Имя *</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Отчество</label>
                <input type="text" value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Должность</label>
                <input type="text" value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} placeholder="Например, инженер" />
              </div>
              <div className="form-group">
                <label>Телефон</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} className="btn">Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Панель фильтров по ФИО и должности */}
      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по ФИО, должности..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {employees.length}</div>
      </div>

      {/* Таблица сотрудников */}
      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Должность</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="5" className="no-results-cell">Сотрудники не найдены</td></tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id}>
                    <td className="td-bold">{emp.lastName} {emp.firstName} {emp.middleName}</td>
                    <td>{emp.jobTitle || '—'}</td>
                    <td>{emp.phone || '—'}</td>
                    <td>{emp.email || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => handleEdit(emp)} className="btn btn-small btn-secondary">Ред.</button>
                        <button onClick={() => handleDelete(emp.id)} className="btn btn-small btn-danger">Удал.</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmployeesDirectory;
