/**
 * @module EquipmentForm
 * @description Форма добавления и редактирования оборудования. Загружает помещения и работы.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { equipmentAPI, roomsAPI, worksAPI, equipmentCategoriesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import Breadcrumb from '../components/Breadcrumb';
import CustomSelect from '../components/CustomSelect';
import { Upload, FolderTree } from 'lucide-react';
import UploadImage from '../components/UploadImage';
import EquipmentWorkModal from '../components/EquipmentWorkModal';
import { resolveUploadField } from '../utils/uploads';
import { toDateInputValue, todayInputValue, formatDate } from '../utils/date';

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
  { value: 'reserve', label: 'Резерв' },
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
    categoryId: '',
    status: 'working',
    manufacturer: '',
    serialNumber: '',
    yearOfManufacture: '',
    commissioningDate: '',
    workLinks: []
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workModal, setWorkModal] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [works, setWorks] = useState([]);
  const [categories, setCategories] = useState([]);

  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка помещений, работ и категорий; при редактировании — данных оборудования */
  useEffect(() => {
    Promise.all([roomsAPI.getAll(), worksAPI.getAll(), equipmentCategoriesAPI.getAll()])
      .then(([r, w, c]) => { setRooms(r.data); setWorks(w.data); setCategories(c.data); });
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
        roomId: response.data.roomId != null ? String(response.data.roomId) : '',
        categoryId: response.data.categoryId != null ? String(response.data.categoryId) : '',
        status: response.data.status || 'working',
        manufacturer: response.data.manufacturer || '',
        serialNumber: response.data.serialNumber || '',
        yearOfManufacture: response.data.yearOfManufacture ?? '',
        commissioningDate: toDateInputValue(response.data.commissioningDate),
        workLinks: Array.isArray(response.data.workLinks)
          ? response.data.workLinks.map((link) => ({
            workId: link.workId,
            startDate: toDateInputValue(link.startDate) || todayInputValue(),
          }))
          : (Array.isArray(response.data.workIds) ? response.data.workIds : []).map((workId) => ({
            workId,
            startDate: todayInputValue(),
          })),
      });
      if (response.data.photo) {
        setPhotoPreview(resolveUploadField(response.data, 'photo'));
      }
    } catch (err) {
      toast.error('Ошибка', err.response?.data?.error || 'Ошибка загрузки данных');
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

  /** Сохранение привязки работы из модального окна */
  const handleWorkLinkSave = (link) => {
    setFormData((prev) => {
      const existingIndex = prev.workLinks.findIndex((item) => item.workId === link.workId);
      if (existingIndex >= 0) {
        const nextLinks = [...prev.workLinks];
        nextLinks[existingIndex] = link;
        return { ...prev, workLinks: nextLinks };
      }
      return { ...prev, workLinks: [...prev.workLinks, link] };
    });
    setWorkModal(null);
  };

  /** Удаление привязки работы */
  const handleWorkLinkRemove = async (workId) => {
    const work = works.find((item) => item.id === workId);
    const confirmed = await confirm({
      title: 'Удалить работу?',
      message: `Убрать «${work?.name || 'работу'}» из планового обслуживания?`,
      type: 'warning',
      confirmText: 'Удалить',
    });
    if (!confirmed) return;
    setFormData((prev) => ({
      ...prev,
      workLinks: prev.workLinks.filter((item) => item.workId !== workId),
    }));
  };

  const availableWorks = works.filter(
    (work) => !formData.workLinks.some((link) => link.workId === work.id),
  );

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
        if (key === 'workLinks') {
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
        <h1><FolderTree size={24} />{isEditing ? 'Редактирование оборудования' : 'Добавление оборудования'}</h1>
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-content">
          <div className="form-main">
            <div className="form-group">
              <label>Наименование *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Инвентарный номер</label>
                <input type="text" name="inventoryNumber" value={formData.inventoryNumber} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Серийный номер (S/N)</label>
                <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Производитель</label>
                <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} placeholder="Например: Siemens, ABB, Bosch" />
              </div>
              <div className="form-group">
                <label>Год выпуска</label>
                <input type="number" name="yearOfManufacture" value={formData.yearOfManufacture} onChange={handleChange} placeholder="2020" min="1900" max="2100" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Дата ввода в эксплуатацию</label>
                <input type="date" name="commissioningDate" value={formData.commissioningDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                {/* Empty spacer for alignment */}
              </div>
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
                <CustomSelect
                  value={formData.categoryId}
                  onChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))}
                  placeholder="— Выберите категорию —"
                  options={[
                    { value: '', label: '— Выберите категорию —' },
                    ...categories.map(c => ({ value: c.id, label: c.name }))
                  ]}
                />
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
                <UploadImage src={photoPreview} alt="Preview" className="photo-preview" />
              )}
            </div>

            <div className="form-group">
              <label>Плановые работы</label>
              <div className="works-checkbox-list">
                {formData.workLinks.length === 0 && (
                  <p className="no-works-hint">Работы не назначены. Добавьте из справочника.</p>
                )}
                {formData.workLinks.map((link) => {
                  const work = works.find((item) => item.id === link.workId);
                  return (
                    <div key={link.workId} className="equipment-work-link-item">
                      <div className="equipment-work-link-info">
                        <span className="checkbox-label">{work?.name || '—'}</span>
                        <span className="checkbox-hint">
                          {work ? getFrequencyLabel(work.frequencyDays) : ''}
                          {' · '}старт {formatDate(link.startDate)}
                        </span>
                      </div>
                      <div className="equipment-work-link-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setWorkModal({ mode: 'edit', link })}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleWorkLinkRemove(link.workId)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => setWorkModal({ mode: 'add' })}
                disabled={availableWorks.length === 0}
              >
                + Добавить работу
              </button>
              {works.length === 0 && (
                <p className="no-works-hint">Нет работ в справочнике. Добавьте их в разделе «Работы».</p>
              )}
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

      {workModal && (
        <EquipmentWorkModal
          mode={workModal.mode}
          link={workModal.link}
          works={works}
          assignedIds={formData.workLinks.map((link) => link.workId)}
          onSave={handleWorkLinkSave}
          onClose={() => setWorkModal(null)}
        />
      )}
    </div>
  );
}

export default EquipmentForm;
