import { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import { todayInputValue } from '../utils/date';

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
  const option = FREQUENCY_OPTIONS.find((item) => item.value === days);
  return option ? option.label : `каждые ${days} дн.`;
}

/**
 * Модальное окно привязки работы к оборудованию с датой старта.
 */
function EquipmentWorkModal({
  mode,
  link,
  works,
  assignedIds,
  onSave,
  onClose,
}) {
  const isEdit = mode === 'edit';
  const availableWorks = isEdit
    ? works
    : works.filter((work) => !assignedIds.includes(work.id));

  const [workId, setWorkId] = useState(link?.workId || availableWorks[0]?.id || '');
  const [startDate, setStartDate] = useState(link?.startDate || todayInputValue());
  const [error, setError] = useState('');

  const selectedWork = works.find((work) => work.id === workId);

  const handleSave = () => {
    if (!workId) {
      setError('Выберите работу');
      return;
    }
    if (!startDate) {
      setError('Укажите дату старта');
      return;
    }
    onSave({ workId, startDate });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3><Wrench size={18} /> Работа</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label>Работа</label>
            {isEdit ? (
              <input type="text" value={selectedWork?.name || '—'} readOnly />
            ) : (
              <CustomSelect
                value={workId}
                onChange={setWorkId}
                options={availableWorks.map((work) => ({
                  value: work.id,
                  label: work.name,
                  searchText: work.description || '',
                }))}
                placeholder="Выберите работу"
                searchable
                searchPlaceholder="Поиск работы..."
              />
            )}
          </div>

          <div className="form-group">
            <label>Периодичность</label>
            <input
              type="text"
              value={selectedWork ? getFrequencyLabel(selectedWork.frequencyDays) : '—'}
              readOnly
            />
          </div>

          <div className="form-group">
            <label>Дата старта</label>
            <CustomDatePicker
              value={startDate}
              onChange={setStartDate}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>Отмена</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EquipmentWorkModal;
