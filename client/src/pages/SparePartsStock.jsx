import { useState, useEffect, useMemo } from 'react';
import { sparePartsAPI } from '../services/api';

function SparePartsStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [replenishMode, setReplenishMode] = useState(false);
  const [replenishData, setReplenishData] = useState({});

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await sparePartsAPI.getAll();
      setItems(res.data);
      setLoading(false);
    } catch {
      setError('Ошибка загрузки');
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(s) ||
        (i.article && i.article.toLowerCase().includes(s)) ||
        (i.manufacturer && i.manufacturer.toLowerCase().includes(s))
      );
    }
    if (filterStatus === 'ok') result = result.filter(i => (i.quantity || 0) > (i.minStock || 0));
    else if (filterStatus === 'low') result = result.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.minStock || 0));
    else if (filterStatus === 'empty') result = result.filter(i => (i.quantity || 0) === 0);
    return result;
  }, [items, search, filterStatus]);

  const stats = useMemo(() => {
    const total = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalValue = items.length;
    const empty = items.filter(i => (i.quantity || 0) === 0).length;
    const low = items.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) <= (i.minStock || 0)).length;
    const ok = items.filter(i => (i.quantity || 0) > (i.minStock || 0)).length;
    return { total, totalValue, empty, low, ok };
  }, [items]);

  const toggleReplenish = () => {
    if (replenishMode) {
      setReplenishMode(false);
      setReplenishData({});
    } else {
      const initial = {};
      items.forEach(i => { initial[i.id] = 0; });
      setReplenishData(initial);
      setReplenishMode(true);
    }
  };

  const updateReplenishQty = (id, qty) => {
    setReplenishData(prev => ({ ...prev, [id]: parseInt(qty) || 0 }));
  };

  const submitReplenish = async () => {
    const itemsToReplenish = Object.entries(replenishData)
      .filter(([, qty]) => qty > 0)
      .map(([sparePartId, quantity]) => ({ sparePartId, quantity }));
    if (itemsToReplenish.length === 0) {
      setError('Укажите количество хотя бы для одной позиции');
      return;
    }
    try {
      await sparePartsAPI.replenish(itemsToReplenish);
      setSuccess(`Пополнено ${itemsToReplenish.length} позиций`);
      setReplenishMode(false);
      setReplenishData({});
      fetchItems();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Ошибка пополнения');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="directory-page">
      <div className="header">
        <h1>Остатки ЗИП</h1>
        <div className="header-actions">
          <button onClick={toggleReplenish} className={`btn ${replenishMode ? 'btn-danger' : 'btn-primary'}`}>
            {replenishMode ? 'Отмена' : 'Пополнить склад'}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="analytics-summary" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        <div className="summary-card success">
          <div className="summary-value">{stats.ok}</div>
          <div className="summary-label">В норме</div>
        </div>
        <div className="summary-card" style={{ borderTopColor: 'var(--warning)' }}>
          <div className="summary-value" style={{ color: 'var(--warning)' }}>{stats.low}</div>
          <div className="summary-label">Мало</div>
        </div>
        <div className="summary-card danger">
          <div className="summary-value">{stats.empty}</div>
          <div className="summary-label">Нет на складе</div>
        </div>
        <div className="summary-card primary">
          <div className="summary-value">{stats.total}</div>
          <div className="summary-label">Всего единиц</div>
        </div>
      </div>

      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по наименованию, артикулу..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Все</option>
            <option value="ok">В норме</option>
            <option value="low">Мало</option>
            <option value="empty">Нет на складе</option>
          </select>
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {items.length}</div>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Артикул</th>
                <th>Производитель</th>
                <th>На складе</th>
                <th>Мин. запас</th>
                {replenishMode && <th>Пополнить</th>}
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={replenishMode ? 7 : 6} className="no-results-cell">Позиции не найдены</td></tr>
              ) : (
                filtered.map(item => {
                  const qty = item.quantity || 0;
                  const min = item.minStock || 0;
                  const status = qty === 0 ? 'empty' : qty <= min ? 'low' : 'ok';
                  const statusLabel = qty === 0 ? 'Нет' : qty <= min ? 'Мало' : 'В норме';
                  return (
                    <tr key={item.id} className={status === 'empty' ? 'row-warning' : ''}>
                      <td className="td-bold">{item.name}</td>
                      <td>{item.article || '—'}</td>
                      <td>{item.manufacturer || '—'}</td>
                      <td>
                        <span className={`sp-quantity ${status}`}>{qty}</span>
                      </td>
                      <td>{min}</td>
                      {replenishMode && (
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={replenishData[item.id] || ''}
                            onChange={(e) => updateReplenishQty(item.id, e.target.value)}
                            className="replenish-input"
                            placeholder="0"
                          />
                        </td>
                      )}
                      <td>
                        <span className={`overdue-badge ${status === 'ok' ? 'ok' : status === 'low' ? 'new' : 'overdue'}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {replenishMode && (
        <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={submitReplenish} className="btn btn-primary">Подтвердить пополнение</button>
          <button onClick={toggleReplenish} className="btn">Отмена</button>
        </div>
      )}
    </div>
  );
}

export default SparePartsStock;
