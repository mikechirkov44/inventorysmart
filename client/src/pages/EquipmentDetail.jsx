import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { equipmentAPI, workOrderAPI, roomsAPI, worksAPI, sparePartsAPI, incidentsAPI } from '../services/api';
import EquipmentPassport from '../components/EquipmentPassport';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPassport, setShowPassport] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [equipRes, workOrdersRes, qrRes, spRes, incRes] = await Promise.all([
        equipmentAPI.getById(id),
        workOrderAPI.getByEquipment(id),
        equipmentAPI.getQR(id),
        sparePartsAPI.getByEquipment(id),
        incidentsAPI.getAll({ equipmentId: id }).catch(() => ({ data: [] }))
      ]);
      const equip = equipRes.data;
      setEquipment(equip);
      setWorkOrders(workOrdersRes.data);
      setQrData(qrRes.data);
      setSpareParts(spRes.data);
      setIncidents(incRes.data || []);

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

  const handleDelete = async () => {
    if (window.confirm('Удалить оборудование?')) {
      try { await equipmentAPI.delete(id); navigate('/'); }
      catch { setError('Ошибка удаления'); }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!equipment) return <div className="error">Оборудование не найдено</div>;

  const st = STATUS_MAP[equipment.status] || STATUS_MAP.working;

  return (
    <div className="equipment-detail">
      <div className="detail-header">
        <Link to="/" className="back-link">← Назад к списку</Link>
        <div className="detail-actions">
          <button onClick={() => setShowPassport(!showPassport)} className="btn btn-secondary">
            {showPassport ? '← Назад к карточке' : '📄 Паспорт'}
          </button>
          <Link to={`/equipment/${id}/edit`} className="btn btn-primary">Редактировать</Link>
          <button onClick={handleDelete} className="btn btn-danger">Удалить</button>
        </div>
      </div>

      {showPassport ? (
        <EquipmentPassport
          equipment={equipment}
          room={room}
          assignedWorks={assignedWorks}
          spareParts={spareParts}
          workOrders={workOrders}
          incidents={incidents}
          qrData={qrData}
        />
      ) : (<>
        <div className="detail-content">
          <div className="detail-main">
            <div className="detail-photo">
              {equipment.photo ? (
                <img src={`/uploads/${equipment.photo}`} alt={equipment.name} />
              ) : (
                <div className="no-photo-large">Нет фото</div>
              )}
            </div>

            <div className="detail-info">
              <h1>{equipment.name}</h1>
              <div className="info-row">
                <span className="label">Состояние:</span>
                <span className="value"><span className={`status-badge ${st.className}`}>{st.label}</span></span>
              </div>
              <div className="info-row">
                <span className="label">Инвентарный номер:</span>
                <span className="value">{equipment.inventoryNumber}</span>
              </div>
              <div className="info-row">
                <span className="label">Помещение:</span>
                <span className="value">{room ? room.name : '—'}{room && room.building ? ` (${room.building})` : ''}</span>
              </div>
              <div className="info-row">
                <span className="label">Категория:</span>
                <span className="value">{equipment.category}</span>
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
                  <p className="scan-url">{qrData.scanUrl}</p>
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
          </div>
        </div>
      </>)}
    </div>
  );
}

export default EquipmentDetail;
