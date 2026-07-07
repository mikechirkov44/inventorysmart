/**
 * @module BulkWorkAssignPage
 * @description Массовое назначение плановой работы на оборудование по фильтрам.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Wrench, Filter, ArrowLeft } from 'lucide-react';
import { worksAPI, roomsAPI, equipmentCategoriesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import FrequencyBadge from '../components/FrequencyBadge';
import { todayInputValue } from '../utils/date';

const STATUS_OPTIONS = [
  { value: 'working', label: 'Работает' },
  { value: 'under_repair', label: 'В ремонте' },
  { value: 'needs_repair', label: 'Требует ремонта' },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label]));

function BulkWorkAssignPage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { canEdit } = useAuth();

  const [works, setWorks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [workId, setWorkId] = useState(searchParams.get('workId') || '');
  const [startDate, setStartDate] = useState(todayInputValue());
  const [updateExisting, setUpdateExisting] = useState(false);
  const [filters, setFilters] = useState({
    categoryId: '',
    roomId: '',
    building: '',
    status: '',
    search: '',
  });
  const [preview, setPreview] = useState(null);

  const canEditEquipment = canEdit('equipment');

  useEffect(() => {
    Promise.all([
      worksAPI.getAll(),
      roomsAPI.getAll(),
      equipmentCategoriesAPI.getAll(),
    ])
      .then(([worksRes, roomsRes, categoriesRes]) => {
        setWorks(worksRes.data);
        setRooms(roomsRes.data);
        setCategories(categoriesRes.data);
        if (!workId && worksRes.data.length > 0) {
          setWorkId(worksRes.data[0].id);
        }
      })
      .catch(() => toast.error('Ошибка загрузки данных'))
      .finally(() => setLoadingMeta(false));
  }, []);

  const buildings = useMemo(() => (
    [...new Set(rooms.map((room) => room.building).filter(Boolean))].sort()
  ), [rooms]);

  const selectedWork = useMemo(
    () => works.find((work) => work.id === workId) || null,
    [works, workId],
  );

  const loadPreview = useCallback(async () => {
    if (!workId) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const response = await worksAPI.previewBulkAssign({ workId, filters });
      setPreview(response.data);
    } catch {
      toast.error('Не удалось загрузить превью');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [workId, filters, toast]);

  useEffect(() => {
    const timer = setTimeout(loadPreview, 300);
    return () => clearTimeout(timer);
  }, [loadPreview]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssign = async () => {
    if (!workId || !startDate) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (!preview || preview.toAssign === 0) {
      toast.error('Нет оборудования для назначения');
      return;
    }

    const assignCount = updateExisting ? preview.totalMatching : preview.toAssign;
    const confirmed = await confirm({
      title: 'Назначить работу?',
      message: `Работа «${selectedWork?.name || ''}» будет назначена на ${assignCount} ед. оборудования.`,
      confirmText: 'Назначить',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const response = await worksAPI.bulkAssign({
        workId,
        startDate,
        filters,
        updateExisting,
      });
      toast.success(
        'Готово',
        `Назначено: ${response.data.assigned}, пропущено: ${response.data.skipped}`,
      );
      loadPreview();
    } catch {
      toast.error('Ошибка назначения');
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta) {
    return <div className="loading-spinner">Загрузка...</div>;
  }

  return (
    <div className="directory-page bulk-assign-page">
      <PageHeader icon={Wrench} title="Массовое назначение работ">
        <Link to="/works" className="btn btn-secondary">
          <ArrowLeft size={16} /> К справочнику
        </Link>
      </PageHeader>

      <div className="bulk-assign-layout">
        <div className="bulk-assign-form">
          <div className="directory-form-card">
            <h3><Filter size={18} /> Параметры назначения</h3>

            <div className="form-group">
              <label>Работа *</label>
              <CustomSelect
                value={workId}
                onChange={setWorkId}
                options={works.map((work) => ({ value: work.id, label: work.name }))}
              />
              {selectedWork && (
                <div className="bulk-assign-work-meta">
                  <FrequencyBadge days={selectedWork.frequencyDays} />
                  <span className={`priority-badge priority-${(selectedWork.priority || 'B').toLowerCase()}`}>
                    {selectedWork.priority || 'B'}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Дата старта *</label>
              <CustomDatePicker value={startDate} onChange={setStartDate} />
            </div>

            <label className="checkbox-label bulk-assign-checkbox">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(event) => setUpdateExisting(event.target.checked)}
              />
              Обновить дату старта у уже назначенных
            </label>
          </div>

          <div className="directory-form-card">
            <h3>Фильтры оборудования</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Категория</label>
                <CustomSelect
                  value={filters.categoryId}
                  onChange={(value) => handleFilterChange('categoryId', value)}
                  placeholder="Все категории"
                  options={categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                />
              </div>
              <div className="form-group">
                <label>Помещение</label>
                <CustomSelect
                  value={filters.roomId}
                  onChange={(value) => handleFilterChange('roomId', value)}
                  placeholder="Все помещения"
                  options={rooms.map((room) => ({ value: room.id, label: room.name }))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Площадка / здание</label>
                <CustomSelect
                  value={filters.building}
                  onChange={(value) => handleFilterChange('building', value)}
                  placeholder="Все площадки"
                  options={buildings.map((building) => ({ value: building, label: building }))}
                />
              </div>
              <div className="form-group">
                <label>Состояние</label>
                <CustomSelect
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  placeholder="Любое"
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Поиск</label>
              <input
                type="text"
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
                placeholder="Название или инвентарный номер..."
              />
            </div>
          </div>

          {canEditEquipment && (
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleAssign}
              disabled={saving || previewLoading || !preview || (updateExisting ? preview.totalMatching === 0 : preview.toAssign === 0)}
            >
              {saving ? 'Назначение...' : 'Назначить работу'}
            </button>
          )}
        </div>

        <div className="bulk-assign-preview">
          <div className="bulk-assign-preview-card">
            <div className="bulk-assign-preview-title">Превью</div>
            {previewLoading ? (
              <div className="loading-spinner">Загрузка превью...</div>
            ) : preview ? (
              <>
                <div className="bulk-assign-preview-count">
                  <span className="bulk-assign-preview-number">{preview.totalMatching}</span>
                  <span className="bulk-assign-preview-label">
                    {preview.totalMatching === 1 ? 'объект' : preview.totalMatching < 5 ? 'объекта' : 'объектов'}
                    {' '}по фильтрам
                  </span>
                </div>
                <div className="summary-cards-inline">
                  <div className="summary-card primary">
                    <div className="summary-value">{preview.toAssign}</div>
                    <div className="summary-label">Новых назначений</div>
                  </div>
                  <div className="summary-card muted">
                    <div className="summary-value">{preview.alreadyAssigned}</div>
                    <div className="summary-label">Уже назначено</div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted">Выберите работу для превью</p>
            )}
          </div>

          {preview && preview.equipment.length > 0 && (
            <div className="table-container">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Оборудование</th>
                      <th>Инв. номер</th>
                      <th>Помещение</th>
                      <th>Категория</th>
                      <th>Статус</th>
                      <th>Работа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.equipment.map((item) => (
                      <tr key={item.id}>
                        <td className="td-bold">{item.name}</td>
                        <td>{item.inventoryNumber || '—'}</td>
                        <td>{item.roomName || '—'}</td>
                        <td>{item.categoryName || '—'}</td>
                        <td>{STATUS_LABELS[item.status] || item.status || '—'}</td>
                        <td>
                          {item.hasWork ? (
                            <span className="status-badge status-working">Назначена</span>
                          ) : (
                            <span className="status-badge status-under-repair">Новая</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.truncated && (
                <p className="filter-summary">Показаны первые 100 из {preview.totalMatching} единиц</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BulkWorkAssignPage;
