import { useState, useEffect, useMemo } from 'react';
import { worksAPI } from '../services/api';

function WorksDirectory() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequencyDays: 30,
    category: ''
  });

  useEffect(() => {
    fetchWorks();
  }, []);

  const fetchWorks = async () => {
    try {
      const response = await worksAPI.getAll();
      setWorks(response.data);
      setLoading(false);
    } catch (err) {
      setError('Ошибка загрузки справочника работ');
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    return [...new Set(works.map(w => w.category).filter(Boolean))].sort();
  }, [works]);

  const filtered = useMemo(() => {
    let result = [...works];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(w =>
        w.name.toLowerCase().includes(s) ||
        (w.description && w.description.toLowerCase().includes(s))
      );
    }
    if (filterCategory) {
      result = result.filter(w => w.category === filterCategory);
    }
    return result;
  }, [works, search, filterCategory]);

  const resetForm = () => {
    setFormData({ name: '', description: '', frequencyDays: 30, category: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (work) => {
    setFormData({
      name: work.name,
      description: work.description || '',
      frequencyDays: work.frequencyDays || 30,
      category: work.category || ''
    });
    setEditId(work.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Введите название работы');
      return;
    }
    try {
      if (editId) {
        await worksAPI.update(editId, formData);
        setSuccess('Работа обновлена');
      } else {
        await worksAPI.create(formData);
        setSuccess('Работа добавлена');
      }
      resetForm();
      fetchWorks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Ошибка сохранения');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить работу из справочника?')) {
      try {
        await worksAPI.delete(id);
        fetchWorks();
      } catch (err) {
        setError('Ошибка удаления');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1>Справочник работ</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить работу'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование работы' : 'Новая работа'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Название работы *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Замена масла"
                />
              </div>
              <div className="form-group">
                <label>Категория</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Например: ТО"
                  list="work-categories"
                />
                <datalist id="work-categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Периодичность (дней)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.frequencyDays}
                  onChange={(e) => setFormData({ ...formData, frequencyDays: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="form-group flex-1">
                <label>Описание</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание работы"
                />
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
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-search"
          />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Все категории</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-summary">
          Найдено: <strong>{filtered.length}</strong> из {works.length}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Категория</th>
              <th>Периодичность</th>
              <th>Описание</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-results-cell">Работы не найдены</td>
              </tr>
            ) : (
              filtered.map(work => (
                <tr key={work.id}>
                  <td className="td-bold">{work.name}</td>
                  <td>{work.category || '—'}</td>
                  <td>
                    <span className="frequency-badge">
                      каждые {work.frequencyDays} дн.
                    </span>
                  </td>
                  <td className="td-muted">{work.description || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => handleEdit(work)} className="btn btn-small btn-secondary">Ред.</button>
                      <button onClick={() => handleDelete(work.id)} className="btn btn-small btn-danger">Удал.</button>
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

export default WorksDirectory;
