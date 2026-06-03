/**
 * @fileoverview Страница справочника помещений.
 * Управление помещениями: добавление, редактирование, удаление,
 * отображение количества оборудования и ответственного сотрудника.
 */

import { useState, useEffect, useMemo } from 'react';
import { roomsAPI, equipmentAPI, employeesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';

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

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1>Справочник помещений</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить помещение'}
        </button>
      </div>

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
                <select value={formData.responsibleEmployeeId} onChange={(e) => setFormData({ ...formData, responsibleEmployeeId: e.target.value })}>
                  <option value="">— Не выбран —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName} {emp.middleName ? emp.middleName : ''}</option>
                  ))}
                </select>
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
          <select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)}>
            <option value="">Все здания</option>
            {buildings.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {rooms.length}</div>
      </div>

      {/* Таблица помещений */}
      <div className="table-container">
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
              {filtered.length === 0 ? (
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
                      <div className="table-actions">
                        <button onClick={() => handleEdit(room)} className="btn btn-small btn-secondary">Ред.</button>
                        <button onClick={() => handleDelete(room.id)} className="btn btn-small btn-danger">Удал.</button>
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

export default RoomsDirectory;
