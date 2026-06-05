/**
 * @module EquipmentForm
 * @description Форма добавления и редактирования оборудования. Загружает помещения и работы.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { equipmentAPI, roomsAPI, worksAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import Breadcrumb from '../components/Breadcrumb';
import CustomSelect from '../components/CustomSelect';
import { Upload } from 'lucide-react';

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

  /** Загрузка помещений и работ; при редактировании — данных оборудования */
  useEffect(() => {
    Promise.all([roomsAPI.getAll(), worksAPI.getAll()])
      .then(([r, w]) => { setRooms(r.data); setWorks(w.data); });
    if (isEditing) fetchEquipment();
  }, [id]);

  /** Загрузка данных редактируемого оборудования */
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

  /** Обработчик изменения текстовых полей формы */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /** Обработчик выбора фотографии с предпросмотром */
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  /** Переключение привязки плановой работы */
  const handleWorkToggle = (workId) => {
    setFormData(prev => {
      const ids = prev.workIds.includes(workId)
        ? prev.workIds.filter(wid => wid !== workId)
        : [...prev.workIds, workId];
      return { ...prev, workIds: ids };
    });
  };

  /** Отправка формы: создание или обновление оборудования */
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
                <CustomSelect value={formData.roomId} onChange={(val) => setFormData(prev => ({ ...prev, roomId: val }))} placeholder="— Выберите помещение —" options={[
                  { value: '', label: '— Выберите помещение —' },
                  ...rooms.map(r => ({ value: r.id, label: `${r.name}${r.building ? ` (${r.building})` : ''}` }))
                ]} />
              </div>

              <div className="form-group">
                <label>Категория</label>
                <input type="text" name="category" value={formData.category} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Состояние</label>
              <CustomSelect value={formData.status} onChange={(val) => setFormData(prev => ({ ...prev, status: val }))} options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="3" />
            </div>
          </div>

          <div className="form-sidebar">
            <div className="form-group">
              <label>Фотография</label>
              <label className="btn btn-secondary logo-upload-btn" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <Upload size={16} />
                <span>Загрузить фото</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
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
