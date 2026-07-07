/**
 * @module ReportFailureModal
 * @description Модальное окно для сообщения о поломке оборудования.
 */

import { useState, useRef, useEffect } from 'react';
import api, { commonFaultsAPI, causesAPI } from '../services/api';
import CustomSelect from './CustomSelect';

function ReportFailureModal({ equipment, onClose, onSuccess }) {
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [commonFaults, setCommonFaults] = useState([]);
  const [commonFaultId, setCommonFaultId] = useState('');
  const [causes, setCauses] = useState([]);
  const [causeId, setCauseId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [faultsRes, causesRes] = await Promise.all([
          commonFaultsAPI.getByEquipment(equipment.id),
          causesAPI.getAll(),
        ]);
        setCommonFaults(faultsRes.data);
        setCauses(causesRes.data);
      } catch {
        setCommonFaults([]);
        setCauses([]);
      }
    };
    load();
  }, [equipment.id]);

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) {
      setError('Максимум 5 фотографий');
      return;
    }
    setPhotos((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Опишите проблему');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('equipmentId', equipment.id);
      formData.append('description', description);
      if (commonFaultId) formData.append('commonFaultId', commonFaultId);
      if (causeId) formData.append('causeId', causeId);
      photos.forEach((photo) => formData.append('photos', photo));

      await api.post('/incidents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess();
    } catch {
      setError('Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="complete-task-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Сообщить о поломке</h3>
        <p className="modal-equipment-name">{equipment.name} ({equipment.inventoryNumber})</p>

        {error && <div className="error">{error}</div>}

        {commonFaults.length > 0 && (
          <div className="form-group">
            <label>Типовая неисправность</label>
            <CustomSelect
              value={commonFaultId}
              onChange={(value) => {
                setCommonFaultId(value);
                const fault = commonFaults.find((f) => f.id === value);
                if (fault && !description.trim()) setDescription(fault.name);
              }}
              placeholder="Выберите (необязательно)"
              options={commonFaults.map((f) => ({ value: f.id, label: f.name }))}
            />
          </div>
        )}

        {causes.length > 0 && (
          <div className="form-group">
            <label>Причина возникновения</label>
            <CustomSelect
              value={causeId}
              onChange={setCauseId}
              placeholder="Выберите (необязательно)"
              options={causes.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
        )}

        <div className="form-group">
          <label>Описание проблемы *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите что произошло..."
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Фотографии ({photos.length}/5)</label>
          <div className="photo-upload-area">
            <div className="photo-previews">
              {previews.map((src, idx) => (
                <div key={idx} className="photo-preview-item">
                  <img src={src} alt="" />
                  <button type="button" onClick={() => removePhoto(idx)} className="photo-remove">✕</button>
                </div>
              ))}
            </div>
            {photos.length < 5 && (
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
              capture="environment"
              multiple
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleSubmit} className="btn btn-danger" disabled={submitting}>
            {submitting ? 'Отправка...' : 'Отправить'}
          </button>
          <button onClick={onClose} className="btn">Отмена</button>
        </div>
      </div>
    </div>
  );
}

export default ReportFailureModal;
