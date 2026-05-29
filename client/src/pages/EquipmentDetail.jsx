import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { equipmentAPI, workOrderAPI, roomsAPI, worksAPI } from '../services/api';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [equipRes, workOrdersRes, qrRes] = await Promise.all([
        equipmentAPI.getById(id),
        workOrderAPI.getByEquipment(id),
        equipmentAPI.getQR(id)
      ]);
      const equip = equipRes.data;
      setEquipment(equip);
      setWorkOrders(workOrdersRes.data);
      setQrData(qrRes.data);

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
          <Link to={`/equipment/${id}/edit`} className="btn btn-primary">Редактировать</Link>
          <button onClick={handleDelete} className="btn btn-danger">Удалить</button>
        </div>
      </div>

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
                  <span className="task-frequency">каждые {work.frequencyDays} дн.</span>
                </li>
              ))}
              {assignedWorks.length === 0 && <li className="task-item">Нет привязанных работ</li>}
            </ul>
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
    </div>
  );
}

export default EquipmentDetail;
