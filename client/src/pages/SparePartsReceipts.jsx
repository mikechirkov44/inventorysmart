/**
 * @fileoverview Страница приходных документов ЗИП.
 * Управление поступлениями запасных частей на склад:
 * создание, просмотр, удаление документов с автоматическим обновлением остатков.
 */

import { useState, useEffect, useMemo } from 'react';
import { FileText, Eye, Trash2 } from 'lucide-react';
import { sparePartsReceiptsAPI, sparePartsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import CustomDatePicker from '../components/CustomDatePicker';
import ActionsMenu from '../components/ActionsMenu';

/** Компонент управления приходными документами ЗИП */
function SparePartsReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [allSpareParts, setAllSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [formData, setFormData] = useState({
    documentNumber: '',
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    notes: '',
    items: []
  });

  const [spSearch, setSpSearch] = useState('');

  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка документов и справочника ЗИП при монтировании */
  useEffect(() => { fetchData(); }, []);

  /** Загрузка всех приходных документов и запасных частей */
  const fetchData = async () => {
    try {
      const [receiptsRes, spRes] = await Promise.all([
        sparePartsReceiptsAPI.getAll(),
        sparePartsAPI.getAll()
      ]);
      setReceipts(receiptsRes.data);
      setAllSpareParts(spRes.data);
      setLoading(false);
    } catch {
      toast.error('Ошибка загрузки');
      setLoading(false);
    }
  };

  /** Словарь ЗИП для быстрого поиска по ID */
  const spMap = useMemo(() => {
    const m = {};
    allSpareParts.forEach(sp => { m[sp.id] = sp; });
    return m;
  }, [allSpareParts]);

  /** Фильтрация ЗИП для добавления в документ */
  const filteredSp = useMemo(() => {
    if (!spSearch) return [];
    const s = spSearch.toLowerCase();
    return allSpareParts.filter(sp =>
      sp.name.toLowerCase().includes(s) ||
      (sp.article && sp.article.toLowerCase().includes(s))
    ).slice(0, 10);
  }, [allSpareParts, spSearch]);

  /** Фильтрация документов по поисковому запросу */
  const filtered = useMemo(() => {
    if (!search) return receipts;
    const s = search.toLowerCase();
    return receipts.filter(r =>
      r.documentNumber.toLowerCase().includes(s) ||
      (r.supplier && r.supplier.toLowerCase().includes(s))
    );
  }, [receipts, search]);

  /** Сброс формы с получением следующего номера документа */
  const resetForm = async () => {
    try {
      const res = await sparePartsReceiptsAPI.getNextNumber();
      setFormData({
        documentNumber: res.data.number,
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        notes: '',
        items: []
      });
    } catch {
      setFormData({
        documentNumber: '',
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        notes: '',
        items: []
      });
    }
    setShowForm(false);
    setSpSearch('');
  };

  /** Начало создания нового документа */
  const startCreate = async () => {
    await resetForm();
    try {
      const res = await sparePartsReceiptsAPI.getNextNumber();
      setFormData(prev => ({ ...prev, documentNumber: res.data.number }));
    } catch {}
    setShowForm(true);
  };

  /** Добавление позиции ЗИП в документ */
  const addItem = (sp) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { sparePartId: sp.id, sparePartName: sp.name, sparePartArticle: sp.article, sparePartUnit: sp.unit, quantity: 1, unitPrice: 0 }]
    }));
    setSpSearch('');
  };

  /** Обновление количества или цены позиции в документе */
  const updateItem = (sparePartId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(it =>
        it.sparePartId === sparePartId ? { ...it, [field]: field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0 } : it
      )
    }));
  };

  /** Удаление позиции из документа */
  const removeItem = (sparePartId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(it => it.sparePartId !== sparePartId)
    }));
  };

  /** Отправка документа и обновление остатков на складе */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setError('Добавьте хотя бы одну позицию');
      return;
    }
    try {
      await sparePartsReceiptsAPI.create(formData);
      toast.success('Документ создан, остатки обновлены');
      resetForm();
      fetchData();
    } catch (err) {
      toast.error('Ошибка сохранения: ' + (err.response?.data?.error || err.message));
    }
  };

  /** Удаление документа с откатом остатков */
  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удалить документ?', message: 'Остатки будут откачены.', type: 'danger' });
    if (confirmed) {
      try {
        await sparePartsReceiptsAPI.delete(id);
        toast.success('Документ удалён, остатки откачены');
        fetchData();
      } catch {
        toast.error('Ошибка удаления');
      }
    }
  };

  /** Форматирование цены в рублях */
  const formatPrice = (val) => {
    if (!val) return '0';
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(val);
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1><FileText size={24} />Приходные документы ЗИП</h1>
        <button onClick={startCreate} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Новый документ'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>Новый приходный документ</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Номер документа</label>
                <input type="text" value={formData.documentNumber} readOnly className="input-readonly" />
              </div>
              <div className="form-group">
                <label>Дата</label>
                <CustomDatePicker value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
              </div>
              <div className="form-group">
                <label>Поставщик</label>
                <input type="text" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} placeholder="Наименование поставщика" />
              </div>
            </div>
            <div className="form-group">
              <label>Примечание</label>
              <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Необязательно" />
            </div>

            <div className="form-group">
              <label>Позиции документа</label>
              {formData.items.length > 0 && (
                <div className="table-container" style={{ marginBottom: 8 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Артикул</th>
                        <th>Ед.</th>
                        <th>Кол-во</th>
                        <th>Цена за ед.</th>
                        <th>Сумма</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map(it => (
                        <tr key={it.sparePartId}>
                          <td className="td-bold">{it.sparePartName}</td>
                          <td>{it.sparePartArticle || '—'}</td>
                          <td>{it.sparePartUnit || 'шт'}</td>
                          <td>
                            <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(it.sparePartId, 'quantity', e.target.value)} className="wo-sp-input" />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(it.sparePartId, 'unitPrice', e.target.value)} className="wo-sp-input" />
                          </td>
                          <td>{formatPrice((it.quantity || 0) * (it.unitPrice || 0))}</td>
                          <td>
                            <button type="button" onClick={() => removeItem(it.sparePartId)} className="btn btn-small btn-danger">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <input type="text" placeholder="Найти ЗИП для добавления..." value={spSearch} onChange={(e) => setSpSearch(e.target.value)} className="filter-search-sm" />
              {spSearch && (
                <div className="works-checkbox-list compact search-results">
                  {filteredSp.filter(sp => !formData.items.some(it => it.sparePartId === sp.id)).length === 0 && (
                    <p className="no-works-hint">Ничего не найдено</p>
                  )}
                  {filteredSp.filter(sp => !formData.items.some(it => it.sparePartId === sp.id)).map(sp => (
                    <label key={sp.id} className="checkbox-item">
                      <span className="checkbox-label">
                        {sp.name}
                        <span className="checkbox-hint">{sp.article || ''}{sp.unit ? ` (${sp.unit})` : ''}</span>
                      </span>
                      <button type="button" onClick={() => addItem(sp)} className="btn btn-small btn-primary">+</button>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary">Создать документ</button>
              <button type="button" onClick={resetForm} className="btn">Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Панель фильтров */}
      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по номеру, поставщику..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {receipts.length}</div>
      </div>

      {/* Таблица приходных документов */}
      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Дата</th>
                <th>Поставщик</th>
                <th>Позиций</th>
                <th>Сумма</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="no-results-cell">Документы не найдены</td></tr>
              ) : (
                filtered.map(r => {
                  const totalSum = (r.items || []).reduce((s, it) => s + (it.quantity || 0) * (it.unitPrice || 0), 0);
                  const totalQty = (r.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
                  return (
                    <tr key={r.id} className={expandedId === r.id ? 'row-expanded' : ''}>
                      <td className="td-bold">
                        <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="btn-link">
                          {r.documentNumber}
                        </button>
                      </td>
                      <td>{r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '—'}</td>
                      <td>{r.supplier || '—'}</td>
                      <td>{(r.items || []).length} ({totalQty} шт.)</td>
                      <td>{totalSum > 0 ? formatPrice(totalSum) : '—'}</td>
                      <td>
                        <ActionsMenu items={[
                          { icon: <Eye size={14} />, label: 'Подробнее', onClick: () => setExpandedId(expandedId === r.id ? null : r.id) },
                          { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(r.id), danger: true },
                        ]} />
                      </td>
                    </tr>
                  );
                })
              )}
              {filtered.filter(r => expandedId === r.id).map(r => (
                <tr key={`${r.id}-expanded`} className="row-expanded-detail">
                  <td colSpan="6">
                    <div className="receipt-detail">
                      {r.notes && <p><strong>Примечание:</strong> {r.notes}</p>}
                      <table className="data-table" style={{ margin: '8px 0' }}>
                        <thead>
                          <tr>
                            <th>Наименование</th>
                            <th>Артикул</th>
                            <th>Ед.</th>
                            <th>Кол-во</th>
                            <th>Цена</th>
                            <th>Сумма</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(r.items || []).map(it => (
                            <tr key={it.id}>
                              <td>{it.sparePartName || '—'}</td>
                              <td>{it.sparePartArticle || '—'}</td>
                              <td>{it.sparePartUnit || 'шт'}</td>
                              <td>{it.quantity}</td>
                              <td>{it.unitPrice > 0 ? formatPrice(it.unitPrice) : '—'}</td>
                              <td>{it.unitPrice > 0 ? formatPrice(it.quantity * it.unitPrice) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SparePartsReceipts;
