/**
 * @module WorksDirectory
 * @description Справочник работ: добавление, редактирование, удаление плановых работ.
 */
import { useState, useEffect, useMemo } from 'react';
import { FolderTree, Copy, Pencil, Trash2 } from 'lucide-react';
import { worksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import ActionsMenu from '../components/ActionsMenu';

/** Варианты периодичности работ */
const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Ежедневно' },
  { value: 7, label: '1 раз в неделю' },
  { value: 10, label: '1 раз в 10 дней' },
  { value: 14, label: '1 раз в 2 недели' },
  { value: 30, label: '1 раз в месяц' },
  { value: 60, label: '1 раз в 2 месяца' },
  { value: 90, label: '1 раз в 3 месяца' },
  { value: 180, label: '1 раз в 6 месяцев' },
  { value: 365, label: '1 раз в год' },
];

function getFrequencyLabel(days) {
  const opt = FREQUENCY_OPTIONS.find(o => o.value === days);
  return opt ? opt.label : `каждые ${days} дн.`;
}

function WorksDirectory() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequencyDays: 30,
    category: '',
    priority: 'B'
  });
  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка списка работ при монтировании */
  useEffect(() => { fetchWorks(); }, []);

  /** Получение списка работ с сервера */
  const fetchWorks = async () => {
    try {
      const response = await worksAPI.getAll();
      setWorks(response.data);
      setLoading(false);
    } catch { toast.error('Ошибка загрузки справочника работ'); setLoading(false); }
  };

  /** Уникальные категории работ */
  const categories = useMemo(() => {
    return [...new Set(works.map(w => w.category).filter(Boolean))].sort();
  }, [works]);

  /** Фильтрация работ по поиску и категории */
  const filtered = useMemo(() => {
    let result = [...works];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(w =>
        w.name.toLowerCase().includes(s) ||
        (w.description && w.description.toLowerCase().includes(s))
      );
    }
    if (filterCategory) result = result.filter(w => w.category === filterCategory);
    return result;
  }, [works, search, filterCategory]);

  /** Сброс формы и закрытие */
  const resetForm = () => {
    setFormData({ name: '', description: '', frequencyDays: 30, category: '', priority: 'B' });
    setEditId(null);
    setShowForm(false);
  };

  /** Открытие формы редактирования работы */
  const handleEdit = (work) => {
    setFormData({
      name: work.name,
      description: work.description || '',
      frequencyDays: work.frequencyDays || 30,
      category: work.category || '',
      priority: work.priority || 'B'
    });
    setEditId(work.id);
    setShowForm(true);
  };

  /** Дублирование работы */
  const handleDuplicate = (work) => {
    setFormData({
      name: work.name + ' (копия)',
      description: work.description || '',
      frequencyDays: work.frequencyDays || 30,
      category: work.category || '',
      priority: work.priority || 'B'
    });
    setEditId(null);
    setShowForm(true);
  };

  /** Создание или обновление работы */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Введите название работы'); return; }
    try {
      if (editId) {
        await worksAPI.update(editId, formData);
        toast.success('Работа обновлена');
      } else {
        await worksAPI.create(formData);
        toast.success('Работа добавлена');
      }
      resetForm();
      fetchWorks();
    } catch (err) {
      toast.error('Ошибка сохранения');
    }
  };

  /** Удаление работы с подтверждением */
  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Удалить работу?', message: 'Удалить работу из справочника?', type: 'danger', confirmText: 'Удалить' });
    if (ok) {
      try { await worksAPI.delete(id); fetchWorks(); }
      catch { toast.error('Ошибка удаления'); }
    }
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1><FolderTree size={24} />Справочник работ</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить работу'}
        </button>
      </div>

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование работы' : 'Новая работа'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Название работы *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: Замена масла" />
              </div>
              <div className="form-group">
                <label>Категория</label>
                <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Например: ТО" list="work-categories" />
                <datalist id="work-categories">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Периодичность *</label>
                <CustomSelect
                  value={formData.frequencyDays}
                  onChange={(v) => setFormData({ ...formData, frequencyDays: v })}
                  options={FREQUENCY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                />
              </div>
              <div className="form-group">
                <label>Приоритет</label>
                <CustomSelect
                  value={formData.priority}
                  onChange={(v) => setFormData({ ...formData, priority: v })}
                  options={[
                    { value: 'A', label: 'A — Высокий' },
                    { value: 'B', label: 'B — Средний' },
                    { value: 'C', label: 'C — Низкий' }
                  ]}
                />
              </div>
              <div className="form-group flex-1">
                <label>Описание</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Описание работы" />
              </div>
            </div>
            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} className="btn">Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по названию или описанию..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <CustomSelect
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder="Все категории"
            options={categories.map(c => ({ value: c, label: c }))}
          />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {works.length}</div>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Категория</th>
                <th>Периодичность</th>
                <th>Приоритет</th>
                <th>Описание</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="no-results-cell">Работы не найдены</td></tr>
              ) : (
                filtered.map(work => (
                  <tr key={work.id}>
                    <td className="td-bold">{work.name}</td>
                    <td>{work.category || '—'}</td>
                    <td><span className="frequency-badge">{getFrequencyLabel(work.frequencyDays)}</span></td>
                    <td><span className={`priority-badge priority-${(work.priority || 'B').toLowerCase()}`}>{work.priority || 'B'}</span></td>
                    <td className="td-muted">{work.description || '—'}</td>
                    <td>
                      <ActionsMenu items={[
                        { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(work) },
                        { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(work) },
                        { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(work.id), danger: true },
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

export default WorksDirectory;
