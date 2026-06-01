import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workOrderAPI, equipmentAPI, sparePartsAPI } from '../services/api';

function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [allSpareParts, setAllSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [completingId, setCompletingId] = useState(null);
  const [sparePartsSelection, setSparePartsSelection] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workOrdersRes, equipmentRes, spRes] = await Promise.all([
        workOrderAPI.getAll(),
        equipmentAPI.getAll(),
        sparePartsAPI.getAll()
      ]);
      setWorkOrders(workOrdersRes.data);
      setEquipment(equipmentRes.data);
      setAllSpareParts(spRes.data);
      setLoading(false);
    } catch (err) {
      setError('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  const getEquipmentName = (equipmentId) => {
    const equip = equipment.find(e => e.id === equipmentId);
    return equip ? equip.name : 'Неизвестное оборудование';
  };

  const getSparePartsForEquipment = (equipmentId) => {
    return allSpareParts.filter(sp => (sp.equipmentIds || []).includes(equipmentId));
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    if (filter === 'all') return true;
    return wo.status === filter;
  });

  const startComplete = (wo) => {
    setCompletingId(wo.id);
    const available = getSparePartsForEquipment(wo.equipmentId);
    setSparePartsSelection(available.map(sp => ({ sparePartId: sp.id, name: sp.name, quantity: 0, maxQty: sp.quantity || 0 })));
  };

  const updateSparePartQty = (sparePartId, qty) => {
    setSparePartsSelection(prev =>
      prev.map(sp => sp.sparePartId === sparePartId ? { ...sp, quantity: parseInt(qty) || 0 } : sp)
    );
  };

  const handleStatusChange = async (id, newStatus) => {
    if (newStatus === 'completed') {
      const wo = workOrders.find(w => w.id === id);
      if (wo) {
        startComplete(wo);
        return;
      }
    }
    try {
      await workOrderAPI.update(id, { status: newStatus });
      fetchData();
    } catch (err) {
      setError('Ошибка обновления статуса');
    }
  };

  const confirmComplete = async () => {
    const used = sparePartsSelection.filter(sp => sp.quantity > 0).map(sp => ({
      sparePartId: sp.sparePartId,
      quantity: sp.quantity
    }));
    try {
      await workOrderAPI.update(completingId, { status: 'completed', sparePartsUsed: JSON.stringify(used) });
      setCompletingId(null);
      setSparePartsSelection([]);
      fetchData();
    } catch (err) {
      setError('Ошибка обновления статуса');
    }
  };

  const cancelComplete = () => {
    setCompletingId(null);
    setSparePartsSelection([]);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      try {
        await workOrderAPI.delete(id);
        fetchData();
      } catch (err) {
        setError('Ошибка удаления');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="work-orders">
      <div className="header">
        <h1>Журнал работ</h1>
        <div className="filter-buttons">
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все ({workOrders.length})
          </button>
          <button
            className={`btn ${filter === 'pending' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('pending')}
          >
            В ожидании ({workOrders.filter(wo => wo.status === 'pending').length})
          </button>
          <button
            className={`btn ${filter === 'completed' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Выполнены ({workOrders.filter(wo => wo.status === 'completed').length})
          </button>
        </div>
      </div>

      <div className="work-orders-list">
        {filteredWorkOrders.length === 0 ? (
          <div className="no-results">Записей не найдено</div>
        ) : (
          filteredWorkOrders.map(wo => (
            <div key={wo.id} className={`work-order-card ${wo.status}`}>
              <div className="wo-main">
                <div className="wo-equipment">
                  <Link to={`/equipment/${wo.equipmentId}`}>
                    {getEquipmentName(wo.equipmentId)}
                  </Link>
                </div>
                <div className="wo-task">{wo.taskName}</div>
                <div className="wo-master">{wo.masterName}</div>
                <div className="wo-date">
                  {new Date(wo.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="wo-notes">{wo.notes}</div>

              {wo.sparePartsUsed && wo.sparePartsUsed.length > 0 && (
                <div className="wo-spare-parts-used">
                  <span className="wo-sp-label">Использовано ЗИП:</span>
                  {wo.sparePartsUsed.map((sp, i) => {
                    const spData = allSpareParts.find(s => s.id === sp.sparePartId);
                    return (
                      <span key={i} className="wo-sp-item">
                        {spData ? spData.name : '—'} × {sp.quantity}
                      </span>
                    );
                  })}
                </div>
              )}

              {completingId === wo.id ? (
                <div className="wo-complete-form">
                  <div className="wo-complete-title">Списание ЗИП:</div>
                  {sparePartsSelection.length > 0 ? (
                    <div className="wo-sp-select-list">
                      {sparePartsSelection.map(sp => (
                        <div key={sp.sparePartId} className="wo-sp-select-item">
                          <span className="wo-sp-select-name">{sp.name}</span>
                          <span className="wo-sp-select-stock">на складе: {sp.maxQty}</span>
                          <input
                            type="number"
                            min="0"
                            max={sp.maxQty}
                            value={sp.quantity}
                            onChange={(e) => updateSparePartQty(sp.sparePartId, e.target.value)}
                            className="wo-sp-input"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="wo-no-sp">Нет привязанных запчастей для этого оборудования</p>
                  )}
                  <div className="wo-complete-actions">
                    <button onClick={confirmComplete} className="btn btn-small btn-primary">Подтвердить</button>
                    <button onClick={cancelComplete} className="btn btn-small">Отмена</button>
                  </div>
                </div>
              ) : (
                <div className="wo-actions">
                  {wo.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(wo.id, 'completed')}
                      className="btn btn-small btn-primary"
                    >
                      Выполнено
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(wo.id)}
                    className="btn btn-small btn-danger"
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default WorkOrders;
