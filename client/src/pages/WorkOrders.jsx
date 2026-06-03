/**
 * @module WorkOrders
 * @description Журнал выполненных и запланированных работ. Позволяет отмечать выполнение и списывать ЗИП.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workOrderAPI, equipmentAPI, sparePartsAPI, worksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';

function WorkOrders() {
  /** Состояние журнала работ, оборудования, запчастей, фильтров */
  const [workOrders, setWorkOrders] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [allSpareParts, setAllSpareParts] = useState([]);
  const [allWorks, setAllWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [completingId, setCompletingId] = useState(null);
  const [sparePartsSelection, setSparePartsSelection] = useState([]);

  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка всех данных журнала работ */
  useEffect(() => {
    fetchData();
  }, []);

  /** Параллельная загрузка нарядов, оборудования, запчастей и работ */
  const fetchData = async () => {
    try {
      const [workOrdersRes, equipmentRes, spRes, worksRes] = await Promise.all([
        workOrderAPI.getAll(),
        equipmentAPI.getAll(),
        sparePartsAPI.getAll(),
        worksAPI.getAll()
      ]);
      setWorkOrders(workOrdersRes.data);
      setEquipment(equipmentRes.data);
      setAllSpareParts(spRes.data);
      setAllWorks(worksRes.data);
      setLoading(false);
    } catch (err) {
      setError('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  /** Получение названия оборудования по ID */
  const getEquipmentName = (equipmentId) => {
    const equip = equipment.find(e => e.id === equipmentId);
    return equip ? equip.name : 'Неизвестное оборудование';
  };

  /** Получение доступных ЗИП для конкретной работы и оборудования */
  const getSparePartsForWork = (equipmentId, workId) => {
    const eqSpareParts = allSpareParts.filter(sp => (sp.equipmentIds || []).includes(equipmentId));
    if (!workId) return eqSpareParts;

    return eqSpareParts
      .filter(sp => (sp.workLinks || []).some(wl => wl.workId === workId))
      .map(sp => {
        const wl = sp.workLinks.find(x => x.workId === workId);
        return {
          sparePartId: sp.id,
          name: sp.name,
          unit: sp.unit || 'шт',
          defaultQuantity: wl ? wl.quantity : 0,
          inStock: sp.quantity || 0
        };
      });
  };

  /** Фильтрация нарядов по статусу */
  const filteredWorkOrders = workOrders.filter(wo => {
    if (filter === 'all') return true;
    return wo.status === filter;
  });

  /** Начало процесса завершения наряда: формирование списка ЗИП */
  const startComplete = (wo) => {
    setCompletingId(wo.id);
    const available = getSparePartsForWork(wo.equipmentId, wo.taskId);
    setSparePartsSelection(available.map(sp => ({
      sparePartId: sp.sparePartId || sp.id,
      name: sp.name,
      unit: sp.unit || 'шт',
      quantity: sp.defaultQuantity || 0,
      maxQty: sp.inStock || sp.quantity || 0
    })));
  };

  /** Обновление количества списываемой запчасти */
  const updateSparePartQty = (sparePartId, qty) => {
    setSparePartsSelection(prev =>
      prev.map(sp => sp.sparePartId === sparePartId ? { ...sp, quantity: parseInt(qty) || 0 } : sp)
    );
  };

  /** Изменение статуса наряда (при завершении — открытие формы списания ЗИП) */
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
      toast.error('Ошибка', 'Не удалось обновить статус');
    }
  };

  /** Подтверждение завершения наряда со списанием ЗИП */
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
      toast.error('Ошибка', 'Не удалось обновить статус');
    }
  };

  /** Отмена завершения наряда */
  const cancelComplete = () => {
    setCompletingId(null);
    setSparePartsSelection([]);
  };

  /** Удаление записи журнала работ */
  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удалить запись?', message: 'Запись журнала работ будет удалена.', type: 'danger' });
    if (!confirmed) return;
    try {
      await workOrderAPI.delete(id);
      fetchData();
    } catch (err) {
      toast.error('Ошибка', 'Не удалось удалить запись');
    }
  };

  if (loading) return <SkeletonTable rows={8} cols={6} />;
  if (error) return null;

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
                        {spData ? spData.name : '—'} × {sp.quantity} {spData ? (spData.unit || 'шт') : ''}
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
                          <span className="wo-sp-select-name">{sp.name} ({sp.unit})</span>
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
                    <p className="wo-no-sp">Нет привязанных запчастей для этой работы</p>
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
