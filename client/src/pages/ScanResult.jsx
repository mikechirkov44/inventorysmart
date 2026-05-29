import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { scanAPI, employeesAPI } from '../services/api';
import ReportFailureModal from '../components/ReportFailureModal';

function ScanResult() {
  const { qrCode } = useParams();
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executorId, setExecutorId] = useState('');
  const [checkedTasks, setCheckedTasks] = useState({});
  const [taskComments, setTaskComments] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showFailureModal, setShowFailureModal] = useState(false);

  useEffect(() => { fetchData(); }, [qrCode]);

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

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU');
  };

  const handleCheck = (workId) => {
    setCheckedTasks(prev => ({ ...prev, [workId]: !prev[workId] }));
  };

  const handleComment = (workId, text) => {
    setTaskComments(prev => ({ ...prev, [workId]: text }));
  };

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
        await scanAPI.completeTask({
          equipmentId: data.equipment.id,
          workId,
          masterName: execName,
          notes: taskComments[workId] || '',
        });
      }

      setSuccessMessage(`Выполнено работ: ${toSubmit.length}`);
      setCheckedTasks({});
      setTaskComments({});
      fetchData();

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
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

      {dueTasks.length > 0 && (
        <div className="today-tasks-section">
          <h3>Требуют выполнения ({dueTasks.length})</h3>

          <div className="master-input-row">
            <label>Работы выполнил: </label>
            <select value={executorId} onChange={(e) => setExecutorId(e.target.value)}>
              <option value="">— Выберите сотрудника —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.lastName} {emp.firstName} {emp.middleName || ''}{emp.position ? ` (${emp.position})` : ''}
                </option>
              ))}
            </select>
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
                      {task.lastCompleted ? `каждые ${task.frequencyDays} дн.` : 'никогда не выполнялось'}
                    </span>
                  </div>
                  {task.description && <p className="today-task-desc">{task.description}</p>}
                  <div className="today-task-dates">
                    {task.lastCompleted && <span>Последнее: {formatDate(task.lastCompleted)}</span>}
                    {task.nextDue && <span>Следующее: {formatDate(task.nextDue)}</span>}
                  </div>
                  {checkedTasks[task.workId] && (
                    <input
                      type="text"
                      className="task-comment-input"
                      value={taskComments[task.workId] || ''}
                      onChange={(e) => handleComment(task.workId, e.target.value)}
                      placeholder="Комментарий к выполнению (необязательно)"
                    />
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
