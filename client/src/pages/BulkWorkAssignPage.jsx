/**
 * @module BulkWorkAssignPage
 * @description Массовое назначение плановой работы на оборудование по фильтрам.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import EmptyState from '../components/EmptyState';
import { todayInputValue } from '../utils/date';

const STATUS_OPTIONS = [
  { value: 'working', label: 'Работает' },
  { value: 'under_repair', label: 'В ремонте' },
  { value: 'needs_repair', label: 'Требует ремонта' },
  { value: 'reserve', label: 'Резерв' },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label]));

function isEquipmentSelectable(item, updateExisting) {
  return updateExisting || !item.hasWork;
}

function getDefaultSelectedIds(equipment, updateExisting) {
  return new Set(
    equipment
      .filter((item) => isEquipmentSelectable(item, updateExisting))
      .map((item) => item.id),
  );
}

function BulkWorkAssignPage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { canEdit } = useAuth();
  const selectAllRef = useRef(null);

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
  const [selectedIds, setSelectedIds] = useState(new Set());

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

  useEffect(() => {
    if (!preview?.equipment) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(getDefaultSelectedIds(preview.equipment, updateExisting));
  }, [preview, updateExisting]);

  const selectableItems = useMemo(
    () => (preview?.equipment || []).filter((item) => isEquipmentSelectable(item, updateExisting)),
    [preview, updateExisting],
  );

  const allSelectableSelected = selectableItems.length > 0
    && selectableItems.every((item) => selectedIds.has(item.id));

  const someSelectableSelected = selectableItems.some((item) => selectedIds.has(item.id));

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelectableSelected && !allSelectableSelected;
    }
  }, [someSelectableSelected, allSelectableSelected]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const assignCount = selectedIds.size;

  const canAssign = Boolean(
    canEditEquipment
    && preview
    && !previewLoading
    && assignCount > 0,
  );

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableItems.map((item) => item.id)));
  };

  const toggleRowSelection = (item) => {
    if (!isEquipmentSelectable(item, updateExisting)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!workId || !startDate) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (!preview || assignCount === 0) {
      toast.error('Выберите оборудование для назначения');
      return;
    }

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
        equipmentIds: [...selectedIds],
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
        <Link to="/works" className="btn btn-secondary btn-small">
          <ArrowLeft size={16} /> К справочнику
        </Link>
        {canEditEquipment && (
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={handleAssign}
            disabled={saving || !canAssign}
          >
            {saving ? 'Назначение...' : `Назначить${assignCount > 0 ? ` (${assignCount})` : ''}`}
          </button>
        )}
      </PageHeader>

      <div className="bulk-assign-layout">
        <aside className="filters-panel bulk-assign-sidebar">
          <h3 className="bulk-assign-sidebar-title">
            <Filter size={16} /> Параметры и фильтры
          </h3>

          <div className="form-group">
            <label>Работа *</label>
            <CustomSelect
              value={workId}
              onChange={setWorkId}
              options={works.map((work) => ({ value: work.id, label: work.name, searchText: work.description || '' }))}
              searchable
              searchPlaceholder="Поиск работы..."
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

          <label className="checkbox-label-inline bulk-assign-checkbox">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(event) => setUpdateExisting(event.target.checked)}
            />
            <span className="checkbox-text">
              <span className="checkbox-text-main">Обновить дату у уже назначенных</span>
            </span>
          </label>

          <div className="bulk-assign-filters-divider" />

          <div className="bulk-assign-filters-grid">
            <div className="form-group">
              <label>Категория</label>
              <CustomSelect
                value={filters.categoryId}
                onChange={(value) => handleFilterChange('categoryId', value)}
                placeholder="Все"
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
                placeholder="Все"
                options={rooms.map((room) => ({ value: room.id, label: room.name }))}
              />
            </div>
            <div className="form-group">
              <label>Площадка</label>
              <CustomSelect
                value={filters.building}
                onChange={(value) => handleFilterChange('building', value)}
                placeholder="Все"
                options={buildings.map((building) => ({ value: building, label: building }))}
              />
            </div>
            <div className="form-group">
              <label>Состояние</label>
              <CustomSelect
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                placeholder="Все"
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          <div className="form-group bulk-assign-search">
            <label>Поиск</label>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              placeholder="Название или инв. номер..."
              className="filter-search"
            />
          </div>
        </aside>

        <section className="bulk-assign-main">
          <div className="bulk-assign-stats-bar">
            {previewLoading ? (
              <span className="bulk-assign-stats-loading">Обновление списка...</span>
            ) : preview ? (
              <>
                <span className="bulk-stat bulk-stat-total">
                  <strong>{preview.totalMatching}</strong>
                  {' '}
                  {preview.totalMatching === 1 ? 'объект' : preview.totalMatching < 5 ? 'объекта' : 'объектов'}
                </span>
                <span className="bulk-stat bulk-stat-selected">
                  <strong>{selectedIds.size}</strong> выбрано
                </span>
                <span className="bulk-stat bulk-stat-new">
                  <strong>{preview.toAssign}</strong> новых
                </span>
                <span className="bulk-stat">
                  <strong>{preview.alreadyAssigned}</strong> уже назначено
                </span>
              </>
            ) : (
              <span className="bulk-stat bulk-stat-muted">Выберите работу для превью</span>
            )}
          </div>

          <div className="table-container bulk-assign-table">
            {previewLoading ? (
              <div className="bulk-assign-table-skeleton">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="bulk-assign-row-skeleton skeleton" />
                ))}
              </div>
            ) : preview && preview.equipment.length > 0 ? (
              <div className="table-scroll">
                <table className="data-table data-table-compact bulk-assign-equipment-table">
                  <thead>
                    <tr>
                      <th className="bulk-assign-check-col">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelectableSelected}
                          onChange={toggleSelectAll}
                          disabled={selectableItems.length === 0}
                          aria-label="Выбрать всё доступное оборудование"
                        />
                      </th>
                      <th>Оборудование</th>
                      <th>Инв. №</th>
                      <th>Помещение</th>
                      <th>Категория</th>
                      <th>Состояние</th>
                      <th>Работа</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.equipment.map((item) => {
                      const selectable = isEquipmentSelectable(item, updateExisting);
                      const isSelected = selectedIds.has(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={[
                            isSelected ? 'bulk-assign-row-selected' : '',
                            !selectable ? 'bulk-assign-row-disabled' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <td className="bulk-assign-check-col">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!selectable}
                              onChange={() => toggleRowSelection(item)}
                              aria-label={`Выбрать ${item.name}`}
                            />
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Wrench}
                title="Оборудование не найдено"
                description="Измените фильтры или выберите другую работу."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default BulkWorkAssignPage;
