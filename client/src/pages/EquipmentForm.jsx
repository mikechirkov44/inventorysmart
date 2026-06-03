import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { equipmentAPI, roomsAPI, worksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import Breadcrumb from '../components/Breadcrumb';

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

const STATUS_OPTIONS = [
  { value: 'working', label: 'Работает' },
  { value: 'under_repair', label: 'В ремонте' },
  { value: 'needs_repair', label: 'Требует ремонта' },
];

function EquipmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    inventoryNumber: '',
    description: '',
    roomId: '',
    category: '',
    status: 'working',
    workIds: []
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [works, setWorks] = useState([]);

  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    Promise.all([roomsAPI.getAll(), worksAPI.getAll()])
      .then(([r, w]) => { setRooms(r.data); setWorks(w.data); });
    if (isEditing) fetchEquipment();
  }, [id]);

  const fetchEquipment = async () => {
    try {
      const response = await equipmentAPI.getById(id);
      setFormData({
        name: response.data.name || '',
        inventoryNumber: response.data.inventoryNumber || '',
        description: response.data.description || '',
        roomId: response.data.roomId || '',
        category: response.data.category || '',
        status: response.data.status || 'working',
        workIds: Array.isArray(response.data.workIds) ? response.data.workIds : []
      });
      if (response.data.photo) {
        setPhotoPreview(`/uploads/${response.data.photo}`);
      }
    } catch (err) {
      toast.error('Ошибка', 'Ошибка загрузки данных');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleWorkToggle = (workId) => {
    setFormData(prev => {
      const ids = prev.workIds.includes(workId)
        ? prev.workIds.filter(wid => wid !== workId)
        : [...prev.workIds, workId];
      return { ...prev, workIds: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.roomId) {
      setError('Выберите помещение');
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'workIds') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });
      if (photo) {
        submitData.append('photo', photo);
      }

      if (isEditing) {
        await equipmentAPI.update(id, submitData);
      } else {
        await equipmentAPI.create(submitData);
      }
      navigate('/');
    } catch (err) {
      toast.error('Ошибка', 'Ошибка сохранения');
      setLoading(false);
    }
  };

  return (
    <div className="equipment-form">
      <Breadcrumb items={[
        { label: 'Главная', to: '/' },
        { label: 'Оборудование', to: '/' },
        { label: isEditing ? 'Редактирование' : 'Добавление' }
      ]} />
      <div className="form-header">
        <Link to={isEditing ? `/equipment/${id}` : '/'} className="back-link">
          ← Назад
        </Link>
        <h1>{isEditing ? 'Редактирование оборудования' : 'Добавление оборудования'}</h1>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-content">
          <div className="form-main">
            <div className="form-group">
              <label>Наименование *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Инвентарный номер</label>
              <input type="text" name="inventoryNumber" value={formData.inventoryNumber} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Помещение *</label>
                <select name="roomId" value={formData.roomId} onChange={handleChange} required>
                  <option value="">— Выберите помещение —</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}{r.building ? ` (${r.building})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Категория</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Состояние</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="3" />
            </div>
          </div>

          <div className="form-sidebar">
            <div className="form-group">
              <label>Фотография</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="photo-preview" />
              )}
            </div>

            <div className="form-group">
              <label>Плановые работы</label>
              <div className="works-checkbox-list">
                {works.length === 0 && (
                  <p className="no-works-hint">Нет работ в справочнике. Добавьте их в разделе «Работы».</p>
                )}
                {works.map(work => (
                  <label key={work.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.workIds.includes(work.id)}
                      onChange={() => handleWorkToggle(work.id)}
                    />
                    <span className="checkbox-label">
                      {work.name}
                      <span className="checkbox-hint">{getFrequencyLabel(work.frequencyDays)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link to={isEditing ? `/equipment/${id}` : '/'} className="btn">Отмена</Link>
        </div>
      </form>
    </div>
  );
}

export default EquipmentForm;
