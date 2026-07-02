/**
 * @fileoverview Страница справочника помещений.
 * Управление помещениями: добавление, редактирование, удаление,
 * отображение количества оборудования и ответственного сотрудника.
 */

import { useState, useEffect, useMemo } from 'react';
import { Building2, Copy, Pencil, Trash2 } from 'lucide-react';
import { roomsAPI, equipmentAPI, employeesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import {
  MobileDataCards,
  MobileDataCard,
  MobileDataCardTitle,
  MobileDataCardRow,
  MobileDataCardActions,
} from '../components/MobileDataCard';
import CustomSelect from '../components/CustomSelect';
import ActionsMenu from '../components/ActionsMenu';

/** Компонент справочника помещений */
function RoomsDirectory() {
  const [rooms, setRooms] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', building: '', floor: '', responsibleEmployeeId: ''
  });

  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка помещений, оборудования и сотрудников при монтировании */
  useEffect(() => { fetchData(); }, []);

  /** Загрузка всех необходимых данных */
  const fetchData = async () => {
    try {
      const [roomsRes, equipRes, empRes] = await Promise.all([
        roomsAPI.getAll(), equipmentAPI.getAll(), employeesAPI.getAll()
      ]);
      setRooms(roomsRes.data);
      setEquipment(equipRes.data);
      setEmployees(empRes.data);
      setLoading(false);
    } catch { toast.error('Ошибка', 'Ошибка загрузки'); setLoading(false); }
  };

  /** Уникальный список зданий для фильтра */
  const buildings = useMemo(() => [...new Set(rooms.map(r => r.building).filter(Boolean))].sort(), [rooms]);

  /** Словарь сотрудников для отображения ответственного */
  const empMap = useMemo(() => {
    const m = {};
    employees.forEach(e => { m[e.id] = `${e.lastName} ${e.firstName}`; });
    return m;
  }, [employees]);

  /** Подсчёт количества оборудования по помещениям */
  const equipmentCountByRoomId = useMemo(() => {
    const counts = {};
    equipment.forEach(e => {
      if (e.roomId) counts[e.roomId] = (counts[e.roomId] || 0) + 1;
    });
    return counts;
  }, [equipment]);

  /** Фильтрация помещений по поиску и зданию */
  const filtered = useMemo(() => {
    let result = [...rooms];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(s) ||
        (r.description && r.description.toLowerCase().includes(s)) ||
        (r.building && r.building.toLowerCase().includes(s))
      );
    }
    if (filterBuilding) result = result.filter(r => r.building === filterBuilding);
    return result;
  }, [rooms, search, filterBuilding]);

  /** Сброс формы помещения */
  const resetForm = () => {
    setFormData({ name: '', description: '', building: '', floor: '', responsibleEmployeeId: '' });
    setEditId(null);
    setShowForm(false);
  };

  /** Открытие формы редактирования помещения */
  const handleEdit = (room) => {
    setFormData({
      name: room.name,
      description: room.description || '',
      building: room.building || '',
      floor: room.floor || '',
      responsibleEmployeeId: room.responsibleEmployeeId || ''
    });
    setEditId(room.id);
    setShowForm(true);
  };

  /** Дублирование помещения */
  const handleDuplicate = (room) => {
    setFormData({
      name: room.name + ' (копия)',
      description: room.description || '',
      building: room.building || '',
      floor: room.floor || '',
      responsibleEmployeeId: room.responsibleEmployeeId || ''
    });
    setEditId(null);
    setShowForm(true);
  };

  /** Обработка отправки формы помещения */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Введите название помещения'); return; }
    try {
      if (editId) { await roomsAPI.update(editId, formData); toast.success('Успех', 'Помещение обновлено'); }
      else { await roomsAPI.create(formData); toast.success('Успех', 'Помещение добавлено'); }
      resetForm(); fetchData();
    } catch { toast.error('Ошибка', 'Ошибка сохранения'); }
  };

  /** Удаление помещения с подтверждением */
  const handleDelete = async (delId) => {
    const confirmed = await confirm({ title: 'Удалить помещение?', message: 'Это действие нельзя отменить.', type: 'danger' });
    if (!confirmed) return;
    try { await roomsAPI.delete(delId); fetchData(); }
    catch { toast.error('Ошибка', 'Ошибка удаления'); }
  };

  if (loading) return <SkeletonTable rows={6} cols={7} />;

  const isListEmpty = rooms.length === 0 && !search && !filterBuilding;
  const openAddForm = () => { resetForm(); setShowForm(true); };

  return (
    <div className="directory-page">
      <PageHeader icon={Building2} title="Справочник помещений">
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить помещение'}
        </button>
      </PageHeader>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование помещения' : 'Новое помещение'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Название *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: Цех №1" />
              </div>
              <div className="form-group">
                <label>Здание</label>
                <input type="text" value={formData.building} onChange={(e) => setFormData({ ...formData, building: e.target.value })} placeholder="Корпус А" list="buildings-list" />
                <datalist id="buildings-list">
                  {buildings.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Этаж</label>
                <input type="text" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Ответственный</label>
                <CustomSelect value={formData.responsibleEmployeeId} onChange={(val) => setFormData({ ...formData, responsibleEmployeeId: val })} placeholder="— Не выбран —" options={[
                  { value: '', label: '— Не выбран —' },
                  ...employees.map(emp => ({ value: emp.id, label: `${emp.lastName} ${emp.firstName} ${emp.middleName ? emp.middleName : ''}` }))
                ]} />
              </div>
            </div>
            <div className="form-group">
              <label>Описание</label>
              <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} className="btn">Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Панель фильтров по названию и зданию */}
      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <CustomSelect value={filterBuilding} onChange={setFilterBuilding} placeholder="Все здания" options={[
            { value: '', label: 'Все здания' },
            ...buildings.map(b => ({ value: b, label: b }))
          ]} />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {rooms.length}</div>
      </div>

      {/* Таблица помещений */}
      <div className="table-container desktop-table-only">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Здание</th>
                <th>Этаж</th>
                <th>Ответственный</th>
                <th>Оборудование</th>
                <th>Описание</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {isListEmpty ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      icon={Building2}
                      title="Помещения ещё не добавлены"
                      description="Создайте первое помещение для привязки оборудования и назначения ответственных."
                      actionLabel="+ Добавить помещение"
                      onAction={openAddForm}
                    />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="no-results-cell">Помещения не найдены</td></tr>
              ) : (
                filtered.map(room => (
                  <tr key={room.id}>
                    <td className="td-bold">{room.name}</td>
                    <td>{room.building || '—'}</td>
                    <td>{room.floor || '—'}</td>
                    <td>{empMap[room.responsibleEmployeeId] || '—'}</td>
                    <td><span className="equipment-count-badge">{equipmentCountByRoomId[room.id] || 0} ед.</span></td>
                    <td className="td-muted">{room.description || '—'}</td>
                    <td>
                      <ActionsMenu items={[
                        { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(room) },
                        { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(room) },
                        { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(room.id), danger: true },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MobileDataCards empty={filtered.length === 0} emptyMessage="Помещения не найдены">
        {filtered.map(room => (
          <MobileDataCard key={room.id}>
            <MobileDataCardTitle>{room.name}</MobileDataCardTitle>
            <MobileDataCardRow label="Здание">{room.building || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Этаж">{room.floor || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Ответственный">{empMap[room.responsibleEmployeeId] || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Оборудование">
              <span className="equipment-count-badge">{equipmentCountByRoomId[room.id] || 0} ед.</span>
            </MobileDataCardRow>
            <MobileDataCardRow label="Описание">{room.description || '—'}</MobileDataCardRow>
            <MobileDataCardActions>
              <ActionsMenu items={[
                { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(room) },
                { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(room) },
                { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(room.id), danger: true },
              ]} />
            </MobileDataCardActions>
          </MobileDataCard>
        ))}
      </MobileDataCards>
    </div>
  );
}

export default RoomsDirectory;
