import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workOrderAPI, equipmentAPI } from '../services/api';

function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workOrdersRes, equipmentRes] = await Promise.all([
        workOrderAPI.getAll(),
        equipmentAPI.getAll()
      ]);
      setWorkOrders(workOrdersRes.data);
      setEquipment(equipmentRes.data);
      setLoading(false);
    } catch (err) {
      setError('Ошибка загрузки данных');
      setLoading(false);
    }
  };

  const getEquipmentName = (equipmentId) => {
    const equip = equipment.find(e => e.id === equipmentId);
    return equip ? equip.name : 'Неизвестное оборудование';
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    if (filter === 'all') return true;
    return wo.status === filter;
  });

  const handleStatusChange = async (id, newStatus) => {
    try {
      await workOrderAPI.update(id, { status: newStatus });
      fetchData();
    } catch (err) {
      setError('Ошибка обновления статуса');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      try {
        await workOrderAPI.delete(id);
        fetchData();
      } catch (err) {
        setError('Ошибка удаления');
      }
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="work-orders">
      <div className="header">
        <h1>Журнал работ</h1>
        <div className="filter-buttons">
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все ({workOrders.length})
          </button>
          <button
            className={`btn ${filter === 'pending' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('pending')}
          >
            В ожидании ({workOrders.filter(wo => wo.status === 'pending').length})
          </button>
          <button
            className={`btn ${filter === 'completed' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Выполнены ({workOrders.filter(wo => wo.status === 'completed').length})
          </button>
        </div>
      </div>

      <div className="work-orders-list">
        {filteredWorkOrders.length === 0 ? (
          <div className="no-results">Записей не найдено</div>
        ) : (
          filteredWorkOrders.map(wo => (
            <div key={wo.id} className={`work-order-card ${wo.status}`}>
              <div className="wo-main">
                <div className="wo-equipment">
                  <Link to={`/equipment/${wo.equipmentId}`}>
                    {getEquipmentName(wo.equipmentId)}
                  </Link>
                </div>
                <div className="wo-task">{wo.taskName}</div>
                <div className="wo-master">{wo.masterName}</div>
                <div className="wo-date">
                  {new Date(wo.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="wo-notes">{wo.notes}</div>
              <div className="wo-actions">
                <select
                  value={wo.status}
                  onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                  className="status-select"
                >
                  <option value="pending">В ожидании</option>
                  <option value="completed">Выполнено</option>
                  <option value="failed">Не выполнено</option>
                </select>
                <button
                  onClick={() => handleDelete(wo.id)}
                  className="btn btn-small btn-danger"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default WorkOrders;
