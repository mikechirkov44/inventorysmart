/**
 * @fileoverview Страница результата сканирования QR-кода оборудования.
 * Отображает информацию об оборудовании и список плановых работ на сегодня,
 * позволяет отмечать выполненные работы и списывать ЗИП.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { scanAPI, employeesAPI } from '../services/api';
import ReportFailureModal from '../components/ReportFailureModal';
import CustomSelect from '../components/CustomSelect';

/** Варианты периодичности работ для отображения */
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

/** Получение текстовой подписи периодичности по количеству дней */
function getFrequencyLabel(days) {
  const opt = FREQUENCY_OPTIONS.find(o => o.value === days);
  return opt ? opt.label : `каждые ${days} дн.`;
}

/** Компонент страницы результата сканирования QR-кода */
function ScanResult() {
  const { qrCode } = useParams();
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executorId, setExecutorId] = useState('');
  const [checkedTasks, setCheckedTasks] = useState({});
  const [taskComments, setTaskComments] = useState({});
  const [taskSpareParts, setTaskSpareParts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showFailureModal, setShowFailureModal] = useState(false);

  /** Загрузка данных оборудования и сотрудников при сканировании */
  useEffect(() => { fetchData(); }, [qrCode]);

  /** Загрузка информации об оборудовании по QR-коду */
  const fetchData = async () => {
    try {
      const [scanRes, empRes] = await Promise.all([
        scanAPI.scanQR(qrCode),
        employeesAPI.getAll()
      ]);
      setData(scanRes.data);
      setEmployees(empRes.data);

      const resp = scanRes.data.responsibleEmployee;
      if (resp) setExecutorId(resp.id);

      setLoading(false);
    } catch {
      setError('Оборудование не найдено');
      setLoading(false);
    }
  };

  /** Форматирование даты в российском формате */
  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU');
  };

  /** Переключение отметки выполнения работы с загрузкой ЗИП */
  const handleCheck = (workId) => {
    setCheckedTasks(prev => ({ ...prev, [workId]: !prev[workId] }));
    if (!checkedTasks[workId] && data) {
      const task = [...(data.dueTasks || []), ...(data.notDueTasks || [])].find(t => t.workId === workId);
      if (task && task.spareParts && task.spareParts.length > 0) {
        setTaskSpareParts(prev => ({
          ...prev,
          [workId]: task.spareParts.map(sp => ({
            sparePartId: sp.sparePartId,
            name: sp.name,
            unit: sp.unit,
            quantity: sp.defaultQuantity || 0,
            inStock: sp.inStock
          }))
        }));
      }
    }
  };

  /** Обновление количества списываемой ЗИП для работы */
  const updateTaskSparePartQty = (workId, sparePartId, qty) => {
    setTaskSpareParts(prev => ({
      ...prev,
      [workId]: (prev[workId] || []).map(sp =>
        sp.sparePartId === sparePartId ? { ...sp, quantity: parseInt(qty) || 0 } : sp
      )
    }));
  };

  /** Добавление комментария к выполненной работе */
  const handleComment = (workId, text) => {
    setTaskComments(prev => ({ ...prev, [workId]: text }));
  };

  /** Отправка выполненных работ на сервер */
  const handleSubmit = async () => {
    const emp = employees.find(e => e.id === executorId);
    const execName = emp ? `${emp.lastName} ${emp.firstName}` : '';

    if (!execName) {
      setError('Выберите кто выполнил работы');
      return;
    }

    const toSubmit = Object.keys(checkedTasks).filter(id => checkedTasks[id]);
    if (toSubmit.length === 0) {
      setError('Отметьте хотя бы одну выполненную работу');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      for (const workId of toSubmit) {
        const spUsed = (taskSpareParts[workId] || [])
          .filter(sp => sp.quantity > 0)
          .map(sp => ({ sparePartId: sp.sparePartId, quantity: sp.quantity }));

        await scanAPI.completeTask({
          equipmentId: data.equipment.id,
          workId,
          masterName: execName,
          notes: taskComments[workId] || '',
          sparePartsUsed: spUsed,
        });
      }

      setSuccessMessage(`Выполнено работ: ${toSubmit.length}`);
      setCheckedTasks({});
      setTaskComments({});
      setTaskSpareParts({});
      fetchData();

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-spinner">Загрузка...</div>;
  if (error && !data) return <div className="error">{error}</div>;
  if (!data) return <div className="error">Данные не найдены</div>;

  const { equipment, room, responsibleEmployee, dueTasks, notDueTasks } = data;

  return (
    <div className="scan-result">
      <div className="scan-header">
        <Link to="/scan" className="back-link">← Назад к сканеру</Link>
        <h1>Работы на сегодня</h1>
      </div>

      {successMessage && <div className="success">{successMessage}</div>}
      {error && <div className="error">{error}</div>}

      {/* Карточка информации об оборудовании */}
      <div className="equipment-info-card">
        <div className="equipment-photo">
          {equipment.photo
            ? <img src={`/uploads/${equipment.photo}`} alt={equipment.name} />
            : <div className="no-photo">Нет фото</div>}
        </div>
        <div className="equipment-details">
          <h2>{equipment.name}</h2>
          <p><strong>Инв. номер:</strong> {equipment.inventoryNumber}</p>
          <p><strong>Помещение:</strong> {room ? `${room.name}${room.building ? ` (${room.building})` : ''}` : '—'}</p>
          {responsibleEmployee && (
            <p><strong>Ответственный:</strong> {responsibleEmployee.lastName} {responsibleEmployee.firstName} {responsibleEmployee.middleName || ''}</p>
          )}
        </div>
      </div>

      {/* Список работ, требующих выполнения сегодня */}
      {dueTasks.length > 0 && (
        <div className="today-tasks-section">
          <h3>Требуют выполнения ({dueTasks.length})</h3>

          <div className="master-input-row">
            <label>Работы выполнил: </label>
            <CustomSelect value={executorId} onChange={setExecutorId} placeholder="— Выберите сотрудника —" options={[
              { value: '', label: '— Выберите сотрудника —' },
              ...employees.map(emp => ({ value: emp.id, label: `${emp.lastName} ${emp.firstName} ${emp.middleName || ''}${emp.jobTitle ? ` (${emp.jobTitle})` : ''}` }))
            ]} />
          </div>

          <div className="today-task-list">
            {dueTasks.map(task => (
              <div key={task.workId} className={`today-task-card ${checkedTasks[task.workId] ? 'checked' : ''}`}>
                <label className="today-task-check">
                  <input
                    type="checkbox"
                    checked={!!checkedTasks[task.workId]}
                    onChange={() => handleCheck(task.workId)}
                  />
                </label>
                <div className="today-task-body">
                  <div className="today-task-header">
                    <span className="today-task-name">{task.name}</span>
                    <span className={`overdue-badge ${task.isOverdue && task.lastCompleted ? 'overdue' : 'new'}`}>
                      {task.lastCompleted ? getFrequencyLabel(task.frequencyDays) : 'никогда не выполнялось'}
                    </span>
                  </div>
                  {task.description && <p className="today-task-desc">{task.description}</p>}
                  <div className="today-task-dates">
                    {task.lastCompleted && <span>Последнее: {formatDate(task.lastCompleted)}</span>}
                    {task.nextDue && <span>Следующее: {formatDate(task.nextDue)}</span>}
                  </div>
                  {checkedTasks[task.workId] && (
                    <>
                      <input
                        type="text"
                        className="task-comment-input"
                        value={taskComments[task.workId] || ''}
                        onChange={(e) => handleComment(task.workId, e.target.value)}
                        placeholder="Комментарий к выполнению (необязательно)"
                      />
                      {task.spareParts && task.spareParts.length > 0 && (
                        <div className="task-spare-parts-section">
                          <div className="wo-complete-title">Списание ЗИП:</div>
                          <div className="wo-sp-select-list">
                            {(taskSpareParts[task.workId] || task.spareParts.map(sp => ({
                              sparePartId: sp.sparePartId,
                              name: sp.name,
                              unit: sp.unit,
                              quantity: sp.defaultQuantity || 0,
                              inStock: sp.inStock
                            }))).map(sp => (
                              <div key={sp.sparePartId} className="wo-sp-select-item">
                                <span className="wo-sp-select-name">{sp.name} ({sp.unit})</span>
                                <span className="wo-sp-select-stock">на складе: {sp.inStock}</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={sp.inStock}
                                  value={sp.quantity}
                                  onChange={(e) => updateTaskSparePartQty(task.workId, sp.sparePartId, e.target.value)}
                                  className="wo-sp-input"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="submit-row">
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-lg"
              disabled={submitting}
            >
              {submitting ? 'Сохранение...' : `Зафиксировать выполнение (${Object.keys(checkedTasks).filter(k => checkedTasks[k]).length})`}
            </button>
          </div>
        </div>
      )}

      {dueTasks.length === 0 && notDueTasks.length > 0 && (
        <div className="today-tasks-section">
          <h3>Работы на сегодня</h3>
          <div className="no-pending-tasks">
            <p>Все работы выполнены в срок. Проверьте следующую дату:</p>
            {notDueTasks.map(task => (
              <div key={task.workId} className="today-task-card done">
                <div className="today-task-body">
                  <span className="today-task-name">{task.name}</span>
                  <span className="overdue-badge ok">след. {formatDate(task.nextDue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dueTasks.length === 0 && notDueTasks.length === 0 && (
        <div className="today-tasks-section">
          <h3>Плановые работы</h3>
          <div className="no-pending-tasks">
            <p>Нет привязанных плановых работ. Добавьте их в карточке оборудования.</p>
          </div>
        </div>
      )}

      <div className="equipment-link">
        <button onClick={() => setShowFailureModal(true)} className="btn btn-danger">
          ⚠ Сообщить о поломке
        </button>
        <Link to={`/equipment/${equipment.id}`} className="btn">Полная карточка оборудования</Link>
      </div>

      {showFailureModal && (
        <ReportFailureModal
          equipment={equipment}
          onClose={() => setShowFailureModal(false)}
          onSuccess={() => { setShowFailureModal(false); setSuccessMessage('Инцидент отправлен'); setTimeout(() => setSuccessMessage(''), 4000); }}
        />
      )}
    </div>
  );
}

export default ScanResult;
