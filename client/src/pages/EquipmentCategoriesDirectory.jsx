/**
 * @fileoverview Справочник категорий оборудования.
 * Управление категориями: добавление, редактирование, удаление.
 */

import { useState, useEffect, useMemo } from 'react';
import { FolderTree, Pencil, Trash2, Plus } from 'lucide-react';
import { equipmentCategoriesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
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

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1><FolderTree size={24} />Категории оборудования</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить категорию'}
        </button>
      </div>

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

      <div className="table-container">
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
              {categories.length === 0 ? (
                <tr><td colSpan="3" className="no-results-cell">Категории не найдены</td></tr>
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
    </div>
  );
}

export default EquipmentCategoriesDirectory;
