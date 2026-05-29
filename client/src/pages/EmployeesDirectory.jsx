import { useState, useEffect, useMemo } from 'react';
import { employeesAPI } from '../services/api';

function EmployeesDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    position: '',
    phone: '',
    email: ''
  });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      setLoading(false);
    } catch { setError('Ошибка загрузки'); setLoading(false); }
  };

  const positions = useMemo(() => {
    return [...new Set(employees.map(e => e.position).filter(Boolean))].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    let result = [...employees];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.lastName.toLowerCase().includes(s) ||
        e.firstName.toLowerCase().includes(s) ||
        (e.position && e.position.toLowerCase().includes(s))
      );
    }
    if (filterPosition) result = result.filter(e => e.position === filterPosition);
    return result;
  }, [employees, search, filterPosition]);

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', middleName: '', position: '', phone: '', email: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (emp) => {
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      middleName: emp.middleName || '',
      position: emp.position || '',
      phone: emp.phone || '',
      email: emp.email || ''
    });
    setEditId(emp.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      setError('Введите фамилию и имя');
      return;
    }
    try {
      if (editId) {
        await employeesAPI.update(editId, formData);
        setSuccess('Сотрудник обновлён');
      } else {
        await employeesAPI.create(formData);
        setSuccess('Сотрудник добавлен');
      }
      resetForm();
      fetchEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Ошибка сохранения'); }
  };

  const handleDelete = async (delId) => {
    if (window.confirm('Удалить сотрудника?')) {
      try { await employeesAPI.delete(delId); fetchEmployees(); }
      catch { setError('Ошибка удаления'); }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1>Справочник сотрудников</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить сотрудника'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

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
                <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} list="emp-positions" />
                <datalist id="emp-positions">
                  {positions.map(p => <option key={p} value={p} />)}
                </datalist>
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

      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по ФИО, должности..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
            <option value="">Все должности</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {employees.length}</div>
      </div>

      <div className="table-container">
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
                  <td>{emp.position || '—'}</td>
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
  );
}

export default EmployeesDirectory;
