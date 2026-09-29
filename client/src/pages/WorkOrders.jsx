/**
 * @module WorkOrders
 * @description Журнал выполненных и запланированных работ. Позволяет отмечать выполнение и списывать ЗИП.
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle, ListChecks, Trash2 } from 'lucide-react';
import { ChecklistSteps, checklistProgress } from '../components/WorkChecklist';
import { workOrderAPI, equipmentAPI, sparePartsAPI, worksAPI, companyAPI, causesAPI, overdueReasonsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import ActionsMenu from '../components/ActionsMenu';
import { formatDate } from '../utils/date';

function WorkOrders() {
  /** Состояние журнала работ, оборудования, запчастей, фильтров */
  const [workOrders, setWorkOrders] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [allSpareParts, setAllSpareParts] = useState([]);
  const [allWorks, setAllWorks] = useState([]);
  const [allCauses, setAllCauses] = useState([]);
  const [allOverdueReasons, setAllOverdueReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [completingId, setCompletingId] = useState(null);
  const [sparePartsSelection, setSparePartsSelection] = useState([]);
  const [allowInspectionWithoutQr, setAllowInspectionWithoutQr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipmentId, setNewEquipmentId] = useState('');
  const [newWorkId, setNewWorkId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newStatus, setNewStatus] = useState('pending');
  const [newCauseId, setNewCauseId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [acceptModalWo, setAcceptModalWo] = useState(null);
  const [acceptOverdueReasonId, setAcceptOverdueReasonId] = useState('');
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [completeChecklist, setCompleteChecklist] = useState([]);
  const [addChecklist, setAddChecklist] = useState([]);
  const [checklistOrder, setChecklistOrder] = useState(null);
  const [checklistDraft, setChecklistDraft] = useState([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const addModalRef = useRef(null);
  const acceptModalRef = useRef(null);

  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка всех данных журнала работ */
  useEffect(() => {
    fetchData();
  }, []);

  /** Загрузка настройки компании */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await companyAPI.get();
        setAllowInspectionWithoutQr(res.data.allowInspectionWithoutQr);
      } catch {}
    };
    fetchSettings();
  }, []);

  /** Параллельная загрузка нарядов, оборудования, запчастей и работ */
  const fetchData = async () => {
    try {
      const [workOrdersRes, equipmentRes, spRes, worksRes, causesRes, overdueRes] = await Promise.all([
        workOrderAPI.getAll(),
        equipmentAPI.getAll(),
        sparePartsAPI.getAll(),
        worksAPI.getAll(),
        causesAPI.getAll(),
        overdueReasonsAPI.getAll()
      ]);
      setWorkOrders(workOrdersRes.data);
      setEquipment(equipmentRes.data);
      setAllSpareParts(spRes.data);
      setAllWorks(worksRes.data);
      setAllCauses(causesRes.data);
      setAllOverdueReasons(overdueRes.data);
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
    const available = getSparePartsForWork(wo.equipmentId, wo.taskId);
    const selection = available.map(sp => ({
      sparePartId: sp.sparePartId || sp.id,
      name: sp.name,
      unit: sp.unit || 'шт',
      quantity: sp.defaultQuantity || 0,
      maxQty: sp.inStock || sp.quantity || 0
    }));
    window.requestAnimationFrame(() => {
      setCompletingId(wo.id);
      setSparePartsSelection(selection);
      setCompleteChecklist((wo.checklist || []).map((step) => ({ ...step })));
    });
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
    if (completeChecklist.some((step) => !step.done)) {
      toast.error('Ошибка', 'Отметьте все шаги чек-листа');
      return;
    }
    const used = sparePartsSelection.filter(sp => sp.quantity > 0).map(sp => ({
      sparePartId: sp.sparePartId,
      quantity: sp.quantity
    }));
    try {
      await workOrderAPI.update(completingId, {
        status: 'completed',
        sparePartsUsed: JSON.stringify(used),
        ...(completeChecklist.length ? { checklist: completeChecklist } : {}),
      });
      setCompletingId(null);
      setSparePartsSelection([]);
      setCompleteChecklist([]);
      fetchData();
    } catch (err) {
      toast.error('Ошибка', err?.response?.data?.error || 'Не удалось обновить статус');
    }
  };

  /** Отмена завершения наряда */
  const cancelComplete = () => {
    setCompletingId(null);
    setSparePartsSelection([]);
    setCompleteChecklist([]);
  };

  const toggleDraftStep = (index) => {
    setChecklistDraft((prev) => prev.map((step, stepIndex) => (
      stepIndex === index ? { ...step, done: !step.done } : step
    )));
  };

  const openChecklist = (wo) => {
    setChecklistOrder(wo);
    setChecklistDraft((wo.checklist || []).map((step) => ({ ...step })));
  };

  const saveChecklist = async () => {
    if (!checklistOrder) return;
    setChecklistSaving(true);
    try {
      await workOrderAPI.update(checklistOrder.id, { checklist: checklistDraft });
      setChecklistOrder(null);
      setChecklistDraft([]);
      fetchData();
    } catch (err) {
      toast.error('Ошибка', err?.response?.data?.error || 'Не удалось сохранить чек-лист');
    } finally {
      setChecklistSaving(false);
    }
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

  /** Определение просроченности работы */
  const isWoOverdue = (wo) => {
    if (!wo.dueDate || wo.status !== 'completed' || wo.acceptedBy) return false;
    const completedAt = wo.completedAt || wo.createdAt;
    if (!completedAt) return false;
    return new Date(completedAt) > new Date(wo.dueDate);
  };

  const workOrderDate = (wo) => formatDate(wo.completedAt || wo.createdAt);

  /** Принятие выполненной работы руководителем */
  const handleAccept = async (wo) => {
    if (isWoOverdue(wo)) {
      setAcceptModalWo(wo);
      setAcceptOverdueReasonId('');
      return;
    }
    const ok = await confirm({ title: 'Принять работу?', message: 'Подтвердить принятие выполненной работы руководителем.', type: 'warning', confirmText: 'Принять' });
    if (!ok) return;
    try {
      await workOrderAPI.accept(wo.id);
      toast.success('Работа принята руководителем');
      fetchData();
    } catch (err) {
      toast.error('Ошибка', 'Не удалось принять работу');
    }
  };

  /** Подтверждение принятия из модалки (с причиной просрочки если нужно) */
  const confirmAccept = async () => {
    if (!acceptModalWo) return;
    setAcceptSubmitting(true);
    try {
      await workOrderAPI.accept(acceptModalWo.id, acceptOverdueReasonId || undefined);
      toast.success('Работа принята руководителем');
      setAcceptModalWo(null);
      setAcceptOverdueReasonId('');
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Не удалось принять работу';
      toast.error('Ошибка', msg);
    } finally {
      setAcceptSubmitting(false);
    }
  };

  /** Создание новой записи журнала работ вручную */
  const handleAddSubmit = async () => {
    if (!newEquipmentId) {
      toast.error('Ошибка', 'Выберите оборудование');
      return;
    }
    if (!newWorkId) {
      toast.error('Ошибка', 'Выберите работу');
      return;
    }
    const work = allWorks.find(w => w.id === newWorkId);
    if (newStatus === 'completed' && addChecklist.some((step) => !step.done)) {
      toast.error('Ошибка', 'Отметьте все шаги чек-листа');
      return;
    }
    setAddSubmitting(true);
    try {
      const payload = {
        equipmentId: newEquipmentId,
        taskId: newWorkId,
        taskName: work ? work.name : '',
        status: newStatus,
        causeId: newCauseId || undefined,
        dueDate: newDueDate || undefined,
        ...(newStatus === 'completed' && addChecklist.length ? { checklist: addChecklist } : {}),
      };
      if (newDate && newStatus === 'completed') {
        payload.completedAt = newDate;
      }
      await workOrderAPI.create(payload);
      toast.success('Запись создана');
      setShowAddModal(false);
      setNewEquipmentId('');
      setNewWorkId('');
      setNewDate('');
      setNewStatus('pending');
      setNewCauseId('');
      setNewDueDate('');
      setAddChecklist([]);
      fetchData();
    } catch (err) {
      toast.error('Ошибка', 'Не удалось создать запись');
    } finally {
      setAddSubmitting(false);
    }
  };

  if (loading) return <SkeletonTable rows={8} cols={6} />;
  if (error) return null;

  return (
    <div className="work-orders">
      <div className="header">
        <h1><ClipboardList size={24} />Журнал работ</h1>
        <div className="header-actions">
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
          {allowInspectionWithoutQr && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              + Добавить запись
            </button>
          )}
        </div>
      </div>

      <div className="table-container desktop-table-only">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Оборудование</th>
                <th>Работа</th>
                <th>Приоритет</th>
                <th>Статус</th>
                <th>Причина</th>
                <th>Срок</th>
                <th>Принято</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkOrders.length === 0 ? (
                <tr><td colSpan="9" className="no-results-cell">Записей не найдено</td></tr>
              ) : (
                filteredWorkOrders.map(wo => (
                  <tr key={wo.id} className={`wo-row-${wo.status}`}>
                    <td>{workOrderDate(wo)}</td>
                    <td>
                      <Link to={`/equipment/${wo.equipmentId}`} className="table-link">
                        {getEquipmentName(wo.equipmentId)}
                      </Link>
                    </td>
                    <td>
                      {wo.taskName}
                      {checklistProgress(wo.checklist) && (
                        <span className="wo-checklist-progress">{checklistProgress(wo.checklist)}</span>
                      )}
                    </td>
                    <td><span className={`priority-badge priority-${(wo.priority || 'B').toLowerCase()}`}>{wo.priority || 'B'}</span></td>
                    <td>
                      <span className={`status-badge ${wo.status === 'completed' ? 'status-working' : 'status-needs-repair'}`}>
                        {wo.status === 'completed' ? 'Выполнена' : 'В ожидании'}
                      </span>
                      {isWoOverdue(wo) && !wo.acceptedBy && (
                        <span className="status-badge status-needs-repair" style={{ marginLeft: 4 }}>Просрочено</span>
                      )}
                    </td>
                    <td className="td-muted">{wo.causeName || '—'}</td>
                    <td>{formatDate(wo.dueDate)}</td>
                    <td>
                      {wo.acceptedByName ? (
                        <span className="status-badge status-working" title={wo.acceptedAt ? `Принято: ${formatDate(wo.acceptedAt)}` : ''}>
                          {wo.acceptedByName}
                        </span>
                      ) : wo.status === 'completed' ? (
                        <span className="status-badge status-needs-repair">Ожидает</span>
                      ) : '—'}
                    </td>
                    <td>
                      <ActionsMenu items={[
                        ...(wo.checklist?.length && wo.status === 'pending' ? [{ icon: <ListChecks size={14} />, label: 'Чек-лист', onClick: () => openChecklist(wo) }] : []),
                        ...(wo.status === 'pending' ? [{ icon: <CheckCircle size={14} />, label: 'Выполнено', onClick: () => handleStatusChange(wo.id, 'completed') }] : []),
                        ...(wo.status === 'completed' && !wo.acceptedBy ? [{ icon: <CheckCircle size={14} />, label: 'Принять', onClick: () => handleAccept(wo) }] : []),
                        { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(wo.id), danger: true },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mobile-data-cards">
        {filteredWorkOrders.length === 0 ? (
          <div className="no-results">Записей не найдено</div>
        ) : (
          filteredWorkOrders.map((wo) => (
            <div key={wo.id} className={`mobile-data-card wo-row-${wo.status}`}>
              <div className="mobile-data-card-title">
                <Link to={`/equipment/${wo.equipmentId}`} className="table-link">
                  {getEquipmentName(wo.equipmentId)}
                </Link>
              </div>
              <div className="mobile-data-card-row">
                <span className="mobile-data-card-label">Работа</span>
                <span>
                  {wo.taskName}
                  {checklistProgress(wo.checklist) && (
                    <span className="wo-checklist-progress">{checklistProgress(wo.checklist)}</span>
                  )}
                </span>
              </div>
              <div className="mobile-data-card-row">
                <span className="mobile-data-card-label">Дата</span>
                <span>{workOrderDate(wo)}</span>
              </div>
              <div className="mobile-data-card-row">
                <span className="mobile-data-card-label">Статус</span>
                <span className={`status-badge ${wo.status === 'completed' ? 'status-working' : 'status-needs-repair'}`}>
                  {wo.status === 'completed' ? 'Выполнена' : 'В ожидании'}
                </span>
              </div>
              <div className="mobile-data-card-actions">
                <ActionsMenu items={[
                  ...(wo.checklist?.length && wo.status === 'pending' ? [{ icon: <ListChecks size={14} />, label: 'Чек-лист', onClick: () => openChecklist(wo) }] : []),
                  ...(wo.status === 'pending' ? [{ icon: <CheckCircle size={14} />, label: 'Выполнено', onClick: () => handleStatusChange(wo.id, 'completed') }] : []),
                  ...(wo.status === 'completed' && !wo.acceptedBy ? [{ icon: <CheckCircle size={14} />, label: 'Принять', onClick: () => handleAccept(wo) }] : []),
                  { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(wo.id), danger: true },
                ]} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно создания записи журнала работ вручную */}
      {showAddModal && (
        <div ref={addModalRef} className="complete-task-modal" onClick={(e) => { if (e.target === addModalRef.current) setShowAddModal(false); }}>
          <div className="modal-content">
            <h3>Новая запись журнала</h3>
            <div className="form-group">
              <label>Оборудование *</label>
              <CustomSelect
                value={newEquipmentId}
                onChange={setNewEquipmentId}
                placeholder="Выберите оборудование"
                options={equipment.map(e => ({ value: e.id, label: `${e.name} (${e.inventoryNumber || '—'})` }))}
              />
            </div>
            <div className="form-group">
              <label>Работа *</label>
              <CustomSelect
                value={newWorkId}
                onChange={(workId) => {
                  setNewWorkId(workId);
                  const selected = allWorks.find((work) => work.id === workId);
                  setAddChecklist((selected?.checklist || []).map((text) => ({ text, done: false })));
                }}
                placeholder="Выберите работу"
                options={allWorks.map(w => ({ value: w.id, label: w.name }))}
              />
            </div>
            <div className="form-group">
              <label>Причина возникновения</label>
              <CustomSelect
                value={newCauseId}
                onChange={setNewCauseId}
                placeholder="Выберите причину (необязательно)"
                options={allCauses.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div className="form-group">
              <label>Статус</label>
              <CustomSelect
                value={newStatus}
                onChange={setNewStatus}
                placeholder="Выберите статус"
                options={[
                  { value: 'pending', label: 'В ожидании' },
                  { value: 'completed', label: 'Выполнена' },
                ]}
              />
            </div>
            {newStatus === 'completed' && addChecklist.length > 0 && (
              <div className="form-group">
                <label>Чек-лист</label>
                <ChecklistSteps
                  steps={addChecklist}
                  onToggle={(index) => setAddChecklist((prev) => prev.map((step, stepIndex) => (
                    stepIndex === index ? { ...step, done: !step.done } : step
                  )))}
                />
              </div>
            )}
            {newStatus === 'completed' && (
              <div className="form-group">
                <label>Дата выполнения</label>
                <CustomDatePicker value={newDate} onChange={setNewDate} placeholder="Выберите дату" />
              </div>
            )}
            <div className="form-group">
              <label>Срок устранения</label>
              <CustomDatePicker value={newDueDate} onChange={setNewDueDate} placeholder="Выберите срок" />
            </div>
            <div className="modal-actions">
              <button onClick={handleAddSubmit} className="btn btn-primary" disabled={addSubmitting}>
                {addSubmitting ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка списания ЗИП при выполнении работы */}
      {completingId && (
        <div
          className="complete-task-modal"
          onClick={(e) => { if (e.target === e.currentTarget) cancelComplete(); }}
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Списание ЗИП</h3>
            {completeChecklist.length > 0 && (
              <>
                <div className="wo-complete-title">Чек-лист</div>
                <ChecklistSteps
                  steps={completeChecklist}
                  onToggle={(index) => setCompleteChecklist((prev) => prev.map((step, stepIndex) => (
                    stepIndex === index ? { ...step, done: !step.done } : step
                  )))}
                />
              </>
            )}
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
            <div className="modal-actions">
              <button onClick={confirmComplete} className="btn btn-primary">Подтвердить выполнение</button>
              <button onClick={cancelComplete} className="btn">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка принятия работы руководителем (с причиной просрочки) */}
      {checklistOrder && (
        <div className="complete-task-modal" onClick={(e) => { if (e.target === e.currentTarget) setChecklistOrder(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Чек-лист</h3>
            <p><strong>{checklistOrder.taskName}</strong></p>
            <ChecklistSteps steps={checklistDraft} onToggle={toggleDraftStep} />
            <div className="modal-actions">
              <button onClick={saveChecklist} className="btn btn-primary" disabled={checklistSaving}>
                {checklistSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={() => setChecklistOrder(null)} className="btn">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {acceptModalWo && (
        <div ref={acceptModalRef} className="complete-task-modal" onClick={(e) => { if (e.target === acceptModalRef.current) setAcceptModalWo(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Подтверждение работы</h3>
            <p><strong>Работа:</strong> {acceptModalWo.taskName}</p>
            <ChecklistSteps steps={acceptModalWo.checklist} readOnly />
            {acceptModalWo.dueDate && (
              <p><strong>Срок устранения:</strong> {formatDate(acceptModalWo.dueDate)}</p>
            )}
            <p style={{ color: '#991b1b', fontWeight: 600 }}>
              Работа выполнена с нарушением срока. Необходимо указать причину просрочки.
            </p>
            <div className="form-group">
              <label>Причина просрочки *</label>
              <CustomSelect
                value={acceptOverdueReasonId}
                onChange={setAcceptOverdueReasonId}
                placeholder="Выберите причину просрочки"
                options={allOverdueReasons.map(r => ({ value: r.id, label: r.name }))}
              />
            </div>
            <div className="modal-actions">
              <button onClick={confirmAccept} className="btn btn-primary" disabled={!acceptOverdueReasonId || acceptSubmitting}>
                {acceptSubmitting ? 'Сохранение...' : 'Принять работу'}
              </button>
              <button onClick={() => setAcceptModalWo(null)} className="btn">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkOrders;
