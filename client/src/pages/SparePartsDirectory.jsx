/**
 * @fileoverview Страница справочника запасных частей (ЗИП).
 * Позволяет просматривать, добавлять, редактировать и удалять позиции ЗИП,
 * связывать их с оборудованием и работами.
 */

import { useState, useEffect, useMemo } from 'react';
import { sparePartsAPI, equipmentAPI, worksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';

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

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1>Справочник ЗИП</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить'}
        </button>
      </div>

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
              <label>Оборудование</label>
              {formData.equipmentIds.length > 0 && (
                <div className="works-checkbox-list compact selected-list">
                  {equipment.filter(e => formData.equipmentIds.includes(e.id)).map(eq => (
                    <label key={eq.id} className="checkbox-item selected">
                      <input type="checkbox" checked={true} onChange={() => toggleId('equipmentIds', eq.id)} />
                      <span className="checkbox-label">{eq.name}<span className="checkbox-hint">{eq.inventoryNumber}</span></span>
                    </label>
                  ))}
                </div>
              )}
              <input type="text" placeholder="Найти и добавить оборудование..." value={eqSearch} onChange={(e) => setEqSearch(e.target.value)} className="filter-search-sm" />
              {eqSearch && (
                <div className="works-checkbox-list compact search-results">
                  {filteredEq.filter(e => !formData.equipmentIds.includes(e.id)).length === 0 && (
                    <p className="no-works-hint">Ничего не найдено</p>
                  )}
                  {filteredEq.filter(e => !formData.equipmentIds.includes(e.id)).map(eq => (
                    <label key={eq.id} className="checkbox-item">
                      <input type="checkbox" checked={false} onChange={() => { toggleId('equipmentIds', eq.id); setEqSearch(''); }} />
                      <span className="checkbox-label">{eq.name}<span className="checkbox-hint">{eq.inventoryNumber}</span></span>
                    </label>
                  ))}
                </div>
              )}
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
      <div className="table-container">
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
              {filtered.length === 0 ? (
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
                      <div className="table-actions">
                        <button onClick={() => handleEdit(item)} className="btn btn-small btn-secondary">Ред.</button>
                        <button onClick={() => handleDelete(item.id)} className="btn btn-small btn-danger">Удал.</button>
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

export default SparePartsDirectory;
