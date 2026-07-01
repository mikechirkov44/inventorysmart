import { useState, useEffect, useMemo } from 'react';
import { Wrench, Copy, Pencil, Trash2 } from 'lucide-react';
import { commonFaultsAPI, equipmentAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';
import CustomSelect from '../components/CustomSelect';
import ActionsMenu from '../components/ActionsMenu';

function CommonFaultsDirectory() {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ equipmentIds: [], name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, equipRes] = await Promise.all([
        commonFaultsAPI.getAll(),
        equipmentAPI.getAll()
      ]);
      setItems(itemsRes.data);
      setEquipment(equipRes.data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(s) ||
        (i.equipment_names && i.equipment_names.some(n => n.toLowerCase().includes(s)))
      );
    }
    return result;
  }, [items, search]);

  const filteredEquipment = useMemo(() => {
    if (!equipmentSearch) return equipment;
    const s = equipmentSearch.toLowerCase();
    return equipment.filter(eq =>
      eq.name.toLowerCase().includes(s) ||
      (eq.inventoryNumber && eq.inventoryNumber.toLowerCase().includes(s))
    );
  }, [equipment, equipmentSearch]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Ошибка', 'Введите название неисправности');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await commonFaultsAPI.update(editing.id, form);
        toast.success('Обновлено');
      } else {
        await commonFaultsAPI.create(form);
        toast.success('Создано');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ equipmentIds: [], name: '' });
      fetchData();
    } catch {
      toast.error('Ошибка', 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({ equipmentIds: item.equipment_ids || [], name: item.name });
    setShowForm(true);
  };

  const handleDuplicate = (item) => {
    setEditing(null);
    setForm({ equipmentIds: item.equipment_ids || [], name: item.name + ' (копия)' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удалить?', message: 'Типовая неисправность будет удалена.', type: 'danger' });
    if (!confirmed) return;
    try {
      await commonFaultsAPI.delete(id);
      toast.success('Удалено');
      fetchData();
    } catch {
      toast.error('Ошибка', 'Не удалось удалить');
    }
  };

  const toggleEquipment = (eqId) => {
    setForm(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(eqId)
        ? prev.equipmentIds.filter(id => id !== eqId)
        : [...prev.equipmentIds, eqId]
    }));
  };

  if (loading) return <SkeletonTable rows={6} cols={3} />;

  return (
    <div className="directory-page">
      <div className="header">
        <h1><Wrench size={24} />Типовые неисправности</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ equipmentIds: [], name: '' }); }} className="btn btn-primary">
          + Добавить
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Поиск по неисправности или оборудованию..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Оборудование</th>
                <th>Неисправность</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="3" className="no-results-cell">Записей не найдено</td></tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      {item.equipment_names && item.equipment_names.length > 0 ? (
                        <div>
                          {item.equipment_names.map((name, idx) => (
                            <div key={idx}>
                              {name}
                              {item.equipment_inventory_numbers && item.equipment_inventory_numbers[idx] && (
                                <span className="td-muted"> ({item.equipment_inventory_numbers[idx]})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="td-muted">Не привязано</span>
                      )}
                    </td>
                    <td>{item.name}</td>
                    <td>
                      <ActionsMenu items={[
                        { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(item) },
                        { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(item) },
                        { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(item.id), danger: true },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="complete-task-modal" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Редактирование' : 'Новая типовая неисправность'}</h3>
            <div className="form-group">
              <label>Оборудование</label>
              <div className="equipment-multi-select">
                <input
                  type="text"
                  className="equipment-search-input"
                  placeholder="Поиск оборудования..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                />
                <div className="equipment-options-list">
                  {filteredEquipment.length > 0 ? (
                    filteredEquipment.map(eq => (
                      <label key={eq.id} className="equipment-option">
                        <span className={`custom-checkbox ${form.equipmentIds.includes(eq.id) ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={form.equipmentIds.includes(eq.id)}
                            onChange={() => toggleEquipment(eq.id)}
                          />
                          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span className="equipment-name">{eq.name}</span>
                        {eq.inventoryNumber && <span className="equipment-inventory">({eq.inventoryNumber})</span>}
                      </label>
                    ))
                  ) : (
                    <div className="equipment-no-results">Оборудование не найдено</div>
                  )}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Неисправность *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Например: Замена подшипника" />
            </div>
            <div className="modal-actions">
              <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommonFaultsDirectory;
