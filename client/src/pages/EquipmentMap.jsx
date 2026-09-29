import { useCallback, useEffect, useReducer, useState } from 'react';
import { Building2, Edit3, Save } from 'lucide-react';
import { equipmentMapAPI, roomsAPI } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import EquipmentMapPreview from '../components/equipment-map/EquipmentMapPreview';
import MapToolbar from '../components/equipment-map/MapToolbar';
import MapCanvas from '../components/equipment-map/MapCanvas';
import MapLabelDialog from '../components/equipment-map/MapLabelDialog';
import MapRoomDialog from '../components/equipment-map/MapRoomDialog';
import UnplacedEquipmentPanel from '../components/equipment-map/UnplacedEquipmentPanel';
import { createMapId, editorReducer, initialEditorState, clamp, roomsOverlap, statusPresentation } from '../components/equipment-map/mapEditor';
import { useMachineStatuses } from '../components/monitoring/machineStatus';

export default function EquipmentMap({ onUnsavedChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || String(user?.positionName || '').trim().toLowerCase() === 'администратор';
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [floor, setFloor] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState('select');
  const [pendingLabel, setPendingLabel] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [namePrompt, setNamePrompt] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [placing, setPlacing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const [saving, setSaving] = useState(false);
  const [editor, dispatch] = useReducer(editorReducer, initialEditorState);
  const machineStatuses = useMachineStatuses();
  const activeBuilding = buildings.find(item => item.id === buildingId);
  const bounds = { width: floor?.canvasWidth || 1600, height: floor?.canvasHeight || 900 };
  const blocked = editor.dirty || saving;
  const selectedElement = editor.present.elements.find(item => item.id === selected?.id);
  const selectedEquipment = editor.present.placements.find(item => item.equipmentId === selected?.id);
  const selection = selectedElement || selectedEquipment;

  const refreshBuildings = useCallback(async (preferredBuilding, preferredFloor) => {
    const { data } = await equipmentMapAPI.getBuildings(); setBuildings(data);
    const building = data.find(item => item.id === preferredBuilding) || data[0];
    const nextFloor = building?.floors.find(item => item.id === preferredFloor) || building?.floors[0];
    setBuildingId(building?.id || ''); setFloorId(nextFloor?.id || '');
    if (!nextFloor) setLoading(false);
  }, []);
  useEffect(() => { refreshBuildings().catch(() => { setLoadError(true); setLoading(false); }); }, [refreshBuildings]);
  useEffect(() => { roomsAPI.getAll().then(({ data }) => setRooms(data)).catch(() => {}); }, [floorId]);
  useEffect(() => {
    let cancelled = false;
    setFloor(null); setSelected(null); setPreview(null); setPlacing(null); setPendingLabel(null); setTool('select');
    dispatch({ type: 'load' });
    if (!floorId) return undefined;
    setLoading(true); setLoadError(false);
    Promise.all([equipmentMapAPI.getFloor(floorId), equipmentMapAPI.getUnplaced('')]).then(([{ data }, { data: available }]) => {
      if (cancelled) return;
      setFloor(data);
      const elements = data.elements.map(item => item.type === 'room' ? { ...item, label: item.label || item.roomName || '' } : item);
      dispatch({ type: 'load', elements, placements: data.placements });
      setInventory([...new Map([...available, ...data.placements.map(item => item.equipment).filter(Boolean)].map(item => [item.id, item])).values()]);
      setSaveState('saved');
    }).catch(() => { if (!cancelled) setLoadError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [floorId, reload]);

  // The server's initial list is capped; search remotely, retaining locally removed items.
  useEffect(() => {
    if (!floorId || !search.trim()) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      equipmentMapAPI.getUnplaced(search.trim()).then(({ data }) => {
        if (!cancelled) setInventory(current => [...new Map([...current, ...data].map(item => [item.id, item])).values()]);
      }).catch(() => { if (!cancelled) toast.error('Ошибка поиска', 'Не удалось найти оборудование на сервере. Повторите поиск.'); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [floorId, search, toast]);

  // Serialize saves. An acknowledgement only clears the exact snapshot sent.
  useEffect(() => {
    if (!editor.dirty || !floor || saving || ['error', 'conflict'].includes(saveState)) return undefined;
    const snapshot = editor.present;
    const timer = setTimeout(async () => {
      setSaving(true); setSaveState('saving');
      try {
        const { data } = await equipmentMapAPI.saveLayout(floor.id, { version: floor.version, ...snapshot });
        setFloor(current => current?.id === floor.id ? { ...current, version: data.version } : current);
        dispatch({ type: 'saved', snapshot }); setSaveState('saved');
      } catch (error) {
        setSaveState(error.response?.status === 409 ? 'conflict' : 'error');
        toast.error('Карта не сохранена', error.response?.data?.error || 'Изменения остались на экране. Повторите сохранение.');
      } finally { setSaving(false); }
    }, 650);
    return () => clearTimeout(timer);
  }, [editor.dirty, editor.present, floor, saving, saveState, toast]);
  useEffect(() => {
    onUnsavedChange?.(blocked);
    return () => onUnsavedChange?.(false);
  }, [blocked, onUnsavedChange]);
  useEffect(() => {
    if (!blocked) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    const protectLink = event => {
      const link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault(); event.stopPropagation();
      toast.info('Карта ещё не сохранена', 'Дождитесь сохранения или повторите его при ошибке.');
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', protectLink, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', protectLink, true); };
  }, [blocked, toast]);

  const changeTool = next => { setTool(next); setPlacing(null); };
  const deleteSelected = () => {
    if (!selection || !editing) return;
    dispatch(selectedElement ? { type: 'deleteElement', id: selection.id } : { type: 'removePlacement', equipmentId: selection.equipmentId });
    setSelected(null); changeTool('select');
  };
  const placeEquipment = (id, point) => {
    const equipment = inventory.find(item => item.id === id);
    if (!equipment || editor.present.placements.some(item => item.equipmentId === id)) return;
    dispatch({ type: 'placeEquipment', placement: { equipmentId: id, equipment, x: clamp(point.x, 0, bounds.width - 180), y: clamp(point.y, 0, bounds.height - 80), width: 180, height: 80 } });
    setPlacing(null); setSelected({ kind: 'equipment', id });
  };
  const manage = async action => {
    try { await action(); } catch (error) { toast.error('Ошибка', error.response?.data?.error || 'Не удалось изменить здание или этаж'); }
  };
  const askName = (options) => new Promise((resolve) => {
    setNamePrompt({ ...options, settle: (value) => { setNamePrompt(null); resolve(value); } });
  });
  const addBuilding = async () => {
    const name = await askName({ title: 'Новое здание', message: 'Название появится в списке зданий.', fieldLabel: 'Название здания', submitLabel: 'Добавить', placeholder: 'Например, Корпус 1' });
    if (name) manage(async () => { const { data } = await equipmentMapAPI.createBuilding({ name }); await refreshBuildings(data.id); });
  };
  const addFloor = async () => {
    const name = await askName({ title: 'Новый этаж', message: 'Этаж появится в выбранном здании.', fieldLabel: 'Название этажа', submitLabel: 'Добавить', placeholder: 'Например, 1 этаж' });
    if (name) manage(async () => { const { data } = await equipmentMapAPI.createFloor(buildingId, { name }); await refreshBuildings(buildingId, data.id); });
  };
  const rename = async (kind) => {
    const current = kind === 'building' ? activeBuilding : floor;
    const name = await askName({ title: kind === 'building' ? 'Название здания' : 'Название этажа', message: 'Новое название заменит текущее.', fieldLabel: 'Название', submitLabel: 'Сохранить', initialName: current?.name || '', placeholder: current?.name || '' });
    if (name) manage(async () => { await (kind === 'building' ? equipmentMapAPI.updateBuilding : equipmentMapAPI.updateFloor)(current.id, { name }); await refreshBuildings(buildingId, floorId); if (kind === 'floor') setFloor(value => ({ ...value, name })); });
  };
  const remove = async (kind) => {
    const ok = await confirm({ title: kind === 'building' ? 'Удалить здание?' : 'Удалить этаж?', message: kind === 'building' ? 'Здание и все этажи будут удалены. Оборудование останется в справочнике.' : 'Этаж будет удалён. Оборудование вернётся в список «Не размещено».', confirmText: 'Удалить', type: 'danger' });
    if (!ok) return;
    manage(async () => { await (kind === 'building' ? equipmentMapAPI.deleteBuilding : equipmentMapAPI.deleteFloor)(kind === 'building' ? buildingId : floorId); setEditing(false); setManageOpen(false); await refreshBuildings(buildingId); });
  };
  const commitRoom = async ({ roomId, name }) => {
    try {
    let linkedId = roomId;
    let label = rooms.find((room) => room.id === roomId)?.name || '';
    if (name) {
      const { data } = await roomsAPI.create({ name, building: activeBuilding?.name || '', floor: floor?.name || '' });
      linkedId = data.id;
      label = data.name;
      setRooms((current) => [...current, data]);
    }
    const geometry = pendingRoom.geometry;
    const others = editor.present.elements.filter((item) => item.type === 'room' && item.id !== pendingRoom.elementId);
    if (others.some((item) => item.roomId === linkedId)) {
      toast.error('Помещение уже на плане', 'Выберите другое или создайте новое.');
      return;
    }
    if (others.some((item) => roomsOverlap(item.geometry, geometry))) {
      toast.error('Помещения не должны пересекаться', 'Нарисуйте зону в свободном месте.');
      return;
    }
    const element = { id: pendingRoom.elementId || createMapId(), type: 'room', roomId: linkedId, label, roomName: label, geometry, style: {} };
    dispatch({ type: 'commit', present: { ...editor.present, elements: pendingRoom.elementId ? editor.present.elements.map((item) => item.id === element.id ? { ...item, ...element } : item) : [...editor.present.elements, element] } });
    setPendingRoom(null);
    setSelected({ kind: 'element', id: element.id });
    } catch (error) {
      toast.error('Ошибка', error.response?.data?.error || 'Не удалось сохранить помещение');
    }
  };
  const available = inventory.filter(item => !editor.present.placements.some(p => p.equipmentId === item.id) && `${item.name} ${item.inventoryNumber || ''}`.toLowerCase().includes(search.toLowerCase()));
  const stateText = saving ? 'Сохранение…' : saveState === 'conflict' ? 'План изменён другим пользователем. Ваши изменения не сохранены.' : saveState === 'error' ? 'Не удалось сохранить' : editor.dirty ? 'Есть изменения' : 'Сохранено';

  return <section className={`equipment-map ${editing ? 'is-editing' : ''}`}>
    <div className="map-topbar">
      <div className="map-selectors">
        <CustomSelect disabled={blocked} value={buildingId} placeholder="Нет зданий" aria-label="Здание" options={buildings.map(item => ({ value: item.id, label: item.name }))} onChange={value => { setBuildingId(value); setFloorId(buildings.find(item => item.id === value)?.floors[0]?.id || ''); }} />
        <CustomSelect disabled={blocked || !activeBuilding?.floors.length} value={floorId} placeholder="Нет этажей" options={(activeBuilding?.floors || []).map(item => ({ value: item.id, label: item.name }))} onChange={setFloorId} />
        {isAdmin && <div className="map-manage">
          <button type="button" className="btn btn-small" disabled={blocked} onClick={() => setManageOpen(value => !value)}>Здания и этажи</button>
          {manageOpen && <div className="map-manage-panel">
            <button className="btn btn-small" disabled={blocked} onClick={() => { setManageOpen(false); addBuilding(); }}>+ Здание</button>
            <button className="btn btn-small" disabled={blocked || !buildingId} onClick={() => { setManageOpen(false); addFloor(); }}>+ Этаж</button>
            <button className="btn btn-small" disabled={blocked || !buildingId} onClick={() => { setManageOpen(false); rename('building'); }}>Переименовать здание</button>
            <button className="btn btn-small" disabled={blocked || !floor} onClick={() => { setManageOpen(false); rename('floor'); }}>Переименовать этаж</button>
            <button className="btn btn-small btn-danger-outline" disabled={blocked || !floor} onClick={() => { setManageOpen(false); remove('floor'); }}>Удалить этаж</button>
            <button className="btn btn-small btn-danger-outline" disabled={blocked || !buildingId} onClick={() => { setManageOpen(false); remove('building'); }}>Удалить здание</button>
          </div>}
        </div>}
      </div>
      <div className="map-actions">
        {floor && <span role="status" className={`map-save-state ${saveState}`}>{stateText}</span>}
        {saveState === 'error' && <button className="btn btn-small" onClick={() => setSaveState('saved')}>Повторить сохранение</button>}
        {saveState === 'conflict' && <button className="btn btn-small" onClick={async () => {
          if (await confirm({ title: 'Загрузить серверный план?', message: 'Ваши несохранённые изменения будут потеряны. Вместо них загрузится последняя версия плана с сервера.', confirmText: 'Загрузить', type: 'warning' })) setReload(value => value + 1);
        }}>Загрузить серверный план</button>}
        {isAdmin && floor && <button className={`btn btn-small ${editing ? 'btn-primary' : ''}`} disabled={blocked || loading} title={blocked ? 'Дождитесь сохранения изменений' : ''} onClick={() => { setEditing(value => !value); changeTool('select'); setSelected(null); }}>
          {editing ? <><Save size={16} /> Завершить</> : <><Edit3 size={16} /> Редактировать</>}
        </button>}
      </div>
    </div>
    {loadError ? <div className="map-empty"><h2>Не удалось загрузить карту</h2><p>Проверьте подключение и обновите страницу.</p></div> : loading ? <div className="map-loading">Загрузка карты…</div> : !floor ? <div className="map-empty"><Building2 size={42} /><h2>{buildingId ? 'Добавьте этаж' : 'Карта ещё не создана'}</h2>{isAdmin && <button className="btn btn-primary" onClick={buildingId ? addFloor : addBuilding}>{buildingId ? 'Добавить этаж' : 'Создать здание'}</button>}</div> : <>
      {editing && <MapToolbar tool={tool} setTool={changeTool} placing={placing} onUndo={() => dispatch({ type: 'undo' })} onRedo={() => dispatch({ type: 'redo' })} canUndo={editor.past.length > 0} canRedo={editor.future.length > 0} />}
      <div className="map-workspace">
        <div className="map-stage">
          <MapCanvas key={floor.id} layout={editor.present} machineStatuses={machineStatuses} bounds={bounds} editing={editing} tool={tool} setTool={changeTool} selected={selected} setSelected={setSelected} dispatch={dispatch} placing={placing} onPlace={placeEquipment} onLabel={setPendingLabel} onRoom={(geometry) => setPendingRoom({ geometry })} onRoomOverlap={() => toast.error('Помещения не должны пересекаться', 'Сдвиньте зону так, чтобы она не накрывала другое помещение.')} onPreview={equipment => equipment && setPreview({ equipment })} onDelete={deleteSelected} onCancel={() => { setPlacing(null); setSelected(null); }} />
          {preview && <EquipmentMapPreview {...preview} equipment={{ ...preview.equipment, status: machineStatuses[preview.equipment.id]?.state || preview.equipment.status }} onClose={() => setPreview(null)} />}
        </div>
        {editing && <div className="map-sidebar">
          {selection && <aside className="map-properties">
            <div className="map-properties-heading"><h3>{selectedEquipment ? 'Оборудование' : selectedElement.type === 'wall' ? 'Стена' : selectedElement.type === 'room' ? 'Помещение' : 'Метка'}</h3><button className="btn btn-small" aria-label="Снять выделение" onClick={() => setSelected(null)}>×</button></div>
            {selectedEquipment ? <><strong>{selectedEquipment.equipment?.name}</strong><p>{selectedEquipment.equipment?.inventoryNumber || 'Без инв. номера'} · {statusPresentation(machineStatuses[selectedEquipment.equipmentId]?.state || selectedEquipment.equipment?.status).label}</p><p>Размер: {selectedEquipment.width || 180} × {selectedEquipment.height || 80} усл. ед.</p><p>Тяните за рамку по углам или сторонам. За середину — перемещайте.</p></> : selectedElement.type === 'room' ? <><strong>{selectedElement.label || selectedElement.roomName}</strong><p>Тяните за рамку, чтобы изменить размер. За середину — переместить.</p><button className="btn btn-small" onClick={() => setPendingRoom({ geometry: selectedElement.geometry, elementId: selectedElement.id, roomId: selectedElement.roomId })}>Сменить помещение</button></> : selectedElement.type === 'wall' ? <><p>За конец — изменить длину.<br />За середину — переместить.</p><button className="btn btn-small" onClick={() => changeTool('opening')}>Сделать проём</button></> : <><strong>{selectedElement.label}</strong><button className="btn btn-small" onClick={() => setPendingLabel(selectedElement)}>Изменить название</button></>}
            <button className="btn btn-small btn-danger-outline" onClick={deleteSelected}>{selectedEquipment ? 'Убрать с плана' : 'Удалить выбранное'}</button>
          </aside>}
          <UnplacedEquipmentPanel items={available} search={search} setSearch={setSearch} selectedId={placing} onChoose={id => { changeTool('select'); setSelected(null); setPlacing(id); }} />
        </div>}
      </div>
      <div className="map-legend"><span><i className="map-status-working" />Работает</span><span><i className="map-status-reserve" />Резерв</span><span><i className="map-status-repair" />В ремонте</span><span><i className="map-status-alert" />Требует внимания</span></div>
    </>}
    {pendingRoom && <MapRoomDialog rooms={rooms} usedRoomIds={editor.present.elements.filter(item => item.type === 'room' && item.id !== pendingRoom.elementId).map(item => item.roomId)} initialRoomId={pendingRoom.roomId || ''} onClose={() => setPendingRoom(null)} onSubmit={commitRoom} />}
    {namePrompt && <MapLabelDialog title={namePrompt.title} message={namePrompt.message} fieldLabel={namePrompt.fieldLabel} submitLabel={namePrompt.submitLabel} placeholder={namePrompt.placeholder} initialName={namePrompt.initialName || ''} onClose={() => namePrompt.settle(null)} onSubmit={namePrompt.settle} />}
    {pendingLabel && <MapLabelDialog initialName={pendingLabel.label || ''} editingLabel={Boolean(pendingLabel.id)} onClose={() => setPendingLabel(null)} onSubmit={label => {
      const item = { ...pendingLabel, id: pendingLabel.id || createMapId(), type: 'label', label, style: pendingLabel.style || {} };
      dispatch({ type: 'commit', present: { ...editor.present, elements: pendingLabel.id ? editor.present.elements.map(element => element.id === item.id ? item : element) : [...editor.present.elements, item] } });
      setPendingLabel(null); changeTool('select'); setSelected({ kind: 'element', id: item.id });
    }} />}
  </section>;
}
