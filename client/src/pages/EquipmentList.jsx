/**
 * @module EquipmentList
 * @description Список оборудования в виде карточек, сгруппированных по помещениям. Поддерживает поиск и удаление.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FolderTree, Eye, Pencil, Trash2, Wrench } from 'lucide-react';
import { equipmentAPI, roomsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonCardGrid } from '../components/Skeleton';
import ActionsMenu from '../components/ActionsMenu';
import UploadImage from '../components/UploadImage';
import EmptyState from '../components/EmptyState';

/** Маппинг статусов оборудования на метки и CSS-классы */
const STATUS_MAP = {
  working: { label: 'Работает', className: 'status-working' },
  under_repair: { label: 'В ремонте', className: 'status-under-repair' },
  needs_repair: { label: 'Требует ремонта', className: 'status-needs-repair' },
};

function EquipmentList({ embedded }) {
  /** Состояние списка оборудования, помещений, загрузки, ошибки, поиска и свёрнутых групп */
  const [equipment, setEquipment] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка списка оборудования и помещений при монтировании */
  useEffect(() => {
    Promise.all([equipmentAPI.getAll(), roomsAPI.getAll()])
      .then(([e, r]) => { setEquipment(e.data); setRooms(r.data); setLoading(false); })
      .catch(() => { setError('Ошибка загрузки'); setLoading(false); });
  }, []);

  /** Маппинг ID помещений на их названия */
  const roomMap = useMemo(() => {
    const m = {};
    rooms.forEach(r => { m[r.id] = r.name; });
    return m;
  }, [rooms]);

  /** Удаление оборудования с подтверждением */
  const handleDelete = async (delId) => {
    const confirmed = await confirm({ title: 'Удалить оборудование?', message: 'Это действие нельзя отменить.', type: 'danger' });
    if (!confirmed) return;
    try {
      await equipmentAPI.delete(delId);
      setEquipment(prev => prev.filter(e => e.id !== delId));
    } catch { toast.error('Ошибка', 'Не удалось удалить оборудование'); }
  };

  const filtered = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.inventoryNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /** Группировка отфильтрованного оборудования по помещениям */
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

  /** Переключение свёрнутости группы */
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

  if (loading) return <SkeletonCardGrid count={6} />;
  if (error) return null;

  if (equipment.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="Оборудование ещё не добавлено"
        description="Начните с добавления первой единицы оборудования или импортируйте данные из Excel."
        actionLabel="Добавить оборудование"
        actionTo="/equipment/new"
      />
    );
  }

  return (
    <div className="equipment-list">
      {!embedded && (
        <div className="header">
          <h1><FolderTree size={24} />Справочник оборудования</h1>
          <div className="header-actions">
            <Link to="/equipment-table" className="btn">Таблица</Link>
            <Link to="/equipment/new" className="btn btn-primary">+ Добавить</Link>
          </div>
        </div>
      )}

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
                              <UploadImage item={item} field="photo" alt={item.name} />
                            ) : (
                              <div className="no-photo">Нет фото</div>
                            )}
                          </div>
                          <div className="card-info">
                            <h3>{item.name}</h3>
                            <p className="inventory-number">{item.inventoryNumber}</p>
                            {(item.manufacturer || item.serialNumber || item.yearOfManufacture) && (
                              <div className="card-specs">
                                {item.manufacturer && <span className="spec-tag">{item.manufacturer}</span>}
                                {item.serialNumber && <span className="spec-tag">S/N: {item.serialNumber}</span>}
                                {item.yearOfManufacture && <span className="spec-tag">{item.yearOfManufacture}</span>}
                              </div>
                            )}
                            <div className="card-status-row">
                              <span className={`status-badge ${st.className}`}>{st.label}</span>
                              <ActionsMenu items={[
                                { icon: <Eye size={14} />, label: 'Подробнее', onClick: () => window.location.href = `/equipment/${item.id}` },
                                { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => window.location.href = `/equipment/${item.id}/edit` },
                                { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(item.id), danger: true },
                              ]} />
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
