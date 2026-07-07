/**
 * @fileoverview Страница управления инцидентами с поддержкой RCA.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Trash2, FileText, Wrench, Plus } from 'lucide-react';
import api, {
  incidentsAPI, equipmentAPI, companyAPI, commonFaultsAPI, causesAPI, employeesAPI,
} from '../services/api';
import { useToast } from '../components/Toast';
import CustomSelect from '../components/CustomSelect';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  MobileDataCards, MobileDataCard, MobileDataCardTitle,
  MobileDataCardRow, MobileDataCardActions,
} from '../components/MobileDataCard';
import ActionsMenu from '../components/ActionsMenu';
import { formatDate, formatDateTime } from '../utils/date';
import UploadImage from '../components/UploadImage';
import { resolveUploadField } from '../utils/uploads';

const STATUS_MAP = {
  new: { label: 'Новый', className: 'status-needs-repair' },
  in_progress: { label: 'В работе', className: 'status-under-repair' },
  investigating: { label: 'Расследование', className: 'status-under-repair' },
  rca_done: { label: 'RCA завершён', className: 'status-working' },
  resolved: { label: 'Решён', className: 'status-working' },
};

const ACTION_STATUS_MAP = {
  planned: 'Запланировано',
  done: 'Выполнено',
  verified: 'Проверено',
};

const EMPTY_WHY = { question: '', answer: '' };

function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRca, setFilterRca] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [adminNotes, setAdminNotes] = useState('');
  const [editCauseId, setEditCauseId] = useState('');
  const [editCommonFaultId, setEditCommonFaultId] = useState('');
  const [rootCauseNotes, setRootCauseNotes] = useState('');
  const [requiresRca, setRequiresRca] = useState(false);
  const [investigatorId, setInvestigatorId] = useState('');
  const [whys, setWhys] = useState([{ ...EMPTY_WHY }]);
  const [detailFaults, setDetailFaults] = useState([]);
  const [actions, setActions] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionDue, setNewActionDue] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [allowInspectionWithoutQr, setAllowInspectionWithoutQr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allEquipment, setAllEquipment] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [newEquipmentId, setNewEquipmentId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPhotos, setNewPhotos] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [commonFaults, setCommonFaults] = useState([]);
  const [newCommonFaultId, setNewCommonFaultId] = useState('');
  const [allCauses, setAllCauses] = useState([]);
  const [newCauseId, setNewCauseId] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const addModalRef = useRef(null);
  const toast = useToast();
  const confirm = useConfirm();

  const fetchIncidents = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterRca === 'true') params.requiresRca = 'true';
      const res = await api.get('/incidents', { params });
      setIncidents(res.data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [filterStatus, filterRca]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await companyAPI.get();
        setAllowInspectionWithoutQr(res.data.allowInspectionWithoutQr);
      } catch { /* ignore */ }
    };
    const fetchAllEquipment = async () => {
      try {
        const res = await equipmentAPI.getAll();
        setAllEquipment(res.data);
      } catch { /* ignore */ }
    };
    const fetchCauses = async () => {
      try {
        const res = await causesAPI.getAll();
        setAllCauses(res.data);
      } catch { /* ignore */ }
    };
    const fetchEmployees = async () => {
      try {
        const res = await employeesAPI.getAll();
        setAllEmployees(res.data);
      } catch { /* ignore */ }
    };
    fetchSettings();
    fetchAllEquipment();
    fetchCauses();
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchFaults = async () => {
      if (!newEquipmentId) {
        setCommonFaults([]);
        setNewCommonFaultId('');
        return;
      }
      try {
        const res = await commonFaultsAPI.getByEquipment(newEquipmentId);
        setCommonFaults(res.data);
        setNewCommonFaultId('');
      } catch { /* ignore */ }
    };
    fetchFaults();
  }, [newEquipmentId]);

  const openIncidentDetail = async (inc) => {
    try {
      const res = await incidentsAPI.getById(inc.id);
      const data = res.data;
      setSelectedIncident(data);
      setDetailTab('info');
      setAdminNotes(data.adminNotes || '');
      setEditCauseId(data.causeId || '');
      setEditCommonFaultId(data.commonFaultId || '');
      setRootCauseNotes(data.rootCauseNotes || '');
      setRequiresRca(Boolean(data.requiresRca));
      setInvestigatorId(data.assignedInvestigatorId || '');
      setWhys(data.whys?.length ? data.whys : [{ ...EMPTY_WHY }]);
      setActions(data.actions || []);
      setWorkOrders(data.workOrders || []);
      if (data.equipmentId) {
        const faultsRes = await commonFaultsAPI.getByEquipment(data.equipmentId);
        setDetailFaults(faultsRes.data);
      } else {
        setDetailFaults([]);
      }
    } catch {
      toast.error('Ошибка', 'Не удалось загрузить инцидент');
    }
  };

  const closeDetail = () => {
    setSelectedIncident(null);
    setNewActionDesc('');
    setNewActionDue('');
    setNewActionAssignee('');
  };

  const saveIncidentFields = async (extra = {}) => {
    if (!selectedIncident) return false;
    setSaving(true);
    try {
      const payload = {
        adminNotes,
        causeId: editCauseId || null,
        commonFaultId: editCommonFaultId || null,
        rootCauseNotes,
        requiresRca,
        assignedInvestigatorId: investigatorId || null,
        whys: whys.filter((w) => w.question || w.answer),
        ...extra,
      };
      const res = await incidentsAPI.update(selectedIncident.id, payload);
      setSelectedIncident((prev) => ({ ...prev, ...res.data }));
      fetchIncidents();
      return true;
    } catch (err) {
      const msg = err.response?.data?.error || 'Не удалось сохранить';
      toast.error('Ошибка', msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status) => {
    const ok = await saveIncidentFields({ status });
    if (ok) {
      toast.success('Статус обновлён');
      closeDetail();
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!selectedIncident) return;
    setSaving(true);
    try {
      const res = await incidentsAPI.createWorkOrder(selectedIncident.id, {});
      toast.success('Наряд создан');
      setWorkOrders((prev) => [res.data, ...prev]);
      fetchIncidents();
    } catch {
      toast.error('Ошибка', 'Не удалось создать наряд');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAction = async () => {
    if (!selectedIncident || !newActionDesc.trim()) {
      toast.error('Ошибка', 'Укажите описание мероприятия');
      return;
    }
    try {
      const res = await incidentsAPI.createAction(selectedIncident.id, {
        description: newActionDesc.trim(),
        dueDate: newActionDue || null,
        assignedEmployeeId: newActionAssignee || null,
      });
      setActions((prev) => [...prev, res.data]);
      setNewActionDesc('');
      setNewActionDue('');
      setNewActionAssignee('');
      toast.success('Мероприятие добавлено');
    } catch {
      toast.error('Ошибка', 'Не удалось добавить мероприятие');
    }
  };

  const handleActionStatus = async (actionId, status) => {
    try {
      const res = await incidentsAPI.updateAction(selectedIncident.id, actionId, { status });
      setActions((prev) => prev.map((a) => (a.id === actionId ? res.data : a)));
    } catch {
      toast.error('Ошибка', 'Не удалось обновить мероприятие');
    }
  };

  const handleDeleteAction = async (actionId) => {
    const confirmed = await confirm({ title: 'Удалить мероприятие?', message: '', type: 'danger' });
    if (!confirmed) return;
    try {
      await incidentsAPI.deleteAction(selectedIncident.id, actionId);
      setActions((prev) => prev.filter((a) => a.id !== actionId));
    } catch {
      toast.error('Ошибка', 'Не удалось удалить');
    }
  };

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (newPhotos.length + files.length > 5) {
      toast.error('Максимум 5 фотографий');
      return;
    }
    setNewPhotos((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setNewPreviews((prev) => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSubmit = async () => {
    if (!newEquipmentId) {
      toast.error('Ошибка', 'Выберите оборудование');
      return;
    }
    if (!newDescription.trim()) {
      toast.error('Ошибка', 'Опишите проблему');
      return;
    }
    setAddSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('equipmentId', newEquipmentId);
      if (newCommonFaultId) formData.append('commonFaultId', newCommonFaultId);
      if (newCauseId) formData.append('causeId', newCauseId);
      formData.append('description', newDescription);
      newPhotos.forEach((photo) => formData.append('photos', photo));
      await incidentsAPI.create(formData);
      toast.success('Инцидент создан');
      setShowAddModal(false);
      setNewEquipmentId('');
      setNewDescription('');
      setNewPhotos([]);
      setNewPreviews([]);
      setNewCommonFaultId('');
      setCommonFaults([]);
      setNewCauseId('');
      fetchIncidents();
    } catch {
      toast.error('Ошибка', 'Не удалось создать инцидент');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удалить инцидент?', message: 'Инцидент будет удалён навсегда.', type: 'danger' });
    if (!confirmed) return;
    try {
      await api.delete(`/incidents/${id}`);
      fetchIncidents();
    } catch {
      toast.error('Ошибка', 'Не удалось удалить инцидент');
    }
  };

  const employeeOptions = allEmployees.map((e) => ({
    value: e.id,
    label: `${e.lastName} ${e.firstName}`,
  }));

  if (loading) return <SkeletonTable rows={6} cols={8} />;

  const openAddModal = () => setShowAddModal(true);
  const isResolved = selectedIncident?.status === 'resolved';

  return (
    <div className="directory-page">
      <PageHeader icon={AlertTriangle} title="Инциденты (поломки)">
        {allowInspectionWithoutQr && (
          <button onClick={openAddModal} className="btn btn-primary">
            + Добавить инцидент
          </button>
        )}
      </PageHeader>

      <div className="filters-panel">
        <div className="filter-row">
          <CustomSelect value={filterStatus} onChange={setFilterStatus} placeholder="Все статусы" options={[
            { value: '', label: 'Все статусы' },
            { value: 'new', label: 'Новые' },
            { value: 'in_progress', label: 'В работе' },
            { value: 'investigating', label: 'Расследование' },
            { value: 'rca_done', label: 'RCA завершён' },
            { value: 'resolved', label: 'Решённые' },
          ]} />
          <CustomSelect value={filterRca} onChange={setFilterRca} placeholder="RCA" options={[
            { value: '', label: 'Все инциденты' },
            { value: 'true', label: 'Требует RCA' },
          ]} />
          <span className="filter-summary">Найдено: <strong>{incidents.length}</strong></span>
        </div>
      </div>

      {incidents.length === 0 && !filterStatus && !filterRca ? (
        <EmptyState
          icon={AlertTriangle}
          title="Инцидентов пока нет"
          description="Здесь будут отображаться сообщения о поломках и неисправностях оборудования."
          actionLabel={allowInspectionWithoutQr ? 'Добавить инцидент' : undefined}
          onAction={allowInspectionWithoutQr ? openAddModal : undefined}
        />
      ) : (
        <>
          <div className="table-container desktop-table-only">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Оборудование</th>
                    <th>Неисправность</th>
                    <th>Причина</th>
                    <th>Статус</th>
                    <th>RCA</th>
                    <th>Фото</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr><td colSpan="8" className="no-results-cell">Инцидентов не найдено</td></tr>
                  ) : (
                    incidents.map((inc) => {
                      const st = STATUS_MAP[inc.status] || STATUS_MAP.new;
                      return (
                        <tr key={inc.id}>
                          <td>{formatDate(inc.createdAt)}</td>
                          <td>
                            <Link to={`/equipment/${inc.equipmentId}`} className="table-link">
                              {inc.equipmentName || '—'}
                            </Link>
                            <div className="td-muted">{inc.inventoryNumber}</div>
                          </td>
                          <td className="td-muted">{inc.commonFaultName || '—'}</td>
                          <td className="td-muted">{inc.causeName || '—'}</td>
                          <td><span className={`status-badge ${st.className}`}>{st.label}</span></td>
                          <td>{inc.requiresRca ? <span className="overdue-badge new">RCA</span> : '—'}</td>
                          <td>{inc.photos?.length || 0}</td>
                          <td>
                            <ActionsMenu items={[
                              { icon: <FileText size={14} />, label: 'Подробнее', onClick: () => openIncidentDetail(inc) },
                              { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(inc.id), danger: true },
                            ]} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <MobileDataCards empty={incidents.length === 0} emptyMessage="Инцидентов не найдено">
            {incidents.map((inc) => {
              const st = STATUS_MAP[inc.status] || STATUS_MAP.new;
              return (
                <MobileDataCard key={inc.id}>
                  <MobileDataCardTitle>
                    <Link to={`/equipment/${inc.equipmentId}`} className="table-link">
                      {inc.equipmentName || '—'}
                    </Link>
                  </MobileDataCardTitle>
                  <MobileDataCardRow label="Дата">{formatDate(inc.createdAt)}</MobileDataCardRow>
                  <MobileDataCardRow label="Неисправность">{inc.commonFaultName || '—'}</MobileDataCardRow>
                  <MobileDataCardRow label="Причина">{inc.causeName || '—'}</MobileDataCardRow>
                  <MobileDataCardRow label="Статус">
                    <span className={`status-badge ${st.className}`}>{st.label}</span>
                  </MobileDataCardRow>
                  <MobileDataCardActions>
                    <ActionsMenu items={[
                      { icon: <FileText size={14} />, label: 'Подробнее', onClick: () => openIncidentDetail(inc) },
                      { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(inc.id), danger: true },
                    ]} />
                  </MobileDataCardActions>
                </MobileDataCard>
              );
            })}
          </MobileDataCards>
        </>
      )}

      {selectedIncident && (
        <div className="complete-task-modal" onClick={closeDetail}>
          <div className="modal-content incident-modal incident-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="incident-modal-header">
              <h3>Инцидент</h3>
              <span className={`status-badge ${(STATUS_MAP[selectedIncident.status] || STATUS_MAP.new).className}`}>
                {(STATUS_MAP[selectedIncident.status] || STATUS_MAP.new).label}
              </span>
            </div>

            <div className="incident-detail-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={detailTab === 'info'}
                className={`incident-tab ${detailTab === 'info' ? 'active' : ''}`}
                onClick={() => setDetailTab('info')}
              >
                Общее
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={detailTab === 'rca'}
                className={`incident-tab ${detailTab === 'rca' ? 'active' : ''}`}
                onClick={() => setDetailTab('rca')}
              >
                Расследование (RCA)
              </button>
            </div>

            <div className="incident-modal-body">
              {detailTab === 'info' && (
                <div className="incident-detail">
                  <dl className="incident-meta-grid">
                    <div className="incident-meta-row">
                      <dt>Оборудование</dt>
                      <dd>{selectedIncident.equipmentName || '—'} ({selectedIncident.inventoryNumber || '—'})</dd>
                    </div>
                    <div className="incident-meta-row">
                      <dt>Дата</dt>
                      <dd>{selectedIncident.createdAt ? formatDateTime(selectedIncident.createdAt) : 'Не указана'}</dd>
                    </div>
                    <div className="incident-meta-row">
                      <dt>Сотрудник</dt>
                      <dd>{selectedIncident.employeeName?.trim() || 'Не указан'}</dd>
                    </div>
                    <div className="incident-meta-row incident-meta-row--full">
                      <dt>Проблема</dt>
                      <dd>{selectedIncident.description || '—'}</dd>
                    </div>
                  </dl>

                  {!isResolved && (
                    <div className="incident-form-section">
                      <div className="form-group">
                        <label>Типовая неисправность</label>
                        {detailFaults.length > 0 ? (
                          <CustomSelect
                            value={editCommonFaultId}
                            onChange={setEditCommonFaultId}
                            placeholder="Не выбрано"
                            options={detailFaults.map((f) => ({ value: f.id, label: f.name }))}
                          />
                        ) : (
                          <p className="incident-field-placeholder">Нет записей в справочнике для этого оборудования</p>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Причина возникновения <span className="label-hint">(обязательна при закрытии)</span></label>
                        <CustomSelect
                          value={editCauseId}
                          onChange={setEditCauseId}
                          placeholder="Выберите причину"
                          options={allCauses.map((c) => ({ value: c.id, label: c.name }))}
                        />
                      </div>
                      <label className="incident-rca-checkbox">
                        <input type="checkbox" checked={requiresRca} onChange={(e) => setRequiresRca(e.target.checked)} />
                        <span>Требует RCA-расследования</span>
                      </label>
                    </div>
                  )}

                  {isResolved && (
                    <dl className="incident-meta-grid incident-meta-grid--compact">
                      <div className="incident-meta-row">
                        <dt>Неисправность</dt>
                        <dd>{selectedIncident.commonFaultName || '—'}</dd>
                      </div>
                      <div className="incident-meta-row">
                        <dt>Причина</dt>
                        <dd>{selectedIncident.causeName || '—'}</dd>
                      </div>
                      {selectedIncident.resolvedAt && (
                        <div className="incident-meta-row">
                          <dt>Закрыт</dt>
                          <dd>{formatDateTime(selectedIncident.resolvedAt)}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {selectedIncident.photos?.length > 0 && (
                    <div className="incident-photos">
                      <div className="incident-section-label">Фото</div>
                      <div className="incident-photo-grid">
                        {selectedIncident.photos.map((photo, idx) => (
                          <a key={idx} href={selectedIncident.photoUrls?.[idx] || resolveUploadField({ photo }, 'photo')} target="_blank" rel="noopener noreferrer">
                            <UploadImage src={selectedIncident.photoUrls?.[idx]} item={{ photo }} field="photo" alt="" className="incident-thumb" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group incident-notes-group">
                    <label>Заметка администратора</label>
                    <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" placeholder="Комментарий..." disabled={isResolved} />
                  </div>

                  {workOrders.length > 0 && (
                    <div className="incident-linked-orders">
                      <div className="incident-section-label">Связанные наряды</div>
                      <ul>
                        {workOrders.map((wo) => (
                          <li key={wo.id}>
                            <Link to="/work-orders">{wo.taskName || 'Наряд'}</Link>
                            <span className="td-muted"> ({wo.status})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'rca' && (
                <div className="incident-detail">
                  <div className="form-group">
                    <label>Ответственный за расследование</label>
                    <CustomSelect
                      value={investigatorId}
                      onChange={setInvestigatorId}
                      placeholder="Не назначен"
                      options={employeeOptions}
                      disabled={isResolved}
                    />
                  </div>

                  <div className="form-group">
                    <label>Коренная причина</label>
                    <textarea
                      value={rootCauseNotes}
                      onChange={(e) => setRootCauseNotes(e.target.value)}
                      rows="3"
                      placeholder="Опишите коренную причину..."
                      disabled={isResolved}
                    />
                  </div>

                  <div className="form-group">
                    <label>5 почему</label>
                    <div className="why-list">
                      {whys.map((why, idx) => (
                        <div key={idx} className="why-row">
                          <input
                            type="text"
                            value={why.question}
                            onChange={(e) => {
                              const next = [...whys];
                              next[idx] = { ...next[idx], question: e.target.value };
                              setWhys(next);
                            }}
                            placeholder={`Почему ${idx + 1}?`}
                            disabled={isResolved}
                          />
                          <input
                            type="text"
                            value={why.answer}
                            onChange={(e) => {
                              const next = [...whys];
                              next[idx] = { ...next[idx], answer: e.target.value };
                              setWhys(next);
                            }}
                            placeholder="Ответ"
                            disabled={isResolved}
                          />
                        </div>
                      ))}
                    </div>
                    {!isResolved && whys.length < 5 && (
                      <button type="button" className="btn btn-small btn-secondary why-add-btn" onClick={() => setWhys([...whys, { ...EMPTY_WHY }])}>
                        <Plus size={12} /> Добавить «почему»
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Корректирующие мероприятия</label>
                    {actions.length === 0 && <p className="incident-field-placeholder">Мероприятий пока нет</p>}
                    {actions.length > 0 && (
                      <ul className="incident-actions-list">
                        {actions.map((action) => (
                          <li key={action.id} className="incident-action-item">
                            <div className="incident-action-text">
                              <strong>{action.description}</strong>
                              {action.dueDate && <span className="td-muted"> — до {formatDate(action.dueDate)}</span>}
                              {action.assignedEmployeeName && <span className="td-muted"> ({action.assignedEmployeeName})</span>}
                            </div>
                            <div className="incident-action-controls">
                              <span className="action-status-pill">{ACTION_STATUS_MAP[action.status] || action.status}</span>
                              {!isResolved && action.status === 'planned' && (
                                <button type="button" className="btn btn-small" onClick={() => handleActionStatus(action.id, 'done')}>Выполнено</button>
                              )}
                              {!isResolved && (
                                <button type="button" className="btn btn-small btn-danger" onClick={() => handleDeleteAction(action.id)} aria-label="Удалить">✕</button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!isResolved && (
                      <div className="incident-new-action">
                        <input type="text" value={newActionDesc} onChange={(e) => setNewActionDesc(e.target.value)} placeholder="Описание мероприятия" />
                        <input type="date" value={newActionDue} onChange={(e) => setNewActionDue(e.target.value)} />
                        <CustomSelect
                          value={newActionAssignee}
                          onChange={setNewActionAssignee}
                          placeholder="Ответственный"
                          options={employeeOptions}
                        />
                        <button type="button" className="btn btn-small btn-secondary" onClick={handleAddAction}>Добавить</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="incident-modal-footer">
              {!isResolved && detailTab === 'info' && (
                <>
                  <div className="incident-footer-group">
                    <button type="button" onClick={() => saveIncidentFields()} className="btn btn-secondary btn-small" disabled={saving}>
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                    <button type="button" onClick={handleCreateWorkOrder} className="btn btn-secondary btn-small" disabled={saving}>
                      <Wrench size={14} /> Создать наряд
                    </button>
                  </div>
                  <div className="incident-footer-group">
                    {selectedIncident.status === 'new' && (
                      <button type="button" onClick={() => updateStatus('in_progress')} className="btn btn-secondary btn-small" disabled={saving}>В работу</button>
                    )}
                    {requiresRca && !['investigating', 'rca_done', 'resolved'].includes(selectedIncident.status) && (
                      <button type="button" onClick={() => updateStatus('investigating')} className="btn btn-secondary btn-small" disabled={saving}>Начать RCA</button>
                    )}
                    {requiresRca && selectedIncident.status === 'investigating' && (
                      <button type="button" onClick={() => updateStatus('rca_done')} className="btn btn-secondary btn-small" disabled={saving}>RCA завершён</button>
                    )}
                    <button type="button" onClick={() => updateStatus('resolved')} className="btn btn-primary btn-small" disabled={saving}>Решено</button>
                    <button type="button" onClick={closeDetail} className="btn btn-small">Закрыть</button>
                  </div>
                </>
              )}
              {!isResolved && detailTab === 'rca' && (
                <>
                  <div className="incident-footer-group" />
                  <div className="incident-footer-group">
                    <button type="button" onClick={() => saveIncidentFields()} className="btn btn-secondary btn-small" disabled={saving}>
                      {saving ? 'Сохранение...' : 'Сохранить RCA'}
                    </button>
                    <button type="button" onClick={closeDetail} className="btn btn-small">Закрыть</button>
                  </div>
                </>
              )}
              {isResolved && (
                <div className="incident-footer-group incident-footer-group--end">
                  <button type="button" onClick={closeDetail} className="btn btn-small">Закрыть</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div ref={addModalRef} className="complete-task-modal" onClick={(e) => { if (e.target === addModalRef.current) setShowAddModal(false); }}>
          <div className="modal-content">
            <h3>Новый инцидент</h3>
            <div className="form-group">
              <label>Оборудование *</label>
              <CustomSelect
                value={newEquipmentId}
                onChange={setNewEquipmentId}
                placeholder="Выберите оборудование"
                options={allEquipment.map((e) => ({ value: e.id, label: `${e.name} (${e.inventoryNumber || '—'})` }))}
              />
            </div>
            {commonFaults.length > 0 && (
              <div className="form-group">
                <label>Типовая неисправность</label>
                <CustomSelect
                  value={newCommonFaultId}
                  onChange={(v) => {
                    setNewCommonFaultId(v);
                    const fault = commonFaults.find((f) => f.id === v);
                    if (fault) setNewDescription(fault.name);
                  }}
                  placeholder="Выберите из справочника (необязательно)"
                  options={commonFaults.map((f) => ({ value: f.id, label: f.name }))}
                />
              </div>
            )}
            {allCauses.length > 0 && (
              <div className="form-group">
                <label>Причина возникновения</label>
                <CustomSelect
                  value={newCauseId}
                  onChange={setNewCauseId}
                  placeholder="Выберите причину (необязательно)"
                  options={allCauses.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
            )}
            <div className="form-group">
              <label>Описание проблемы *</label>
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Опишите что произошло..." rows="4" />
            </div>
            <div className="form-group">
              <label>Фотографии ({newPhotos.length}/5)</label>
              <div className="photo-upload-area">
                <div className="photo-previews">
                  {newPreviews.map((src, idx) => (
                    <div key={idx} className="photo-preview-item">
                      <img src={src} alt="" />
                      <button type="button" onClick={() => removePhoto(idx)} className="photo-remove">✕</button>
                    </div>
                  ))}
                </div>
                {newPhotos.length < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary photo-add-btn">
                    📷 Добавить фото
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} />
              </div>
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
    </div>
  );
}

export default IncidentsPage;
