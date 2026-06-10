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
  const [form, setForm] = useState({ equipmentId: '', name: '' });
  const [submitting, setSubmitting] = useState(false);

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
        (i.equipment_name && i.equipment_name.toLowerCase().includes(s))
      );
    }
    return result;
  }, [items, search]);

  const handleSubmit = async () => {
    if (!form.equipmentId || !form.name.trim()) {
      toast.error('Ошибка', 'Заполните все поля');
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
      setForm({ equipmentId: '', name: '' });
      fetchData();
    } catch {
      toast.error('Ошибка', 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({ equipmentId: item.equipment_id, name: item.name });
    setShowForm(true);
  };

  const handleDuplicate = (item) => {
    setEditing(null);
    setForm({ equipmentId: item.equipment_id, name: item.name + ' (копия)' });
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

  if (loading) return <SkeletonTable rows={6} cols={3} />;

  return (
    <div className="directory-page">
      <div className="header">
        <h1><Wrench size={24} />Типовые неисправности</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ equipmentId: '', name: '' }); }} className="btn btn-primary">
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
                      <div>{item.equipment_name || '—'}</div>
                      <div className="td-muted">{item.inventory_number || ''}</div>
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
              <label>Оборудование *</label>
              <CustomSelect
                value={form.equipmentId}
                onChange={(v) => setForm({ ...form, equipmentId: v })}
                placeholder="Выберите оборудование"
                options={equipment.map(e => ({ value: e.id, label: `${e.name} (${e.inventoryNumber || '—'})` }))}
              />
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
