/**
 * @module WorksDirectory
 * @description Справочник работ: добавление, редактирование, удаление плановых работ.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Copy, Pencil, Trash2, Users } from 'lucide-react';
import { worksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
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
import FrequencyBadge from '../components/FrequencyBadge';
import { FREQUENCY_OPTIONS } from '../utils/frequency';

const PRIORITY_FILTER_OPTIONS = [
  { value: 'A', label: 'A — Высокий' },
  { value: 'B', label: 'B — Средний' },
  { value: 'C', label: 'C — Низкий' },
];

function WorksDirectory() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
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
  const { canEdit } = useAuth();

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

  const categoryFilterOptions = useMemo(() => [
    { value: '__empty__', label: 'Без категории' },
    ...categories.map((category) => ({ value: category, label: category })),
  ], [categories]);

  const hasActiveFilters = Boolean(
    filterName || filterCategory || filterFrequency || filterPriority || filterDescription
  );

  const clearFilters = () => {
    setFilterName('');
    setFilterCategory('');
    setFilterFrequency('');
    setFilterPriority('');
    setFilterDescription('');
  };

  /** Фильтрация работ по столбцам таблицы */
  const filtered = useMemo(() => {
    let result = [...works];
    if (filterName) {
      const query = filterName.toLowerCase();
      result = result.filter((work) => work.name.toLowerCase().includes(query));
    }
    if (filterCategory === '__empty__') {
      result = result.filter((work) => !work.category);
    } else if (filterCategory) {
      result = result.filter((work) => work.category === filterCategory);
    }
    if (filterFrequency) {
      result = result.filter((work) => work.frequencyDays === Number(filterFrequency));
    }
    if (filterPriority) {
      result = result.filter((work) => (work.priority || 'B') === filterPriority);
    }
    if (filterDescription) {
      const query = filterDescription.toLowerCase();
      result = result.filter((work) => work.description && work.description.toLowerCase().includes(query));
    }
    return result;
  }, [works, filterName, filterCategory, filterFrequency, filterPriority, filterDescription]);

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

  if (loading) return <SkeletonTable rows={6} cols={6} />;

  const isListEmpty = works.length === 0 && !hasActiveFilters;
  const openAddForm = () => { resetForm(); setShowForm(true); };

  return (
    <div className="directory-page">
      <PageHeader icon={Wrench} title="Справочник работ">
        {canEdit('equipment') && (
          <Link to="/works/bulk-assign" className="btn btn-secondary">
            <Users size={16} /> Назначить на оборудование
          </Link>
        )}
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить работу'}
        </button>
      </PageHeader>

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
        <div className="filter-row mobile-column-filters">
          <div className="filter-group">
            <label>Название</label>
            <input
              type="text"
              placeholder="Фильтр..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="column-filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Категория</label>
            <CustomSelect
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Все"
              options={categoryFilterOptions}
            />
          </div>
          <div className="filter-group">
            <label>Периодичность</label>
            <CustomSelect
              value={filterFrequency}
              onChange={setFilterFrequency}
              placeholder="Все"
              options={FREQUENCY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>
          <div className="filter-group">
            <label>Приоритет</label>
            <CustomSelect
              value={filterPriority}
              onChange={setFilterPriority}
              placeholder="Все"
              options={PRIORITY_FILTER_OPTIONS}
            />
          </div>
          <div className="filter-group">
            <label>Описание</label>
            <input
              type="text"
              placeholder="Фильтр..."
              value={filterDescription}
              onChange={(e) => setFilterDescription(e.target.value)}
              className="column-filter-input"
            />
          </div>
        </div>
        <div className="filter-row compact">
          <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {works.length}</div>
          {hasActiveFilters && (
            <button type="button" className="btn btn-link btn-sm" onClick={clearFilters}>
              Сбросить фильтры
            </button>
          )}
        </div>
      </div>

      <div className="table-container desktop-table-only">
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
              <tr className="column-filters-row">
                <th>
                  <input
                    type="text"
                    placeholder="Фильтр..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="column-filter-input"
                    aria-label="Фильтр по названию"
                  />
                </th>
                <th>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="column-filter-select"
                    aria-label="Фильтр по категории"
                  >
                    <option value="">Все</option>
                    <option value="__empty__">Без категории</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={filterFrequency}
                    onChange={(e) => setFilterFrequency(e.target.value)}
                    className="column-filter-select"
                    aria-label="Фильтр по периодичности"
                  >
                    <option value="">Все</option>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="column-filter-select"
                    aria-label="Фильтр по приоритету"
                  >
                    <option value="">Все</option>
                    {PRIORITY_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </th>
                <th>
                  <input
                    type="text"
                    placeholder="Фильтр..."
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    className="column-filter-input"
                    aria-label="Фильтр по описанию"
                  />
                </th>
                <th className="column-filter-actions">
                  {hasActiveFilters && (
                    <button type="button" className="btn btn-link btn-sm" onClick={clearFilters}>
                      Сбросить
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {isListEmpty ? (
                <tr>
                  <td colSpan="6">
                    <EmptyState
                      icon={Wrench}
                      title="Работы ещё не добавлены"
                      description="Создайте плановые работы для назначения обслуживания оборудования."
                      actionLabel="+ Добавить работу"
                      onAction={openAddForm}
                    />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="no-results-cell">Работы не найдены</td></tr>
              ) : (
                filtered.map(work => (
                  <tr key={work.id}>
                    <td className="td-bold">{work.name}</td>
                    <td>{work.category || '—'}</td>
                    <td><FrequencyBadge days={work.frequencyDays} /></td>
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

      <MobileDataCards empty={filtered.length === 0} emptyMessage="Работы не найдены">
        {filtered.map(work => (
          <MobileDataCard key={work.id}>
            <MobileDataCardTitle>{work.name}</MobileDataCardTitle>
            <MobileDataCardRow label="Категория">{work.category || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Периодичность">
              <FrequencyBadge days={work.frequencyDays} />
            </MobileDataCardRow>
            <MobileDataCardRow label="Приоритет">
              <span className={`priority-badge priority-${(work.priority || 'B').toLowerCase()}`}>{work.priority || 'B'}</span>
            </MobileDataCardRow>
            <MobileDataCardRow label="Описание">{work.description || '—'}</MobileDataCardRow>
            <MobileDataCardActions>
              <ActionsMenu items={[
                { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(work) },
                { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(work) },
                { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(work.id), danger: true },
              ]} />
            </MobileDataCardActions>
          </MobileDataCard>
        ))}
      </MobileDataCards>
    </div>
  );
}

export default WorksDirectory;
