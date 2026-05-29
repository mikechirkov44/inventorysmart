import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { equipmentAPI, roomsAPI, worksAPI } from '../services/api';

const STATUS_MAP = {
  working: { label: 'Работает', className: 'status-working' },
  under_repair: { label: 'В ремонте', className: 'status-under-repair' },
  needs_repair: { label: 'Требует ремонта', className: 'status-needs-repair' },
};

function EquipmentTable() {
  const [equipment, setEquipment] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    Promise.all([equipmentAPI.getAll(), roomsAPI.getAll(), worksAPI.getAll()])
      .then(([e, r, w]) => { setEquipment(e.data); setRooms(r.data); setWorks(w.data); setLoading(false); })
      .catch(() => { setError('Ошибка загрузки'); setLoading(false); });
  }, []);

  const roomMap = useMemo(() => {
    const m = {};
    rooms.forEach(r => { m[r.id] = r.name; });
    return m;
  }, [rooms]);

  const workMap = useMemo(() => {
    const m = {};
    works.forEach(w => { m[w.id] = w.name; });
    return m;
  }, [works]);

  const categories = useMemo(() => {
    return [...new Set(equipment.map(e => e.category).filter(Boolean))].sort();
  }, [equipment]);

  const filtered = useMemo(() => {
    let result = [...equipment];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(s) ||
        e.inventoryNumber.toLowerCase().includes(s) ||
        (e.description && e.description.toLowerCase().includes(s))
      );
    }
    if (filterCategory) result = result.filter(e => e.category === filterCategory);
    if (filterRoom) result = result.filter(e => e.roomId === filterRoom);
    if (filterStatus) result = result.filter(e => e.status === filterStatus);

    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'roomName') { valA = roomMap[a.roomId] || ''; valB = roomMap[b.roomId] || ''; }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [equipment, search, filterCategory, filterRoom, filterStatus, sortField, sortDir, roomMap]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const handleDelete = async (delId) => {
    if (window.confirm('Удалить оборудование?')) {
      try { await equipmentAPI.delete(delId); setEquipment(prev => prev.filter(e => e.id !== delId)); }
      catch { setError('Ошибка удаления'); }
    }
  };

  const clearFilters = () => { setSearch(''); setFilterCategory(''); setFilterRoom(''); setFilterStatus(''); };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="equipment-table-page">
      <div className="header">
        <h1>Оборудование (таблица)</h1>
        <div className="header-actions">
          <Link to="/" className="btn">Карточки</Link>
          <Link to="/equipment/new" className="btn btn-primary">+ Добавить</Link>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Все категории</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
            <option value="">Все помещения</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Все статусы</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={clearFilters} className="btn btn-small">Сбросить</button>
        </div>
        <div className="filter-summary">
          Найдено: <strong>{filtered.length}</strong> из {equipment.length}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">Наименование{sortIcon('name')}</th>
              <th onClick={() => handleSort('inventoryNumber')} className="sortable">Инв. номер{sortIcon('inventoryNumber')}</th>
              <th onClick={() => handleSort('status')} className="sortable">Состояние{sortIcon('status')}</th>
              <th onClick={() => handleSort('category')} className="sortable">Категория{sortIcon('category')}</th>
              <th onClick={() => handleSort('roomName')} className="sortable">Помещение{sortIcon('roomName')}</th>
              <th>Работы</th>
              <th>Фото</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="8" className="no-results-cell">Оборудование не найдено</td></tr>
            ) : (
              filtered.map(item => {
                const st = STATUS_MAP[item.status] || STATUS_MAP.working;
                return (
                  <tr key={item.id}>
                    <td><Link to={`/equipment/${item.id}`} className="table-link">{item.name}</Link></td>
                    <td>{item.inventoryNumber}</td>
                    <td><span className={`status-badge ${st.className}`}>{st.label}</span></td>
                    <td>{item.category || '—'}</td>
                    <td>{roomMap[item.roomId] || '—'}</td>
                    <td>{(Array.isArray(item.workIds) ? item.workIds : []).map(wid => workMap[wid]).filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      {item.photo ? <img src={`/uploads/${item.photo}`} alt="" className="table-thumb" /> : <span className="no-photo-small">—</span>}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/equipment/${item.id}`} className="btn btn-small">Открыть</Link>
                        <Link to={`/equipment/${item.id}/edit`} className="btn btn-small btn-secondary">Ред.</Link>
                        <button onClick={() => handleDelete(item.id)} className="btn btn-small btn-danger">Удал.</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EquipmentTable;
