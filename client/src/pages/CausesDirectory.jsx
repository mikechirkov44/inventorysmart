import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Copy, Pencil, Trash2 } from 'lucide-react';
import { causesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  MobileDataCards, MobileDataCard, MobileDataCardTitle, MobileDataCardActions,
} from '../components/MobileDataCard';
import ActionsMenu from '../components/ActionsMenu';

function CausesDirectory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await causesAPI.getAll();
      setItems(res.data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(s));
  }, [items, search]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Ошибка', 'Введите название');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await causesAPI.update(editing.id, form);
        toast.success('Обновлено');
      } else {
        await causesAPI.create(form);
        toast.success('Создано');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '' });
      fetchData();
    } catch {
      toast.error('Ошибка', 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name });
    setShowForm(true);
  };

  const handleDuplicate = (item) => {
    setEditing(null);
    setForm({ name: item.name + ' (копия)' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удалить?', message: 'Причина возникновения будет удалена.', type: 'danger' });
    if (!confirmed) return;
    try {
      await causesAPI.delete(id);
      toast.success('Удалено');
      fetchData();
    } catch {
      toast.error('Ошибка', 'Не удалось удалить');
    }
  };

  if (loading) return <SkeletonTable rows={6} cols={2} />;

  const openAddForm = () => { setShowForm(true); setEditing(null); setForm({ name: '' }); };

  return (
    <div className="directory-page">
      <PageHeader icon={AlertCircle} title="Причины возникновения">
        <button onClick={openAddForm} className="btn btn-primary">
          + Добавить
        </button>
      </PageHeader>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {items.length === 0 && !search ? (
        <EmptyState
          icon={AlertCircle}
          title="Причины ещё не добавлены"
          description="Создайте справочник причин возникновения неисправностей для использования в инцидентах и журнале работ."
          actionLabel="Добавить причину"
          onAction={openAddForm}
        />
      ) : (
        <>
          <div className="table-container desktop-table-only">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="2" className="no-results-cell">Записей не найдено</td></tr>
                  ) : (
                    filtered.map(item => (
                      <tr key={item.id}>
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

          <MobileDataCards empty={filtered.length === 0}>
            {filtered.map(item => (
              <MobileDataCard key={item.id}>
                <MobileDataCardTitle>{item.name}</MobileDataCardTitle>
                <MobileDataCardActions>
                  <ActionsMenu items={[
                    { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(item) },
                    { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(item) },
                    { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(item.id), danger: true },
                  ]} />
                </MobileDataCardActions>
              </MobileDataCard>
            ))}
          </MobileDataCards>
        </>
      )}

      {showForm && (
        <div className="complete-task-modal" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Редактирование' : 'Новая причина возникновения'}</h3>
            <div className="form-group">
              <label>Название *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Например: Износ оборудования" />
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

export default CausesDirectory;
