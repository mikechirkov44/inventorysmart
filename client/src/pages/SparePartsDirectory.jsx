import { useState, useEffect, useMemo } from 'react';
import { sparePartsAPI, equipmentAPI, worksAPI } from '../services/api';

function SparePartsDirectory() {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eqSearch, setEqSearch] = useState('');
  const [wkSearch, setWkSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', article: '', manufacturer: '', minStock: 0, equipmentIds: [], workIds: []
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sp, eq, wk] = await Promise.all([sparePartsAPI.getAll(), equipmentAPI.getAll(), worksAPI.getAll()]);
      setItems(sp.data);
      setEquipment(eq.data);
      setWorks(wk.data);
      setLoading(false);
    } catch { setError('Ошибка загрузки'); setLoading(false); }
  };

  const eqMap = useMemo(() => { const m = {}; equipment.forEach(e => { m[e.id] = e.name; }); return m; }, [equipment]);
  const wkMap = useMemo(() => { const m = {}; works.forEach(w => { m[w.id] = w.name; }); return m; }, [works]);

  const filteredEq = useMemo(() => {
    if (!eqSearch) return equipment;
    const s = eqSearch.toLowerCase();
    return equipment.filter(e => e.name.toLowerCase().includes(s) || (e.inventoryNumber && e.inventoryNumber.toLowerCase().includes(s)));
  }, [equipment, eqSearch]);

  const filteredWk = useMemo(() => {
    if (!wkSearch) return works;
    const s = wkSearch.toLowerCase();
    return works.filter(w => w.name.toLowerCase().includes(s));
  }, [works, wkSearch]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(s) ||
      (i.article && i.article.toLowerCase().includes(s)) ||
      (i.manufacturer && i.manufacturer.toLowerCase().includes(s))
    );
  }, [items, search]);

  const resetForm = () => {
    setFormData({ name: '', article: '', manufacturer: '', minStock: 0, equipmentIds: [], workIds: [] });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      article: item.article || '',
      manufacturer: item.manufacturer || '',
      minStock: item.minStock || 0,
      equipmentIds: item.equipmentIds || [],
      workIds: item.workIds || []
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const toggleId = (field, id) => {
    setFormData(prev => {
      const ids = prev[field].includes(id) ? prev[field].filter(x => x !== id) : [...prev[field], id];
      return { ...prev, [field]: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Введите наименование'); return; }
    try {
      if (editId) {
        await sparePartsAPI.update(editId, formData);
        setSuccess('Позиция обновлена');
      } else {
        await sparePartsAPI.create(formData);
        setSuccess('Позиция добавлена');
      }
      resetForm(); fetchData(); setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Ошибка сохранения'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить позицию?')) {
      try { await sparePartsAPI.delete(id); fetchData(); } catch { setError('Ошибка удаления'); }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1>Справочник ЗИП</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование' : 'Новая позиция ЗИП'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Наименование *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Артикул</label>
                <input type="text" value={formData.article} onChange={(e) => setFormData({ ...formData, article: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Производитель</label>
                <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Минимальный запас</label>
                <input type="number" min="0" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="form-group">
              <label>Оборудование</label>
              {formData.equipmentIds.length > 0 && (
                <div className="works-checkbox-list compact selected-list">
                  {equipment.filter(e => formData.equipmentIds.includes(e.id)).map(eq => (
                    <label key={eq.id} className="checkbox-item selected">
                      <input type="checkbox" checked={true} onChange={() => toggleId('equipmentIds', eq.id)} />
                      <span className="checkbox-label">{eq.name}<span className="checkbox-hint">{eq.inventoryNumber}</span></span>
                    </label>
                  ))}
                </div>
              )}
              <input type="text" placeholder="Найти и добавить оборудование..." value={eqSearch} onChange={(e) => setEqSearch(e.target.value)} className="filter-search-sm" />
              {eqSearch && (
                <div className="works-checkbox-list compact search-results">
                  {filteredEq.filter(e => !formData.equipmentIds.includes(e.id)).length === 0 && (
                    <p className="no-works-hint">Ничего не найдено</p>
                  )}
                  {filteredEq.filter(e => !formData.equipmentIds.includes(e.id)).map(eq => (
                    <label key={eq.id} className="checkbox-item">
                      <input type="checkbox" checked={false} onChange={() => { toggleId('equipmentIds', eq.id); setEqSearch(''); }} />
                      <span className="checkbox-label">{eq.name}<span className="checkbox-hint">{eq.inventoryNumber}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Работы</label>
              {formData.workIds.length > 0 && (
                <div className="works-checkbox-list compact selected-list">
                  {works.filter(w => formData.workIds.includes(w.id)).map(w => (
                    <label key={w.id} className="checkbox-item selected">
                      <input type="checkbox" checked={true} onChange={() => toggleId('workIds', w.id)} />
                      <span className="checkbox-label">{w.name}<span className="checkbox-hint">каждые {w.frequencyDays} дн.</span></span>
                    </label>
                  ))}
                </div>
              )}
              <input type="text" placeholder="Найти и добавить работы..." value={wkSearch} onChange={(e) => setWkSearch(e.target.value)} className="filter-search-sm" />
              {wkSearch && (
                <div className="works-checkbox-list compact search-results">
                  {filteredWk.filter(w => !formData.workIds.includes(w.id)).length === 0 && (
                    <p className="no-works-hint">Ничего не найдено</p>
                  )}
                  {filteredWk.filter(w => !formData.workIds.includes(w.id)).map(w => (
                    <label key={w.id} className="checkbox-item">
                      <input type="checkbox" checked={false} onChange={() => { toggleId('workIds', w.id); setWkSearch(''); }} />
                      <span className="checkbox-label">{w.name}<span className="checkbox-hint">каждые {w.frequencyDays} дн.</span></span>
                    </label>
                  ))}
                </div>
              )}
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
          <input type="text" placeholder="Поиск по наименованию, артикулу, производителю..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {items.length}</div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Наименование</th>
              <th>Артикул</th>
              <th>Производитель</th>
              <th>Мин. запас</th>
              <th>Оборудование</th>
              <th>Работы</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="no-results-cell">Позиции не найдены</td></tr>
            ) : (
              filtered.map(item => (
                <tr key={item.id}>
                  <td className="td-bold">{item.name}</td>
                  <td>{item.article || '—'}</td>
                  <td>{item.manufacturer || '—'}</td>
                  <td>{item.minStock}</td>
                  <td>
                    <div className="td-tags">
                      {(item.equipmentIds || []).map(id => eqMap[id]).filter(Boolean).map(name => (
                        <span key={name} className="frequency-badge">{name}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="td-tags">
                      {(item.workIds || []).map(id => wkMap[id]).filter(Boolean).map(name => (
                        <span key={name} className="equipment-count-badge">{name}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => handleEdit(item)} className="btn btn-small btn-secondary">Ред.</button>
                      <button onClick={() => handleDelete(item.id)} className="btn btn-small btn-danger">Удал.</button>
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

export default SparePartsDirectory;
