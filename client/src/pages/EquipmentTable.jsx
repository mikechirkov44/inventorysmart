/**
 * @module EquipmentTable
 * @description Табличное представление списка оборудования с фильтрами, сортировкой,
 * удалением и настройкой колонок (перетаскивание, видимость).
 */
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderTree, Pencil, Trash2, Settings } from 'lucide-react';
import { equipmentAPI, roomsAPI, worksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';
import CustomSelect from '../components/CustomSelect';
import ActionsMenu from '../components/ActionsMenu';
import { useTableSettings } from '../hooks/useTableSettings';
import TableColumnManager from '../components/TableColumnManager';

/** Маппинг статусов оборудования */
const STATUS_MAP = {
  working: { label: 'Работает', className: 'status-working' },
  under_repair: { label: 'В ремонте', className: 'status-under-repair' },
  needs_repair: { label: 'Требует ремонта', className: 'status-needs-repair' },
};

/** Дефолтные колонки таблицы */
const DEFAULT_COLUMNS = [
  { key: 'name', label: 'Наименование', visible: true },
  { key: 'inventoryNumber', label: 'Инв. номер', visible: true },
  { key: 'status', label: 'Состояние', visible: true },
  { key: 'category', label: 'Категория', visible: true },
  { key: 'room', label: 'Помещение', visible: true },
  { key: 'works', label: 'Работы', visible: true },
  { key: 'photo', label: 'Фото', visible: true },
  { key: 'actions', label: 'Действия', visible: true },
];

function EquipmentTable() {
  /** Состояние данных, фильтров, сортировки */
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

  /** Настройки колонок */
  const {
    columns,
    visibleColumns,
    isManaging,
    setIsManaging,
    toggleColumn,
    moveColumn,
    resetToDefault
  } = useTableSettings('equipment-table', DEFAULT_COLUMNS);

  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  /** Загрузка оборудования, помещений и работ */
  useEffect(() => {
    Promise.all([equipmentAPI.getAll(), roomsAPI.getAll(), worksAPI.getAll()])
      .then(([e, r, w]) => { setEquipment(e.data); setRooms(r.data); setWorks(w.data); setLoading(false); })
      .catch(() => { setError('Ошибка загрузки'); setLoading(false); });
  }, []);

  /** Маппинг ID помещений на названия */
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
    return [...new Set(equipment.map(e => e.categoryName).filter(Boolean))].sort();
  }, [equipment]);

  /** Фильтрация и сортировка оборудования */
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
    if (filterCategory) result = result.filter(e => e.categoryName === filterCategory);
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

  /** Переключение направления сортировки */
  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortClass = (field) => {
    if (sortField !== field) return 'sortable';
    return `sortable sorted-${sortDir}`;
  };

  /** Удаление оборудования */
  const handleDelete = async (delId) => {
    const confirmed = await confirm({ title: 'Удалить оборудование?', message: 'Это действие нельзя отменить.', type: 'danger' });
    if (!confirmed) return;
    try { await equipmentAPI.delete(delId); setEquipment(prev => prev.filter(e => e.id !== delId)); }
    catch { toast.error('Ошибка', 'Не удалось удалить оборудование'); }
  };

  const clearFilters = () => { setSearch(''); setFilterCategory(''); setFilterRoom(''); setFilterStatus(''); };

  if (loading) return <SkeletonTable rows={10} cols={visibleColumns.length} />;

  return (
    <div className="equipment-table-page">
      <div className="header">
        <h1><FolderTree size={24} />Оборудование (таблица)</h1>
        <div className="header-actions">
          <Link to="/" className="btn">Карточки</Link>
          <Link to="/equipment/new" className="btn btn-primary">+ Добавить</Link>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <TableColumnManager
        columns={columns}
        onToggle={toggleColumn}
        onMove={moveColumn}
        onReset={resetToDefault}
        isOpen={isManaging}
        onClose={() => setIsManaging(false)}
      />

      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <CustomSelect
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder="Все категории"
            options={categories.map(c => ({ value: c, label: c }))}
          />
          <CustomSelect
            value={filterRoom}
            onChange={setFilterRoom}
            placeholder="Все помещения"
            options={rooms.map(r => ({ value: r.id, label: r.name }))}
          />
          <CustomSelect
            value={filterStatus}
            onChange={setFilterStatus}
            placeholder="Все статусы"
            options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          <button onClick={clearFilters} className="btn btn-small">Сбросить</button>
        </div>
        <div className="filter-summary">
          Найдено: <strong>{filtered.length}</strong> из {equipment.length}
        </div>
      </div>

      <div className="table-container">
        <button 
          className="table-settings-corner-btn" 
          onClick={() => setIsManaging(true)}
          title="Настройка колонок"
        >
          <Settings size={18} />
        </button>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {visibleColumns.map(col => {
                  const sortFieldMap = {
                    name: 'name',
                    inventoryNumber: 'inventoryNumber',
                    status: 'status',
                    category: 'categoryName',
                    room: 'roomName',
                    works: null,
                    photo: null,
                    actions: null,
                  };
                  const sortableField = sortFieldMap[col.key];
                  if (sortableField) {
                    return (
                      <th key={col.key} onClick={() => handleSort(sortableField)} className={sortClass(sortableField)}>
                        {col.label}
                      </th>
                    );
                  }
                  return <th key={col.key}>{col.label}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="no-results-cell">
                    Оборудование не найдено
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const st = STATUS_MAP[item.status] || STATUS_MAP.working;
                  return (
                    <tr key={item.id}>
                      {visibleColumns.map(col => {
                        switch (col.key) {
                          case 'name':
                            return (
                              <td key={col.key}>
                                <Link to={`/equipment/${item.id}`} className="table-link">{item.name}</Link>
                              </td>
                            );
                          case 'inventoryNumber':
                            return <td key={col.key}>{item.inventoryNumber}</td>;
                          case 'status':
                            return (
                              <td key={col.key}>
                                <span className={`status-badge ${st.className}`}>{st.label}</span>
                              </td>
                            );
                          case 'category':
                            return <td key={col.key}>{item.categoryName || '—'}</td>;
                          case 'room':
                            return <td key={col.key}>{roomMap[item.roomId] || '—'}</td>;
                          case 'works':
                            return (
                              <td key={col.key}>
                                {(Array.isArray(item.workIds) ? item.workIds : [])
                                  .map(wid => workMap[wid])
                                  .filter(Boolean)
                                  .join(', ') || '—'}
                              </td>
                            );
                          case 'photo':
                            return (
                              <td key={col.key}>
                                {item.photo ? (
                                  <img src={`/uploads/${item.photo}`} alt="" className="table-thumb" />
                                ) : (
                                  <span className="no-photo-small">—</span>
                                )}
                              </td>
                            );
                          case 'actions':
                            return (
                              <td key={col.key}>
                                <ActionsMenu items={[
                                  { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => navigate(`/equipment/${item.id}/edit`) },
                                  { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(item.id), danger: true },
                                ]} />
                              </td>
                            );
                          default:
                            return <td key={col.key}>—</td>;
                        }
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EquipmentTable;
