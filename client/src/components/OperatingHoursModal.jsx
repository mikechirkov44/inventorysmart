import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Info, Clock, Calendar, User, Settings } from 'lucide-react';
import { operatingHoursAPI, employeesAPI } from '../services/api';
import { useToast } from './Toast';
import Toggle from './Toggle';
import CustomSelect from './CustomSelect';

/**
 * @module OperatingHoursModal
 * @description Модальное окно для редактирования параметров наработки оборудования
 * @param {Object} props
 * @param {string} props.equipmentId - ID оборудования
 * @param {string} props.equipmentName - Название оборудования
 * @param {Function} props.onClose - Callback закрытия модала
 * @param {Function} props.onSave - Callback после сохранения
 */
function OperatingHoursModal({ equipmentId, equipmentName, onClose, onSave }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    unit: 'Моточасы (м/ч)',
    currentValue: 0,
    inputDate: '',
    assignedTo: '',
    autoCreateTasks: true,
    preventDecrease: true,
    intervals: []
  });
  const [newInterval, setNewInterval] = useState({ value: '', description: '' });
  const toast = useToast();

  // Load existing data and employees
  useEffect(() => {
    const loadData = async () => {
      try {
        const [ohRes, empRes] = await Promise.all([
          operatingHoursAPI.getByEquipmentId(equipmentId),
          employeesAPI.getAll()
        ]);

        setEmployees(empRes.data || []);

        if (ohRes.data?.data) {
          const data = ohRes.data.data;
          setFormData({
            unit: data.unit || 'Моточасы (м/ч)',
            currentValue: data.currentValue || 0,
            inputDate: data.inputDate ? data.inputDate.split('T')[0] : '',
            assignedTo: data.assignedTo || '',
            autoCreateTasks: data.autoCreateTasks !== false,
            preventDecrease: data.preventDecrease !== false,
            intervals: data.intervals || []
          });
        }
      } catch (err) {
        console.error('Error loading operating hours:', err);
        toast.error('Ошибка', 'Не удалось загрузить данные наработки');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [equipmentId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save operating hours
      const ohRes = await operatingHoursAPI.upsert(equipmentId, {
        unit: formData.unit,
        currentValue: parseFloat(formData.currentValue) || 0,
        inputDate: formData.inputDate || null,
        assignedTo: formData.assignedTo || null,
        autoCreateTasks: formData.autoCreateTasks,
        preventDecrease: formData.preventDecrease
      });

      const operatingHoursId = ohRes.data.data.id;

      // Save intervals (delete and recreate for simplicity)
      // First, get existing intervals to delete them
      const existingRes = await operatingHoursAPI.getByEquipmentId(equipmentId);
      const existingIntervals = existingRes.data?.data?.intervals || [];
      
      // Delete existing intervals
      for (const interval of existingIntervals) {
        await operatingHoursAPI.deleteInterval(interval.id);
      }

      // Add new intervals
      for (const interval of formData.intervals) {
        await operatingHoursAPI.addInterval(operatingHoursId, {
          intervalValue: parseFloat(interval.intervalValue),
          lastMaintenanceValue: parseFloat(interval.lastMaintenanceValue) || 0,
          description: interval.description || ''
        });
      }

      toast.success('Успех', 'Параметры наработки сохранены');
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error('Error saving operating hours:', err);
      toast.error('Ошибка', err.response?.data?.error || 'Не удалось сохранить параметры наработки');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInterval = () => {
    if (!newInterval.value || parseFloat(newInterval.value) <= 0) {
      toast.error('Ошибка', 'Введите корректное значение интервала');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      intervals: [...prev.intervals, {
        id: Date.now().toString(), // temp ID
        intervalValue: parseFloat(newInterval.value),
        lastMaintenanceValue: 0,
        description: newInterval.description
      }]
    }));
    setNewInterval({ value: '', description: '' });
  };

  const handleDeleteInterval = (index) => {
    setFormData(prev => ({
      ...prev,
      intervals: prev.intervals.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3><Clock size={20} /> Загрузка...</h3>
            <button className="btn-icon" onClick={onClose}><X size={20} /></button>
          </div>
          <div className="modal-body" style={{ padding: 40, textAlign: 'center' }}>
            Загрузка данных...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Clock size={20} /> Редактирование параметра наработки</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Equipment name */}
          <div style={{ marginBottom: 20, padding: 12, background: 'var(--gray-50)', borderRadius: 8 }}>
            <strong>Оборудование:</strong> {equipmentName}
          </div>

          {/* Unit of measurement */}
          <div className="form-group">
            <label>Единица измерения наработки</label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="Моточасы (м/ч)"
            />
          </div>

          {/* Current value */}
          <div className="form-group">
            <label>Текущее значение наработки *</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={formData.currentValue}
              onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
              placeholder="0"
            />
          </div>

          {/* Maintenance intervals */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={16} />
              Периоды ТО
              <span className="badge">{formData.intervals.length}</span>
            </label>
            
            {/* Existing intervals */}
            {formData.intervals.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {formData.intervals.map((interval, index) => (
                  <div key={interval.id || index} className="interval-row">
                    <div className="interval-info">
                      <strong>Каждые {interval.intervalValue} {formData.unit}</strong>
                      {interval.description && (
                        <span className="interval-desc">{interval.description}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-danger"
                      onClick={() => handleDeleteInterval(index)}
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new interval */}
            <div className="add-interval-row">
              <input
                type="number"
                min="1"
                step="1"
                value={newInterval.value}
                onChange={(e) => setNewInterval({ ...newInterval, value: e.target.value })}
                placeholder="Интервал (например: 250)"
                className="interval-input"
              />
              <input
                type="text"
                value={newInterval.description}
                onChange={(e) => setNewInterval({ ...newInterval, description: e.target.value })}
                placeholder="Описание (например: ТО-1)"
                className="interval-desc-input"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddInterval}
              >
                <Plus size={16} /> Добавить
              </button>
            </div>
          </div>

          {/* Assigned to */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} />
              Кто проводит ТО *
            </label>
            <CustomSelect
              value={formData.assignedTo}
              onChange={(value) => setFormData({ ...formData, assignedTo: value })}
              placeholder="Выберите сотрудника"
              options={employees.map(e => ({ 
                value: e.id, 
                label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.job_title || 'Без имени'
              }))}
            />
          </div>

          {/* Settings */}
          <div className="form-group">
            <Toggle
              label="Создавать задачи на проведение ТО"
              checked={formData.autoCreateTasks}
              onChange={(checked) => setFormData({ ...formData, autoCreateTasks: checked })}
            />
            <span className="form-hint">
              Система будет автоматически создавать задачи при достижении плановых показателей
            </span>
          </div>

          <div className="form-group">
            <Toggle
              label="Запрещать уменьшение наработки"
              checked={formData.preventDecrease}
              onChange={(checked) => setFormData({ ...formData, preventDecrease: checked })}
            />
            <span className="form-hint">
              Предотвращает случайное уменьшение значения наработки
            </span>
          </div>

          {/* Input date */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} />
              Дата ввода
            </label>
            <input
              type="date"
              value={formData.inputDate}
              onChange={(e) => setFormData({ ...formData, inputDate: e.target.value })}
            />
          </div>

          {/* Info box */}
          <div className="info-box">
            <Info size={18} />
            <p>
              Система фиксирует фактические значения наработки оборудования, автоматически 
              контролирует достижение плановых показателей для технического обслуживания и 
              создаёт задачи с уведомлениями при необходимости выполнения ТО.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button className="btn" onClick={onClose}>Отменить</button>
        </div>
      </div>
    </div>
  );
}

export default OperatingHoursModal;
