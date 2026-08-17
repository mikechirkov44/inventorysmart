/**
 * @fileoverview Страница справочника запасных частей (ЗИП).
 * Позволяет просматривать, добавлять, редактировать и удалять позиции ЗИП,
 * связывать их с оборудованием и работами.
 */

import { useState, useEffect, useMemo } from 'react';
import { Package, Copy, Pencil, Trash2, Search, Plus, X } from 'lucide-react';
import { sparePartsAPI, equipmentAPI, worksAPI } from '../services/api';
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

/** Компонент справочника запасных частей */
function SparePartsDirectory() {
  const [items, setItems] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [eqSearch, setEqSearch] = useState('');
  const [eqPickerOpen, setEqPickerOpen] = useState(false);
  const [wkSearch, setWkSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', article: '', manufacturer: '', unit: 'шт', minStock: 0, quantity: 0, equipmentIds: [], workLinks: []
  });

  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка всех необходимых данных при монтировании */
  useEffect(() => { fetchData(); }, []);

  /** Загрузка запчастей, оборудования и работ с сервера */
  const fetchData = async () => {
    try {
      const [sp, eq, wk] = await Promise.all([sparePartsAPI.getAll(), equipmentAPI.getAll(), worksAPI.getAll()]);
      setItems(sp.data);
      setEquipment(eq.data);
      setWorks(wk.data);
      setLoading(false);
    } catch { toast.error('Ошибка', 'Ошибка загрузки'); setLoading(false); }
  };

  /** Словарь для быстрого поиска имени оборудования по ID */
  const eqMap = useMemo(() => { const m = {}; equipment.forEach(e => { m[e.id] = e.name; }); return m; }, [equipment]);
  /** Словарь для быстрого поиска имени работы по ID */
  const wkMap = useMemo(() => { const m = {}; works.forEach(w => { m[w.id] = w.name; }); return m; }, [works]);

  /** Фильтрация оборудования для выпадающего списка */
  const filteredEq = useMemo(() => {
    if (!eqSearch) return equipment;
    const s = eqSearch.toLowerCase();
    return equipment.filter(e => e.name.toLowerCase().includes(s) || (e.inventoryNumber && e.inventoryNumber.toLowerCase().includes(s)));
  }, [equipment, eqSearch]);

  /** Фильтрация работ для выпадающего списка */
  const filteredWk = useMemo(() => {
    if (!wkSearch) return works;
    const s = wkSearch.toLowerCase();
    return works.filter(w => w.name.toLowerCase().includes(s));
  }, [works, wkSearch]);

  /** Фильтрация позиций ЗИП по поисковому запросу */
  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(s) ||
      (i.article && i.article.toLowerCase().includes(s)) ||
      (i.manufacturer && i.manufacturer.toLowerCase().includes(s))
    );
  }, [items, search]);

  /** Сброс формы и состояния редактирования */
  const resetForm = () => {
    setFormData({ name: '', article: '', manufacturer: '', unit: 'шт', minStock: 0, quantity: 0, equipmentIds: [], workLinks: [] });
    setEqSearch('');
    setEqPickerOpen(false);
    setWkSearch('');
    setEditId(null);
    setShowForm(false);
  };

  /** Открытие формы редактирования позиции */
  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      article: item.article || '',
      manufacturer: item.manufacturer || '',
      unit: item.unit || 'шт',
      minStock: item.minStock || 0,
      quantity: item.quantity || 0,
      equipmentIds: item.equipmentIds || [],
      workLinks: item.workLinks || []
    });
    setEditId(item.id);
    setShowForm(true);
  };

  /** Дублирование позиции ЗИП */
  const handleDuplicate = (item) => {
    setFormData({
      name: item.name + ' (копия)',
      article: item.article || '',
      manufacturer: item.manufacturer || '',
      unit: item.unit || 'шт',
      minStock: item.minStock || 0,
      quantity: 0,
      equipmentIds: item.equipmentIds || [],
      workLinks: item.workLinks || []
    });
    setEditId(null);
    setShowForm(true);
  };

  /** Переключение ID в массиве (оборудование или работы) */
  const toggleId = (field, id) => {
    setFormData(prev => {
      const ids = prev[field].includes(id) ? prev[field].filter(x => x !== id) : [...prev[field], id];
      return { ...prev, [field]: ids };
    });
  };

  /** Переключение привязки работы к ЗИП */
  const toggleWorkLink = (workId) => {
    setFormData(prev => {
      const exists = prev.workLinks.find(wl => wl.workId === workId);
      if (exists) {
        return { ...prev, workLinks: prev.workLinks.filter(wl => wl.workId !== workId) };
      }
      return { ...prev, workLinks: [...prev.workLinks, { workId, quantity: 1 }] };
    });
  };

  /** Обновление расхода ЗИП при выполнении работы */
  const updateWorkQuantity = (workId, quantity) => {
    setFormData(prev => ({
      ...prev,
      workLinks: prev.workLinks.map(wl => wl.workId === workId ? { ...wl, quantity: parseInt(quantity) || 0 } : wl)
    }));
  };

  /** Обработка отправки формы (создание или обновление) */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Введите наименование'); return; }
    try {
      if (editId) {
        await sparePartsAPI.update(editId, formData);
        toast.success('Успешно', 'Позиция обновлена');
      } else {
        await sparePartsAPI.create(formData);
        toast.success('Успешно', 'Позиция добавлена');
      }
      resetForm(); fetchData();
    } catch { toast.error('Ошибка', 'Ошибка сохранения'); }
  };

  /** Удаление позиции ЗИП с подтверждением */
  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удаление', message: 'Удалить позицию?', type: 'danger' });
    if (!confirmed) return;
    try { await sparePartsAPI.delete(id); fetchData(); } catch { toast.error('Ошибка', 'Ошибка удаления'); }
  };

  if (loading) return <SkeletonTable rows={6} cols={9} />;

  const isListEmpty = items.length === 0 && !search;
  const openAddForm = () => { resetForm(); setShowForm(true); };
  const selectedEquipment = equipment.filter((item) => formData.equipmentIds.includes(item.id));
  const availableEquipment = filteredEq.filter((item) => !formData.equipmentIds.includes(item.id));

  return (
    <div className="directory-page">
      <PageHeader icon={Package} title="Справочник ЗИП">
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить'}
        </button>
      </PageHeader>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование' : 'Новая позиция ЗИП'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Наименование *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Артикул</label>
                <input type="text" value={formData.article} onChange={(e) => setFormData({ ...formData, article: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Производитель</label>
                <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Ед. изм.</label>
                <CustomSelect value={formData.unit} onChange={(val) => setFormData({ ...formData, unit: val })} options={[
                  { value: 'шт', label: 'шт' },
                  { value: 'м', label: 'м' },
                  { value: 'м2', label: 'м²' },
                  { value: 'м3', label: 'м³' },
                  { value: 'кг', label: 'кг' },
                  { value: 'л', label: 'л' },
                  { value: 'компл', label: 'компл' },
                  { value: 'упак', label: 'упак' }
                ]} />
              </div>
              <div className="form-group">
                <label>Кол-во на складе</label>
                <input type="number" min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="form-group">
                <label>Минимальный запас</label>
                <input type="number" min="0" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="form-group">
              <div className="equipment-picker-label">
                <label>Оборудование</label>
                {selectedEquipment.length > 0 && (
                  <span>Выбрано: {selectedEquipment.length}</span>
                )}
              </div>

              <div className="equipment-picker">
                {selectedEquipment.length > 0 && (
                  <div className="equipment-picker-selected">
                    {selectedEquipment.map((eq) => (
                      <div key={eq.id} className="equipment-picker-chip">
                        <span>
                          <strong>{eq.name}</strong>
                          <small>{eq.inventoryNumber || 'Без инвентарного номера'}</small>
                        </span>
                        <button type="button" onClick={() => toggleId('equipmentIds', eq.id)} aria-label={`Убрать ${eq.name}`}>
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="equipment-picker-search">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Поиск по названию или инвентарному номеру"
                    value={eqSearch}
                    onFocus={() => setEqPickerOpen(true)}
                    onBlur={() => setTimeout(() => setEqPickerOpen(false), 150)}
                    onChange={(event) => { setEqSearch(event.target.value); setEqPickerOpen(true); }}
                  />
                  {eqSearch && (
                    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setEqSearch('')} aria-label="Очистить поиск">
                      <X size={15} />
                    </button>
                  )}
                </div>

                {eqPickerOpen && (
                  <div className="equipment-picker-results">
                    {availableEquipment.length === 0 ? (
                      <div className="equipment-picker-empty">
                        {equipment.length === selectedEquipment.length ? 'Всё оборудование уже выбрано' : 'Оборудование не найдено'}
                      </div>
                    ) : availableEquipment.map((eq) => (
                      <button
                        key={eq.id}
                        type="button"
                        className="equipment-picker-option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => { toggleId('equipmentIds', eq.id); setEqSearch(''); }}
                      >
                        <span>
                          <strong>{eq.name}</strong>
                          <small>{eq.inventoryNumber || 'Без инвентарного номера'}</small>
                        </span>
                        <Plus size={17} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Работы (расход ЗИП)</label>
              {formData.workLinks.length > 0 && (
                <div className="works-checkbox-list compact selected-list">
                  {works.filter(w => formData.workLinks.some(wl => wl.workId === w.id)).map(w => {
                    const wl = formData.workLinks.find(x => x.workId === w.id);
                    return (
                      <label key={w.id} className="checkbox-item selected">
                        <input type="checkbox" checked={true} onChange={() => toggleWorkLink(w.id)} />
                        <span className="checkbox-label">{w.name}<span className="checkbox-hint">каждые {w.frequencyDays} дн.</span></span>
                        <input type="number" min="0" value={wl ? wl.quantity : 0} onChange={(e) => updateWorkQuantity(w.id, e.target.value)} className="work-qty-input" title="Расход за 1 работу" />
                      </label>
                    );
                  })}
                </div>
              )}
              <input type="text" placeholder="Найти и добавить работы..." value={wkSearch} onChange={(e) => setWkSearch(e.target.value)} className="filter-search-sm" />
              {wkSearch && (
                <div className="works-checkbox-list compact search-results">
                  {filteredWk.filter(w => !formData.workLinks.some(wl => wl.workId === w.id)).length === 0 && (
                    <p className="no-works-hint">Ничего не найдено</p>
                  )}
                  {filteredWk.filter(w => !formData.workLinks.some(wl => wl.workId === w.id)).map(w => (
                    <label key={w.id} className="checkbox-item">
                      <input type="checkbox" checked={false} onChange={() => { toggleWorkLink(w.id); setWkSearch(''); }} />
                      <span className="checkbox-label">{w.name}<span className="checkbox-hint">каждые {w.frequencyDays} дн.</span></span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} className="btn">Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Панель фильтров и поиска */}
      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по наименованию, артикулу, производителю..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {items.length}</div>
      </div>

      {/* Таблица позиций ЗИП */}
      <div className="table-container desktop-table-only">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Артикул</th>
                <th>Производитель</th>
                <th>Ед.</th>
                <th>Кол-во</th>
                <th>Мин. запас</th>
                <th>Оборудование</th>
                <th>Работы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {isListEmpty ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState
                      icon={Package}
                      title="Позиции ЗИП ещё не добавлены"
                      description="Создайте первую позицию запасных частей для учёта остатков и привязки к оборудованию."
                      actionLabel="+ Добавить"
                      onAction={openAddForm}
                    />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" className="no-results-cell">Позиции не найдены</td></tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id}>
                    <td className="td-bold">{item.name}</td>
                    <td>{item.article || '—'}</td>
                    <td>{item.manufacturer || '—'}</td>
                    <td>{item.unit || 'шт'}</td>
                    <td>
                      <span className={`sp-quantity ${(item.quantity || 0) <= 0 ? 'empty' : (item.quantity || 0) <= (item.minStock || 0) ? 'low' : ''}`}>
                        {item.quantity || 0}
                      </span>
                    </td>
                    <td>{item.minStock}</td>
                    <td>
                      <div className="td-tags">
                        {(item.equipmentIds || []).map(id => eqMap[id]).filter(Boolean).map(name => (
                          <span key={name} className="frequency-badge">{name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="td-tags">
                        {(item.workLinks || []).map(wl => {
                          const w = works.find(x => x.id === wl.workId);
                          return w ? (
                            <span key={wl.workId} className="equipment-count-badge">{w.name}{wl.quantity > 0 ? ` ×${wl.quantity}` : ''}</span>
                          ) : null;
                        })}
                      </div>
                    </td>
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

      <MobileDataCards empty={filtered.length === 0} emptyMessage="Позиции не найдены">
        {filtered.map(item => (
          <MobileDataCard key={item.id}>
            <MobileDataCardTitle>{item.name}</MobileDataCardTitle>
            <MobileDataCardRow label="Артикул">{item.article || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Производитель">{item.manufacturer || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Ед. изм.">{item.unit || 'шт'}</MobileDataCardRow>
            <MobileDataCardRow label="Кол-во">
              <span className={`sp-quantity ${(item.quantity || 0) <= 0 ? 'empty' : (item.quantity || 0) <= (item.minStock || 0) ? 'low' : ''}`}>
                {item.quantity || 0}
              </span>
            </MobileDataCardRow>
            <MobileDataCardRow label="Мин. запас">{item.minStock}</MobileDataCardRow>
            <MobileDataCardRow label="Оборудование">
              <div className="td-tags">
                {(item.equipmentIds || []).map(id => eqMap[id]).filter(Boolean).map(name => (
                  <span key={name} className="frequency-badge">{name}</span>
                ))}
                {(item.equipmentIds || []).length === 0 && '—'}
              </div>
            </MobileDataCardRow>
            <MobileDataCardRow label="Работы">
              <div className="td-tags">
                {(item.workLinks || []).map(wl => {
                  const w = works.find(x => x.id === wl.workId);
                  return w ? (
                    <span key={wl.workId} className="equipment-count-badge">{w.name}{wl.quantity > 0 ? ` ×${wl.quantity}` : ''}</span>
                  ) : null;
                })}
                {(item.workLinks || []).length === 0 && '—'}
              </div>
            </MobileDataCardRow>
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
    </div>
  );
}

export default SparePartsDirectory;
