/**
 * @fileoverview Страница справочника сотрудников.
 * Управление карточками сотрудников: добавление, редактирование,
 * удаление, поиск по ФИО и фильтрация по должности.
 */

import { useState, useEffect, useMemo } from 'react';
import { Users, Copy, Pencil, Trash2 } from 'lucide-react';
import { employeesAPI, jobPositionsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { SkeletonTable } from '../components/Skeleton';
import {
  MobileDataCards,
  MobileDataCard,
  MobileDataCardTitle,
  MobileDataCardRow,
  MobileDataCardActions,
} from '../components/MobileDataCard';
import ActionsMenu from '../components/ActionsMenu';
import CustomSelect from '../components/CustomSelect';

/** Компонент справочника сотрудников */
function EmployeesDirectory() {
  const [employees, setEmployees] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    jobPositionId: '',
    phone: '',
    email: ''
  });
  const toast = useToast();
  const confirm = useConfirm();

  /** Загрузка списка сотрудников при монтировании */
  useEffect(() => {
    fetchEmployees();
    fetchJobPositions();
  }, []);

  /** Загрузка списка сотрудников с сервера */
  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      setLoading(false);
    } catch { toast.error('Ошибка загрузки'); setLoading(false); }
  };

  const fetchJobPositions = async () => {
    try { const response = await jobPositionsAPI.getCatalog(); setJobPositions(response.data); }
    catch { toast.error('Не удалось загрузить справочник должностей'); }
  };

  /** Фильтрация сотрудников по поиску */
  const filtered = useMemo(() => {
    let result = [...employees];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e =>
        e.lastName.toLowerCase().includes(s) ||
        e.firstName.toLowerCase().includes(s) ||
        (e.jobTitle && e.jobTitle.toLowerCase().includes(s))
      );
    }
    return result;
  }, [employees, search]);

  /** Сброс формы сотрудника */
  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', middleName: '', jobPositionId: '', phone: '', email: '' });
    setEditId(null);
    setShowForm(false);
  };

  /** Открытие формы редактирования сотрудника */
  const handleEdit = (emp) => {
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      middleName: emp.middleName || '',
      jobPositionId: emp.jobPositionId || '',
      phone: emp.phone || '',
      email: emp.email || ''
    });
    setEditId(emp.id);
    setShowForm(true);
  };

  /** Дублирование сотрудника */
  const handleDuplicate = (emp) => {
    setFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName + ' (копия)',
      middleName: emp.middleName || '',
      jobPositionId: emp.jobPositionId || '',
      phone: emp.phone || '',
      email: emp.email || ''
    });
    setEditId(null);
    setShowForm(true);
  };

  /** Обработка отправки формы (создание/обновление сотрудника) */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      setError('Введите фамилию и имя');
      return;
    }
    try {
      const data = { ...formData };
      if (editId) {
        await employeesAPI.update(editId, data);
        toast.success('Сотрудник обновлён');
      } else {
        await employeesAPI.create(data);
        toast.success('Сотрудник добавлен');
      }
      resetForm();
      fetchEmployees();
    } catch { toast.error('Ошибка сохранения'); }
  };

  /** Удаление сотрудника с подтверждением */
  const handleDelete = async (delId) => {
    if (await confirm({ title: 'Удалить сотрудника?', message: 'Это действие нельзя отменить.', type: 'danger' })) {
      try { await employeesAPI.delete(delId); fetchEmployees(); }
      catch { toast.error('Ошибка удаления'); }
    }
  };

  if (loading) return <SkeletonTable rows={6} cols={5} />;

  const isListEmpty = employees.length === 0 && !search;
  const openAddForm = () => { resetForm(); setShowForm(true); };

  return (
    <div className="directory-page">
      <PageHeader icon={Users} title="Справочник сотрудников">
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
          {showForm ? 'Закрыть' : '+ Добавить сотрудника'}
        </button>
      </PageHeader>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="directory-form-card">
          <h3>{editId ? 'Редактирование сотрудника' : 'Новый сотрудник'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Фамилия *</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Имя *</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Отчество</label>
                <input type="text" value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Должность</label>
                <CustomSelect value={formData.jobPositionId} onChange={(jobPositionId) => setFormData({ ...formData, jobPositionId })} options={jobPositions.map((position) => ({ value: position.id, label: position.name }))} placeholder="Выберите должность" />
              </div>
              <div className="form-group">
                <label>Телефон</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="form-actions-inline">
              <button type="submit" className="btn btn-primary">{editId ? 'Обновить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} className="btn">Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Панель фильтров по ФИО и должности */}
      <div className="filters-panel">
        <div className="filter-row">
          <input type="text" placeholder="Поиск по ФИО, должности..." value={search} onChange={(e) => setSearch(e.target.value)} className="filter-search" />
        </div>
        <div className="filter-summary">Найдено: <strong>{filtered.length}</strong> из {employees.length}</div>
      </div>

      {/* Таблица сотрудников */}
      <div className="table-container desktop-table-only">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Должность</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {isListEmpty ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon={Users}
                      title="Сотрудники ещё не добавлены"
                      description="Добавьте первого сотрудника, чтобы назначать ответственных за помещения и работы."
                      actionLabel="+ Добавить сотрудника"
                      onAction={openAddForm}
                    />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="no-results-cell">Сотрудники не найдены</td></tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id}>
                    <td className="td-bold">{emp.lastName} {emp.firstName} {emp.middleName}</td>
                    <td>{emp.jobTitle || '—'}</td>
                    <td>{emp.phone || '—'}</td>
                    <td>{emp.email || '—'}</td>
                    <td>
                      <ActionsMenu items={[
                        { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(emp) },
                        { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(emp) },
                        { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(emp.id), danger: true },
                      ]} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MobileDataCards empty={filtered.length === 0} emptyMessage="Сотрудники не найдены">
        {filtered.map(emp => (
          <MobileDataCard key={emp.id}>
            <MobileDataCardTitle>{emp.lastName} {emp.firstName} {emp.middleName}</MobileDataCardTitle>
            <MobileDataCardRow label="Должность">{emp.jobTitle || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Телефон">{emp.phone || '—'}</MobileDataCardRow>
            <MobileDataCardRow label="Email">{emp.email || '—'}</MobileDataCardRow>
            <MobileDataCardActions>
              <ActionsMenu items={[
                { icon: <Copy size={14} />, label: 'Дублировать', onClick: () => handleDuplicate(emp) },
                { icon: <Pencil size={14} />, label: 'Изменить', onClick: () => handleEdit(emp) },
                { icon: <Trash2 size={14} />, label: 'Удалить', onClick: () => handleDelete(emp.id), danger: true },
              ]} />
            </MobileDataCardActions>
          </MobileDataCard>
        ))}
      </MobileDataCards>
    </div>
  );
}

export default EmployeesDirectory;
