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

      <div className="equipment-grid">
        {filtered.length === 0 ? (
          <div className="no-results">Оборудование не найдено</div>
        ) : (
          filtered.map(item => {
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
                  <p className="location">{roomMap[item.roomId] || ''}</p>
                  <div className="card-actions">
                    <Link to={`/equipment/${item.id}`} className="btn btn-small">Подробнее</Link>
                    <Link to={`/equipment/${item.id}/edit`} className="btn btn-small btn-secondary">Ред.</Link>
                    <button onClick={() => handleDelete(item.id)} className="btn btn-small btn-danger">Удал.</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EquipmentList;
