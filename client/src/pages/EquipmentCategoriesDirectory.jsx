/**
 * @fileoverview Справочник категорий оборудования.
 * Управление категориями: добавление, редактирование, удаление.
 */

import { useState, useEffect } from 'react';
import { Layers, Pencil, Trash2 } from 'lucide-react';
import { equipmentCategoriesAPI } from '../services/api';
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
import ActionsMenu from '../components/ActionsMenu';

function EquipmentCategoriesDirectory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await equipmentCategoriesAPI.getAll();
      setCategories(response.data);
      setLoading(false);
    } catch {
      toast.error('Ошибка загрузки категорий');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (cat) => {
    setFormData({ name: cat.name || '', description: cat.description || '' });
    setEditId(cat.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Введите название категории');
      return;
    }
    try {
      if (editId) {
        await equipmentCategoriesAPI.update(editId, formData);
        toast.success('Категория обновлена');
      } else {
        await equipmentCategoriesAPI.create(formData);
        toast.success('Категория добавлена');
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (delId) => {
    if (await confirm({ title: 'Удалить категорию?', message: 'Это действие нельзя отменить.', type: 'danger' })) {
      try {
        await equipmentCategoriesAPI.delete(delId);
        fetchCategories();
      } catch {
        toast.error('Ошибка удаления');
      }
    }
  };

  if (loading) return <SkeletonTable rows={6} cols={3} />;

  const isListEmpty = categories.length === 0;
  const openAddForm = () => { resetForm(); setShowForm(true); };

  return (
    <div className="directory-page">
      <PageHeader icon={Layers} title="Категории оборудования">
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить категорию'}
        </button>
      </PageHeader>

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование категории' : 'Новая категория'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Название *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Станки, Прессы, Насосы"
                />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание категории"
                />
              </div>
            </div>
            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} className="btn">Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container desktop-table-only">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Описание</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {isListEmpty ? (
                <tr>
                  <td colSpan="3">
                    <EmptyState
                      icon={Layers}
                      title="Категории ещё не добавлены"
                      description="Создайте категории для группировки оборудования в справочнике."
                      actionLabel="+ Добавить категорию"
                      onAction={openAddForm}
                    />
                  </td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id}>
                    <td className="td-bold">{cat.name}</td>
                    <td>{cat.description || '—'}</td>
                    <td>
                      <ActionsMenu items={[
                        { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(cat) },
                        { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(cat.id), danger: true },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MobileDataCards empty={categories.length === 0} emptyMessage="Категории не найдены">
        {categories.map(cat => (
          <MobileDataCard key={cat.id}>
            <MobileDataCardTitle>{cat.name}</MobileDataCardTitle>
            <MobileDataCardRow label="Описание">{cat.description || '—'}</MobileDataCardRow>
            <MobileDataCardActions>
              <ActionsMenu items={[
                { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(cat) },
                { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(cat.id), danger: true },
              ]} />
            </MobileDataCardActions>
          </MobileDataCard>
        ))}
      </MobileDataCards>
    </div>
  );
}

export default EquipmentCategoriesDirectory;
