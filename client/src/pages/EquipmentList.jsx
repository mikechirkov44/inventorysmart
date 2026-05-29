import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { equipmentAPI, roomsAPI } from '../services/api';

const STATUS_MAP = {
  working: { label: 'Работает', className: 'status-working' },
  under_repair: { label: 'В ремонте', className: 'status-under-repair' },
  needs_repair: { label: 'Требует ремонта', className: 'status-needs-repair' },
};

function EquipmentList() {
  const [equipment, setEquipment] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  useEffect(() => {
    Promise.all([equipmentAPI.getAll(), roomsAPI.getAll()])
      .then(([e, r]) => { setEquipment(e.data); setRooms(r.data); setLoading(false); })
      .catch(() => { setError('Ошибка загрузки'); setLoading(false); });
  }, []);

  const roomMap = useMemo(() => {
    const m = {};
    rooms.forEach(r => { m[r.id] = r.name; });
    return m;
  }, [rooms]);

  const handleDelete = async (delId) => {
    if (window.confirm('Удалить оборудование?')) {
      try {
        await equipmentAPI.delete(delId);
        setEquipment(prev => prev.filter(e => e.id !== delId));
      } catch { setError('Ошибка удаления'); }
    }
  };

  const filtered = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.inventoryNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(item => {
      const roomId = item.roomId || '__none';
      const roomName = roomMap[item.roomId] || 'Без помещения';
      if (!groups[roomId]) groups[roomId] = { name: roomName, items: [] };
      groups[roomId].items.push(item);
    });
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === '__none') return 1;
      if (b[0] === '__none') return -1;
      return a[1].name.localeCompare(b[1].name);
    });
  }, [filtered, roomMap]);

  const toggleGroup = (roomId) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const expandAll = () => setCollapsedGroups(new Set());
  const collapseAll = () => setCollapsedGroups(new Set(grouped.map(([id]) => id)));

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="equipment-list">
      <div className="header">
        <h1>Справочник оборудования</h1>
        <div className="header-actions">
          <Link to="/equipment-table" className="btn">Таблица</Link>
          <Link to="/equipment/new" className="btn btn-primary">+ Добавить</Link>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Поиск по наименованию или инвентарному номеру..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="group-controls">
        <button onClick={expandAll} className="btn btn-small">Развернуть все</button>
        <button onClick={collapseAll} className="btn btn-small">Свернуть все</button>
      </div>

      <div className="equipment-groups">
        {grouped.length === 0 ? (
          <div className="no-results">Оборудование не найдено</div>
        ) : (
          grouped.map(([roomId, group]) => {
            const isCollapsed = collapsedGroups.has(roomId);
            return (
              <div key={roomId} className="equipment-group">
                <div className="group-header clickable" onClick={() => toggleGroup(roomId)}>
                  <span className={`group-arrow ${isCollapsed ? '' : 'expanded'}`}></span>
                  <span className="group-label">{group.name}</span>
                  <span className="group-count">{group.items.length} ед.</span>
                </div>
                {!isCollapsed && (
                  <div className="equipment-grid">
                    {group.items.map(item => {
                      const st = STATUS_MAP[item.status] || STATUS_MAP.working;
                      return (
                        <div key={item.id} className="equipment-card">
                          <div className="card-photo">
                            {item.photo ? (
                              <img src={`/uploads/${item.photo}`} alt={item.name} />
                            ) : (
                              <div className="no-photo">Нет фото</div>
                            )}
                          </div>
                          <div className="card-info">
                            <h3>{item.name}</h3>
                            <p className="inventory-number">{item.inventoryNumber}</p>
                            <p><span className={`status-badge ${st.className}`}>{st.label}</span></p>
                            <div className="card-actions">
                              <Link to={`/equipment/${item.id}`} className="btn btn-small">Подробнее</Link>
                              <Link to={`/equipment/${item.id}/edit`} className="btn btn-small btn-secondary">Ред.</Link>
                              <button onClick={() => handleDelete(item.id)} className="btn btn-small btn-danger">Удал.</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EquipmentList;
