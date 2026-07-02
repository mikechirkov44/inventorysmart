/**
 * @module EquipmentDetail
 * @description Карточка оборудования: основная информация, QR-код, плановые работы, ЗИП, история ремонтов.
 */
import { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { equipmentAPI, workOrderAPI, roomsAPI, worksAPI, sparePartsAPI, incidentsAPI, operatingHoursAPI, commonFaultsAPI } from '../services/api';
const EquipmentPassport = lazy(() => import('../components/EquipmentPassport'));
import EquipmentInstructions from '../components/EquipmentInstructions';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import OperatingHoursModal from '../components/OperatingHoursModal';
import { FileText, Clock, Pencil, Trash2, ArrowLeft, Wrench, Plus } from 'lucide-react';
import UploadImage from '../components/UploadImage';

/** Варианты периодичности плановых работ */
const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Ежедневно' },
  { value: 7, label: '1 раз в неделю' },
  { value: 10, label: '1 раз в 10 дней' },
  { value: 14, label: '1 раз в 2 недели' },
  { value: 30, label: '1 раз в месяц' },
  { value: 60, label: '1 раз в 2 месяца' },
  { value: 90, label: '1 раз в 3 месяца' },
  { value: 180, label: '1 раз в 6 месяцев' },
  { value: 365, label: '1 раз в год' },
];

function getFrequencyLabel(days) {
  const opt = FREQUENCY_OPTIONS.find(o => o.value === days);
  return opt ? opt.label : `каждые ${days} дн.`;
}

const STATUS_MAP = {
  working: { label: 'Работает', className: 'status-working' },
  under_repair: { label: 'В ремонте', className: 'status-under-repair' },
  needs_repair: { label: 'Требует ремонта', className: 'status-needs-repair' },
};

function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [room, setRoom] = useState(null);
  const [assignedWorks, setAssignedWorks] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [commonFaults, setCommonFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPassport, setShowPassport] = useState(false);
  const [showOperatingHours, setShowOperatingHours] = useState(false);
  const [showCommonFaultForm, setShowCommonFaultForm] = useState(false);
  const [editingFault, setEditingFault] = useState(null);
  const [faultForm, setFaultForm] = useState({ name: '' });
  const [operatingHours, setOperatingHours] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка всех данных оборудования при изменении ID */
  useEffect(() => {
    fetchData();
  }, [id]);

  /** Параллельная загрузка данных оборудования, нарядов, QR, ЗИП, инцидентов, моточасов, типовых неисправностей */
  const fetchData = async () => {
    try {
      const [equipRes, workOrdersRes, qrRes, spRes, incRes, ohRes, cfRes] = await Promise.all([
        equipmentAPI.getById(id),
        workOrderAPI.getByEquipment(id),
        equipmentAPI.getQR(id),
        sparePartsAPI.getByEquipment(id),
        incidentsAPI.getAll({ equipmentId: id }).catch(() => ({ data: [] })),
        operatingHoursAPI.getByEquipmentId(id).catch(() => ({ data: { data: null } })),
        commonFaultsAPI.getByEquipment(id).catch(() => ({ data: [] }))
      ]);
      const equip = equipRes.data;
      setEquipment(equip);
      setWorkOrders(workOrdersRes.data);
      setQrData(qrRes.data);
      setSpareParts(spRes.data);
      setIncidents(incRes.data || []);
      setOperatingHours(ohRes.data?.data || null);
      setCommonFaults(cfRes.data || []);

      if (equip.roomId) {
        roomsAPI.getById(equip.roomId).then(r => setRoom(r.data)).catch(() => {});
      }
      const ids = Array.isArray(equip.workIds) ? equip.workIds : [];
      if (ids.length > 0) {
        worksAPI.getAll().then(w => {
          setAssignedWorks(w.data.filter(ww => ids.includes(ww.id)));
        }).catch(() => {});
      }

      setLoading(false);
    } catch (err) {
      setError('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  /** Удаление оборудования с переходом на главную */
  const handleDelete = async () => {
    const confirmed = await confirm({ title: 'Удалить оборудование?', message: 'Это действие нельзя отменить. Все связанные данные будут удалены.', type: 'danger' });
    if (!confirmed) return;
    try { await equipmentAPI.delete(id); navigate('/'); }
    catch { toast.error('Ошибка', 'Не удалось удалить оборудование'); }
  };

  /** Открытие окна печати QR-кода */
  const handlePrintQR = () => {
    if (!qrData) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>QR — ${equipment.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .qr-card { text-align: center; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .qr-card img { width: 200px; height: 200px; image-rendering: pixelated; }
        .qr-card h2 { margin-top: 16px; font-size: 16px; font-weight: 600; }
        .qr-card p { font-size: 13px; color: #6b7280; margin-top: 4px; }
        @media print { body { padding: 0; } .qr-card { border: none; } }
      </style></head><body>
        <div class="qr-card">
          <img src="${qrData.qrImage}" alt="QR" />
          <h2>${equipment.name}</h2>
          <p>Инв. номер: ${equipment.inventoryNumber || '—'}</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  /** Обработчики типовых неисправностей */
  const handleAddFault = () => {
    setEditingFault(null);
    setFaultForm({ name: '' });
    setShowCommonFaultForm(true);
  };

  const handleEditFault = (fault) => {
    setEditingFault(fault);
    setFaultForm({ name: fault.name });
    setShowCommonFaultForm(true);
  };

  const handleSaveFault = async () => {
    if (!faultForm.name.trim()) {
      toast.error('Ошибка', 'Введите название неисправности');
      return;
    }
    try {
      if (editingFault) {
        await commonFaultsAPI.update(editingFault.id, { equipmentId: id, name: faultForm.name });
        toast.success('Обновлено');
      } else {
        await commonFaultsAPI.create({ equipmentId: id, name: faultForm.name });
        toast.success('Создано');
      }
      setShowCommonFaultForm(false);
      setEditingFault(null);
      setFaultForm({ name: '' });
      // Refresh common faults
      const cfRes = await commonFaultsAPI.getByEquipment(id);
      setCommonFaults(cfRes.data || []);
    } catch {
      toast.error('Ошибка', 'Не удалось сохранить');
    }
  };

  const handleDeleteFault = async (faultId) => {
    const confirmed = await confirm({ title: 'Удалить?', message: 'Типовая неисправность будет удалена.', type: 'danger' });
    if (!confirmed) return;
    try {
      await commonFaultsAPI.delete(faultId);
      toast.success('Удалено');
      const cfRes = await commonFaultsAPI.getByEquipment(id);
      setCommonFaults(cfRes.data || []);
    } catch {
      toast.error('Ошибка', 'Не удалось удалить');
    }
  };

  if (loading) return <SkeletonPage />;
  if (error) return null;
  if (!equipment) return null;

  const st = STATUS_MAP[equipment.status] || STATUS_MAP.working;

  return (
    <div className="equipment-detail">
      <Breadcrumb items={[
        { label: 'Главная', to: '/' },
        { label: 'Оборудование', to: '/' },
        { label: equipment.name }
      ]} />
        <div className="detail-header">
        <div className="detail-header-main">
          <Link to="/" className="back-link">← Назад к списку</Link>
        </div>
      </div>

      {showPassport ? (
        <Suspense fallback={<div className="loading-spinner">Загрузка паспорта...</div>}>
          <EquipmentPassport
            equipment={equipment}
            room={room}
            assignedWorks={assignedWorks}
            spareParts={spareParts}
            workOrders={workOrders}
            incidents={incidents}
            qrData={qrData}
          />
        </Suspense>
      ) : (<>
        <div className="detail-content">
          <div className="detail-main">
            <div className="detail-photo">
              {equipment.photo ? (
                <UploadImage item={equipment} field="photo" alt={equipment.name} />
              ) : (
                <div className="no-photo-large">Нет фото</div>
              )}
            </div>

            <div className="detail-info">
              <div className="detail-title-row">
                <h1>{equipment.name}</h1>
                <div className="detail-action-buttons">
                  <button onClick={() => setShowPassport(!showPassport)} className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {showPassport ? <><ArrowLeft size={16} /> Назад</> : <><FileText size={16} /> Паспорт</>}
                  </button>
                  <button onClick={() => setShowOperatingHours(true)} className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} /> Моточасы
                  </button>
                  <Link to={`/equipment/${id}/edit`} className="btn btn-sm btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pencil size={16} /> Редактировать
                  </Link>
                  <button onClick={handleDelete} className="btn btn-sm btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={16} /> Удалить
                  </button>
                </div>
              </div>
              <div className="info-row">
                <span className="label">Состояние:</span>
                <span className="value"><span className={`status-badge ${st.className}`}>{st.label}</span></span>
              </div>
              <div className="info-row">
                <span className="label">Инвентарный номер:</span>
                <span className="value">{equipment.inventoryNumber || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Серийный номер (S/N):</span>
                <span className="value">{equipment.serialNumber || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Производитель:</span>
                <span className="value">{equipment.manufacturer || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Год выпуска:</span>
                <span className="value">{equipment.yearOfManufacture || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Дата ввода:</span>
                <span className="value">{equipment.commissioningDate ? new Date(equipment.commissioningDate).toLocaleDateString('ru-RU') : '—'}</span>
              </div>
              {operatingHours && (
                <div className="info-row">
                  <span className="label">Наработка:</span>
                  <span className="value">
                    <span className="oh-badge">
                      {operatingHours.currentValue} {operatingHours.unit}
                    </span>
                    {operatingHours.intervals?.length > 0 && (
                      <span className="oh-intervals-count">
                        {operatingHours.intervals.length} интервал(ов) ТО
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Помещение:</span>
                <span className="value">{room ? room.name : '—'}{room && room.building ? ` (${room.building})` : ''}</span>
              </div>
              <div className="info-row">
                <span className="label">Категория:</span>
                <span className="value">{equipment.categoryName || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Описание:</span>
                <span className="value">{equipment.description}</span>
              </div>
            </div>
          </div>

          <div className="detail-sidebar">
            <div className="qr-section">
              <h3>QR-код</h3>
              {qrData && (
                <div className="qr-code">
                  <img src={qrData.qrImage} alt="QR Code" />
                  <div className="qr-label">{equipment.name}</div>
                  {equipment.inventoryNumber && <div className="qr-inventory">Инв. номер: {equipment.inventoryNumber}</div>}
                  <button className="qr-print-btn" onClick={handlePrintQR}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Печать
                  </button>
                </div>
              )}
            </div>

            <div className="tasks-section">
              <h3>Плановые работы ({assignedWorks.length})</h3>
              <ul className="task-list">
                {assignedWorks.map(work => (
                  <li key={work.id} className="task-item">
                    <span className="task-name">{work.name}</span>
                    <span className="task-frequency">{getFrequencyLabel(work.frequencyDays)}</span>
                  </li>
                ))}
                {assignedWorks.length === 0 && <li className="task-item">Нет привязанных работ</li>}
              </ul>
            </div>

            <div className="spare-parts-section">
              <h3>ЗИП ({spareParts.length})</h3>
              {spareParts.length > 0 ? (
                <div className="spare-parts-list">
                  {spareParts.map(sp => (
                    <div key={sp.id} className="spare-part-item">
                      <div className="sp-item-info">
                        <span className="sp-item-name">{sp.name}</span>
                        {sp.article && <span className="sp-item-article">{sp.article}</span>}
                      </div>
                      <div className="sp-item-stock">
                        <span className={`sp-quantity ${sp.quantity <= 0 ? 'empty' : sp.quantity <= sp.minStock ? 'low' : ''}`}>
                          {sp.quantity || 0}
                        </span>
                        {sp.minStock > 0 && <span className="sp-min">мин. {sp.minStock}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-spare-parts">Нет привязанных запчастей</p>
              )}
            </div>

            <div className="common-faults-section">
              <div className="section-header">
                <h3>Типовые неисправности ({commonFaults.length})</h3>
                <button onClick={handleAddFault} className="btn-icon btn-sm" title="Добавить неисправность">
                  <Plus size={16} />
                </button>
              </div>
              {commonFaults.length > 0 ? (
                <ul className="fault-list">
                  {commonFaults.map(fault => (
                    <li key={fault.id} className="fault-item">
                      <span className="fault-name">{fault.name}</span>
                      <div className="fault-actions">
                        <button onClick={() => handleEditFault(fault)} className="btn-icon btn-xs" title="Редактировать">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteFault(fault.id)} className="btn-icon btn-xs danger" title="Удалить">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-faults">Нет типовых неисправностей</p>
              )}
            </div>

            <div className="history-section">
              <h3>История работ ({workOrders.length})</h3>
              <ul className="history-list">
                {workOrders.slice(0, 5).map(wo => (
                  <li key={wo.id} className={`history-item ${wo.status}`}>
                    <span className="history-date">{new Date(wo.createdAt).toLocaleDateString('ru-RU')}</span>
                    <span className="history-task">{wo.taskName}</span>
                    <span className="history-master">{wo.masterName}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions Section */}
            <EquipmentInstructions
              equipmentId={id}
              instructionPdf={equipment.instructionPdf}
              instructionMd={equipment.instructionMd}
              onUpdate={async () => {
                try {
                  const equipRes = await equipmentAPI.getById(id);
                  setEquipment(equipRes.data);
                } catch (err) {
                  console.error('Error refreshing equipment:', err);
                }
              }}
            />
          </div>
        </div>
      </>)}

      {showOperatingHours && (
        <OperatingHoursModal
          equipmentId={id}
          equipmentName={equipment?.name}
          onClose={() => setShowOperatingHours(false)}
          onSave={async () => {
            toast.success('Успех', 'Параметры наработки сохранены');
            // Refresh operating hours data
            try {
              const ohRes = await operatingHoursAPI.getByEquipmentId(id);
              setOperatingHours(ohRes.data?.data || null);
            } catch (err) {
              console.error('Error refreshing operating hours:', err);
            }
          }}
        />
      )}

      {showCommonFaultForm && (
        <div className="complete-task-modal" onClick={() => setShowCommonFaultForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingFault ? 'Редактирование неисправности' : 'Новая типовая неисправность'}</h3>
            <div className="form-group">
              <label>Неисправность *</label>
              <input
                type="text"
                value={faultForm.name}
                onChange={(e) => setFaultForm({ ...faultForm, name: e.target.value })}
                placeholder="Например: Поломка двигателя"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button onClick={handleSaveFault} className="btn btn-primary" disabled={!faultForm.name.trim()}>
                {editingFault ? 'Обновить' : 'Создать'}
              </button>
              <button onClick={() => setShowCommonFaultForm(false)} className="btn">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentDetail;
