import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, User, Settings, Wrench } from 'lucide-react';
import { operatingHoursAPI, employeesAPI, worksAPI } from '../services/api';
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
  const [works, setWorks] = useState([]);
  const [formData, setFormData] = useState({
    unit: 'Моточасы (м/ч)',
    currentValue: 0,
    assignedTo: '',
    workIds: [],
    autoCreateTasks: true,
    preventDecrease: true,
    intervals: []
  });
  const [newInterval, setNewInterval] = useState({ value: '', description: '' });
  const toast = useToast();

  // Load existing data, employees and works
  useEffect(() => {
    const loadData = async () => {
      try {
        const [ohRes, empRes, worksRes] = await Promise.all([
          operatingHoursAPI.getByEquipmentId(equipmentId),
          employeesAPI.getAll(),
          worksAPI.getAll()
        ]);

        setEmployees(empRes.data || []);
        setWorks(worksRes.data || []);

        if (ohRes.data?.data) {
          const data = ohRes.data.data;
          setFormData({
            unit: data.unit || 'Моточасы (м/ч)',
            currentValue: data.currentValue || 0,
            assignedTo: data.assignedTo || '',
            workIds: data.workIds || [],
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
        assignedTo: formData.assignedTo || null,
        workIds: formData.workIds || [],
        autoCreateTasks: formData.autoCreateTasks,
        preventDecrease: formData.preventDecrease
      });

      const operatingHoursId = ohRes.data.data.id;

      // Save intervals (delete and recreate for simplicity)
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
        id: Date.now().toString(),
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
        <div className="modal operating-hours-modal-compact" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3><Clock size={18} /> Наработка оборудования</h3>
            <button className="btn-icon" onClick={onClose}><X size={18} /></button>
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
      <div className="modal operating-hours-modal-compact" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Clock size={18} /> Наработка оборудования</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body compact">
          {/* Equipment name */}
          <div className="oh-equipment-name">{equipmentName}</div>

          {/* Two column layout */}
          <div className="oh-form-row">
            <div className="form-group">
              <label>Единица измерения</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Моточасы (м/ч)"
              />
            </div>
            <div className="form-group">
              <label>Текущее значение *</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          {/* Assigned to */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} />
              Кто проводит ТО
            </label>
            <CustomSelect
              value={formData.assignedTo}
              onChange={(value) => setFormData({ ...formData, assignedTo: value })}
              placeholder="Выберите сотрудника"
              options={employees.map(e => ({ 
                value: e.id, 
                label: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.jobTitle || 'Без имени'
              }))}
            />
          </div>

          {/* Maintenance intervals */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={14} />
              Периоды ТО
              <span className="badge">{formData.intervals.length}</span>
            </label>
            
            {formData.intervals.length > 0 && (
              <div className="oh-intervals-list">
                {formData.intervals.map((interval, index) => (
                  <div key={interval.id || index} className="interval-row compact">
                    <div className="interval-info">
                      <strong>Каждые {interval.intervalValue} {formData.unit}</strong>
                      {interval.description && (
                        <span className="interval-desc">{interval.description}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-icon btn-danger btn-sm"
                      onClick={() => handleDeleteInterval(index)}
                      title="Удалить"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-interval-row compact">
              <input
                type="number"
                min="1"
                step="1"
                value={newInterval.value}
                onChange={(e) => setNewInterval({ ...newInterval, value: e.target.value })}
                placeholder="Интервал"
                className="interval-input"
              />
              <input
                type="text"
                value={newInterval.description}
                onChange={(e) => setNewInterval({ ...newInterval, description: e.target.value })}
                placeholder="Описание (ТО-1)"
                className="interval-desc-input"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddInterval}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Works selection */}
          <div className="form-group oh-form-group-spaced" style={{ marginTop: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wrench size={14} />
              Работы при ТО
              <span className="badge">{formData.workIds?.length || 0}</span>
            </label>
            <div className="oh-works-list">
              {works.length === 0 ? (
                <span className="form-hint">Нет доступных работ</span>
              ) : (
                works.map(work => (
                  <label key={work.id} className="oh-work-item">
                    <input
                      type="checkbox"
                      checked={formData.workIds?.includes(work.id)}
                      onChange={(e) => {
                        const newWorkIds = e.target.checked
                          ? [...(formData.workIds || []), work.id]
                          : (formData.workIds || []).filter(id => id !== work.id);
                        setFormData({ ...formData, workIds: newWorkIds });
                      }}
                    />
                    <span>{work.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Settings - compact */}
          <div className="oh-settings-row">
            <div className="oh-setting-item">
              <Toggle
                label="Автозадачи"
                checked={formData.autoCreateTasks}
                onChange={(checked) => setFormData({ ...formData, autoCreateTasks: checked })}
              />
              <span className="oh-setting-hint">Создавать наряды при достижении интервала</span>
            </div>
            <div className="oh-setting-item">
              <Toggle
                label="Запрет уменьшения"
                checked={formData.preventDecrease}
                onChange={(checked) => setFormData({ ...formData, preventDecrease: checked })}
              />
              <span className="oh-setting-hint">Нельзя установить значение меньше текущего</span>
            </div>
          </div>
        </div>

        <div className="modal-footer compact">
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button className="btn" onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

export default OperatingHoursModal;
