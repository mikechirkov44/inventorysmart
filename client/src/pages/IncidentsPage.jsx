/**
 * @fileoverview Страница управления инцидентами (поломками).
 * Отображает список инцидентов с фильтрацией по статусу,
 * позволяет обновлять статус, добавлять заметки и удалять инциденты.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Trash2, FileText } from 'lucide-react';
import api, { incidentsAPI, equipmentAPI, companyAPI, commonFaultsAPI, causesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import CustomSelect from '../components/CustomSelect';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonTable } from '../components/Skeleton';
import ActionsMenu from '../components/ActionsMenu';

/** Маппинг статусов инцидентов на метки и CSS-классы */
const STATUS_MAP = {
  new: { label: 'Новый', className: 'status-needs-repair' },
  in_progress: { label: 'В работе', className: 'status-under-repair' },
  resolved: { label: 'Решён', className: 'status-working' },
};

/** Компонент страницы инцидентов */
function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [allowInspectionWithoutQr, setAllowInspectionWithoutQr] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allEquipment, setAllEquipment] = useState([]);
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

  /** Загрузка инцидентов при монтировании */
  useEffect(() => { fetchIncidents(); }, []);

  /** Загрузка списка инцидентов с фильтрацией по статусу */
  const fetchIncidents = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/incidents', { params });
      setIncidents(res.data);
      setLoading(false);
    } catch { setLoading(false); }
  };

  /** Перезагрузка инцидентов при изменении фильтра статуса */
  useEffect(() => { fetchIncidents(); }, [filterStatus]);

  /** Загрузка настройки компании и справочника оборудования */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await companyAPI.get();
        setAllowInspectionWithoutQr(res.data.allowInspectionWithoutQr);
      } catch {}
    };
    const fetchAllEquipment = async () => {
      try {
        const res = await equipmentAPI.getAll();
        setAllEquipment(res.data);
      } catch {}
    };
    fetchSettings();
    fetchAllEquipment();

    const fetchCauses = async () => {
      try {
        const res = await causesAPI.getAll();
        setAllCauses(res.data);
      } catch {}
    };
    fetchCauses();
  }, []);

  /** Загрузка типовых неисправностей при выборе оборудования */
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
      } catch {}
    };
    fetchFaults();
  }, [newEquipmentId]);

  /** Обновление статуса и заметки инцидента */
  const updateStatus = async (id, status) => {
    try {
      await api.put(`/incidents/${id}`, { status, adminNotes });
      setSelectedIncident(null);
      setAdminNotes('');
      fetchIncidents();
    } catch { toast.error('Ошибка', 'Не удалось обновить статус'); }
  };

  /** Обработка выбора фотографий для нового инцидента */
  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (newPhotos.length + files.length > 5) {
      toast.error('Максимум 5 фотографий');
      return;
    }
    setNewPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setNewPreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  /** Удаление фотографии по индексу */
  const removePhoto = (index) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  /** Создание нового инцидента вручную */
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
      newPhotos.forEach(photo => formData.append('photos', photo));
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

  /** Удаление инцидента с подтверждением */
  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Удалить инцидент?', message: 'Инцидент будет удалён навсегда.', type: 'danger' });
    if (!confirmed) return;
    try { await api.delete(`/incidents/${id}`); fetchIncidents(); } catch { toast.error('Ошибка', 'Не удалось удалить инцидент'); }
  };

  if (loading) return <SkeletonTable rows={6} cols={7} />;

  return (
    <div className="directory-page">
      <div className="header">
        <h1><AlertTriangle size={24} />Инциденты (поломки)</h1>
        {allowInspectionWithoutQr && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            + Добавить инцидент
          </button>
        )}
      </div>

      {/* Панель фильтрации по статусу */}
      <div className="filters-panel">
        <div className="filter-row">
          <CustomSelect value={filterStatus} onChange={setFilterStatus} placeholder="Все статусы" options={[
            { value: '', label: 'Все статусы' },
            { value: 'new', label: 'Новые' },
            { value: 'in_progress', label: 'В работе' },
            { value: 'resolved', label: 'Решённые' }
          ]} />
          <span className="filter-summary">Найдено: <strong>{incidents.length}</strong></span>
        </div>
      </div>

      <div className="table-container">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Оборудование</th>
                <th>Проблема</th>
                <th>Сотрудник</th>
                <th>Статус</th>
                <th>Фото</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr><td colSpan="7" className="no-results-cell">Инцидентов нет</td></tr>
              ) : (
                incidents.map(inc => {
                  const st = STATUS_MAP[inc.status] || STATUS_MAP.new;
                  return (
                    <tr key={inc.id}>
                      <td>{new Date(inc.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <Link to={`/equipment/${inc.equipmentId}`} className="table-link">
                          {inc.equipmentName || '—'}
                        </Link>
                        <div className="td-muted">{inc.inventoryNumber}</div>
                      </td>
                      <td className="td-muted">{inc.description.substring(0, 80)}{inc.description.length > 80 ? '...' : ''}</td>
                      <td>{inc.employeeName || '—'}</td>
                      <td><span className={`status-badge ${st.className}`}>{st.label}</span></td>
                      <td>{inc.photos?.length || 0} шт.</td>
                      <td>
                        <ActionsMenu items={[
                          { icon: <FileText size={14} />, label: 'Подробнее', onClick: () => { setSelectedIncident(inc); setAdminNotes(inc.adminNotes || ''); } },
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

      {/* Модальное окно деталей инцидента */}
      {selectedIncident && (
        <div className="complete-task-modal" onClick={() => setSelectedIncident(null)}>
          <div className="modal-content incident-modal" onClick={e => e.stopPropagation()}>
            <h3>Инцидент</h3>
            <div className="incident-detail">
              <p><strong>Оборудование:</strong> {selectedIncident.equipmentName} ({selectedIncident.inventoryNumber})</p>
              <p><strong>Дата:</strong> {new Date(selectedIncident.createdAt).toLocaleString('ru-RU')}</p>
              <p><strong>Сотрудник:</strong> {selectedIncident.employeeName}</p>
              <p><strong>Проблема:</strong> {selectedIncident.description}</p>
              {selectedIncident.causeName && (
                <p><strong>Причина:</strong> {selectedIncident.causeName}</p>
              )}

              {selectedIncident.photos?.length > 0 && (
                <div className="incident-photos">
                  <strong>Фото:</strong>
                  <div className="incident-photo-grid">
                    {selectedIncident.photos.map((photo, idx) => (
                      <a key={idx} href={`/uploads/${photo}`} target="_blank" rel="noopener noreferrer">
                        <img src={`/uploads/${photo}`} alt="" className="incident-thumb" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Заметка администратора</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" placeholder="Комментарий..." />
              </div>

              <div className="incident-status-actions">
                {selectedIncident.status !== 'in_progress' && (
                  <button onClick={() => updateStatus(selectedIncident.id, 'in_progress')} className="btn btn-secondary">В работу</button>
                )}
                {selectedIncident.status !== 'resolved' && (
                  <button onClick={() => updateStatus(selectedIncident.id, 'resolved')} className="btn btn-primary">Решено</button>
                )}
                <button onClick={() => setSelectedIncident(null)} className="btn">Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания инцидента вручную */}
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
                options={allEquipment.map(e => ({ value: e.id, label: `${e.name} (${e.inventoryNumber || '—'})` }))}
              />
            </div>
            {commonFaults.length > 0 && (
              <div className="form-group">
                <label>Типовая неисправность</label>
                <CustomSelect
                  value={newCommonFaultId}
                  onChange={(v) => {
                    setNewCommonFaultId(v);
                    const fault = commonFaults.find(f => f.id === v);
                    if (fault) setNewDescription(fault.name);
                  }}
                  placeholder="Выберите из справочника (необязательно)"
                  options={commonFaults.map(f => ({ value: f.id, label: f.name }))}
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
                  options={allCauses.map(c => ({ value: c.id, label: c.name }))}
                />
              </div>
            )}
            <div className="form-group">
              <label>Описание проблемы *</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Опишите что произошло..."
                rows="4"
              />
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary photo-add-btn"
                  >
                    📷 Добавить фото
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
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
