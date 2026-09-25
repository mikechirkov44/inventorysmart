import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Building2, Edit3, LocateFixed, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { equipmentMapAPI, roomsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import EquipmentMapPreview from '../components/equipment-map/EquipmentMapPreview';
import MapToolbar from '../components/equipment-map/MapToolbar';
import UnplacedEquipmentPanel from '../components/equipment-map/UnplacedEquipmentPanel';
import { editorReducer, initialEditorState, snap, statusPresentation } from '../components/equipment-map/mapEditor';

const newId = () => crypto.randomUUID();

function EquipmentMap() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || String(user?.positionName || '').toLowerCase() === 'администратор';
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [floor, setFloor] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [unplaced, setUnplaced] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState('select');
  const [roomId, setRoomId] = useState('');
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [saveState, setSaveState] = useState('saved');
  const [editor, dispatch] = useReducer(editorReducer, initialEditorState);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const wallStart = useRef(null);

  const activeBuilding = buildings.find((item) => item.id === buildingId);
  const refreshBuildings = useCallback(async (preferredBuilding, preferredFloor) => {
    const { data } = await equipmentMapAPI.getBuildings();
    setBuildings(data);
    const nextBuilding = data.find((item) => item.id === preferredBuilding) || data[0];
    const nextFloor = nextBuilding?.floors.find((item) => item.id === preferredFloor) || nextBuilding?.floors[0];
    setBuildingId(nextBuilding?.id || '');
    setFloorId(nextFloor?.id || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshBuildings().catch(() => { setLoading(false); toast.error('Ошибка', 'Не удалось загрузить карту'); });
    roomsAPI.getAll().then(({ data }) => setRooms(data)).catch(() => setRooms([]));
  }, [refreshBuildings, toast]);

  const loadFloor = useCallback(async () => {
    if (!floorId) { setFloor(null); dispatch({ type: 'load', elements: [], placements: [] }); return; }
    setLoading(true);
    try {
      const { data } = await equipmentMapAPI.getFloor(floorId);
      setFloor(data);
      dispatch({ type: 'load', elements: data.elements, placements: data.placements });
      setSaveState('saved'); setSelected(null); setPreview(null);
    } catch { toast.error('Ошибка', 'Не удалось загрузить этаж'); }
    finally { setLoading(false); }
  }, [floorId, toast]);
  useEffect(() => { loadFloor(); }, [loadFloor]);
  useEffect(() => {
    const timer = setTimeout(() => equipmentMapAPI.getUnplaced(search).then(({ data }) => setUnplaced(data)).catch(() => {}), 250);
    return () => clearTimeout(timer);
  }, [search, floorId]);

  useEffect(() => {
    if (!editing || !floorId || !editor.dirty) return undefined;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      try {
        const { data } = await equipmentMapAPI.saveLayout(floorId, { version: floor.version, ...editor.present });
        setFloor((current) => ({ ...current, version: data.version }));
        dispatch({ type: 'saved' }); setSaveState('saved');
        const { data: unused } = await equipmentMapAPI.getUnplaced(search); setUnplaced(unused);
      } catch (error) {
        setSaveState(error.response?.status === 409 ? 'conflict' : 'error');
        toast.error('Карта не сохранена', error.response?.data?.error || 'Проверьте подключение к серверу');
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [editing, editor.dirty, editor.present, floorId, floor?.version, search, toast]);

  const clientPoint = (event) => {
    const svg = svgRef.current; const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const result = point.matrixTransform(svg.getScreenCTM().inverse()); return { x: snap(result.x), y: snap(result.y) };
  };

  const canvasClick = (event) => {
    if (!editing || event.target.closest?.('[data-map-object]')) return;
    const point = clientPoint(event);
    if (tool === 'room') {
      if (!roomId) return toast.info('Выберите помещение', 'Сначала выберите помещение в панели инструментов');
      const room = rooms.find((item) => item.id === roomId);
      dispatch({ type: 'addElement', element: { id: newId(), type: 'room', roomId, roomName: room?.name, geometry: { x: point.x, y: point.y, width: 260, height: 160 }, style: {}, label: '' } });
    } else if (tool === 'label') {
      const label = window.prompt('Текст метки'); if (label?.trim()) dispatch({ type: 'addElement', element: { id: newId(), type: 'label', label: label.trim(), geometry: point, style: {} } });
    } else if (tool === 'wall') {
      if (!wallStart.current) wallStart.current = point;
      else { dispatch({ type: 'addElement', element: { id: newId(), type: 'wall', geometry: { x1: wallStart.current.x, y1: wallStart.current.y, x2: point.x, y2: point.y }, style: {} } }); wallStart.current = null; }
    } else setSelected(null);
  };

  const pointerDown = (event, kind, id) => {
    event.stopPropagation(); setSelected({ kind: kind === 'resize' ? 'element' : kind, id });
    if (!editing || tool !== 'select') return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { kind, id };
  };
  const pointerMove = (event) => {
    if (!dragRef.current || !editing) return;
    const point = clientPoint(event); const { kind, id } = dragRef.current;
    if (kind === 'element') dispatch({ type: 'moveElement', id, x: point.x, y: point.y });
    else if (kind === 'resize') {
      const item = editor.present.elements.find((entry) => entry.id === id);
      if (item) dispatch({ type: 'resizeElement', id, width: Math.max(40, point.x - item.geometry.x), height: Math.max(40, point.y - item.geometry.y) });
    }
    else dispatch({ type: 'placeEquipment', placement: { equipmentId: id, x: point.x, y: point.y } });
  };
  const pointerUp = () => { dragRef.current = null; };
  const dropEquipment = (event) => {
    if (!editing) return; event.preventDefault();
    const equipmentId = event.dataTransfer.getData('application/x-equipment-id'); if (!equipmentId) return;
    const item = unplaced.find((entry) => entry.id === equipmentId);
    const point = clientPoint(event);
    dispatch({ type: 'placeEquipment', placement: { equipmentId, x: point.x, y: point.y, equipment: item } });
    setUnplaced((current) => current.filter((entry) => entry.id !== equipmentId));
  };
  const deleteSelected = () => {
    if (!selected) return;
    dispatch(selected.kind === 'element' ? { type: 'deleteElement', id: selected.id } : { type: 'removePlacement', equipmentId: selected.id }); setSelected(null);
  };

  const addBuilding = async () => {
    const name = window.prompt('Название здания'); if (!name?.trim()) return;
    try { const { data } = await equipmentMapAPI.createBuilding({ name }); await refreshBuildings(data.id); } catch (error) { toast.error('Не удалось создать здание', error.response?.data?.error || 'Ошибка'); }
  };
  const addFloor = async () => {
    if (!buildingId) return;
    const name = window.prompt('Название этажа'); if (!name?.trim()) return;
    try { const { data } = await equipmentMapAPI.createFloor(buildingId, { name }); await refreshBuildings(buildingId, data.id); } catch (error) { toast.error('Не удалось создать этаж', error.response?.data?.error || 'Ошибка'); }
  };
  const renameBuilding = async () => {
    const current = activeBuilding; if (!current) return;
    const name = window.prompt('Название здания', current.name); if (!name?.trim() || name.trim() === current.name) return;
    try { await equipmentMapAPI.updateBuilding(current.id, { name }); await refreshBuildings(current.id, floorId); } catch (error) { toast.error('Не удалось переименовать здание', error.response?.data?.error || 'Ошибка'); }
  };
  const renameFloor = async () => {
    if (!floor) return;
    const name = window.prompt('Название этажа', floor.name); if (!name?.trim() || name.trim() === floor.name) return;
    try { await equipmentMapAPI.updateFloor(floor.id, { name }); await refreshBuildings(buildingId, floor.id); } catch (error) { toast.error('Не удалось переименовать этаж', error.response?.data?.error || 'Ошибка'); }
  };
  const createRoom = async () => {
    const name = window.prompt('Название помещения'); if (!name?.trim()) return;
    try {
      const { data } = await roomsAPI.create({ name: name.trim(), building: activeBuilding?.name || '', floor: floor?.name || '' });
      setRooms((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name))); setRoomId(data.id);
    } catch (error) { toast.error('Не удалось создать помещение', error.response?.data?.error || 'Ошибка'); }
  };
  const deleteFloor = async () => {
    if (!floorId || !window.confirm('Удалить этаж? Оборудование вернётся в список «Не размещено».')) return;
    setEditing(false);
    await equipmentMapAPI.deleteFloor(floorId); await refreshBuildings(buildingId); setFloor(null);
  };
  const deleteBuilding = async () => {
    if (!buildingId || !window.confirm('Удалить здание и все его этажи? Оборудование не будет удалено.')) return;
    setEditing(false);
    await equipmentMapAPI.deleteBuilding(buildingId); await refreshBuildings(); setFloor(null);
  };

  const roomNames = useMemo(() => Object.fromEntries(rooms.map((item) => [item.id, item.name])), [rooms]);
  const viewWidth = (floor?.canvasWidth || 1600) / zoom; const viewHeight = (floor?.canvasHeight || 900) / zoom;

  if (loading && !floor && buildings.length) return <div className="map-loading">Загрузка карты…</div>;
  return (
    <section className={`equipment-map ${editing ? 'is-editing' : ''}`}>
      <div className="map-topbar">
        <div className="map-selectors">
          <select value={buildingId} onChange={(event) => { setBuildingId(event.target.value); const building = buildings.find((item) => item.id === event.target.value); setFloorId(building?.floors[0]?.id || ''); }} aria-label="Здание">
            {!buildings.length && <option value="">Нет зданий</option>}{buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={floorId} onChange={(event) => setFloorId(event.target.value)} aria-label="Этаж">
            {!activeBuilding?.floors.length && <option value="">Нет этажей</option>}{activeBuilding?.floors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {isAdmin && <><button className="btn btn-small" onClick={addBuilding}>+ Здание</button><button className="btn btn-small" onClick={addFloor} disabled={!buildingId}>+ Этаж</button></>}
        </div>
        <div className="map-actions">
          {saveState !== 'saved' && <span className={`map-save-state ${saveState}`}>{saveState === 'saving' ? 'Сохранение…' : saveState === 'conflict' ? 'План изменён другим пользователем' : 'Ошибка сохранения'}</span>}
          <button className="btn btn-small" onClick={() => setZoom((z) => Math.max(.5, z - .25))} aria-label="Уменьшить"><Minus size={15} /></button>
          <button className="btn btn-small" onClick={() => setZoom(1)} title="По размеру"><LocateFixed size={15} /></button>
          <button className="btn btn-small" onClick={() => setZoom((z) => Math.min(2.5, z + .25))} aria-label="Увеличить"><Plus size={15} /></button>
          {isAdmin && floorId && <button className={`btn btn-small map-edit-toggle ${editing ? 'btn-primary' : ''}`} onClick={() => setEditing((value) => !value)}>{editing ? <><Save size={15} /> Завершить</> : <><Edit3 size={15} /> Редактировать</>}</button>}
          {isAdmin && editing && <><button className="btn btn-small" onClick={renameBuilding}>Название здания</button><button className="btn btn-small" onClick={renameFloor}>Название этажа</button><button className="btn btn-small btn-danger-outline" onClick={deleteFloor}><Trash2 size={14} /> Этаж</button><button className="btn btn-small btn-danger-outline" onClick={deleteBuilding}><Trash2 size={14} /> Здание</button></>}
        </div>
      </div>
      {!buildings.length ? <div className="map-empty"><Building2 size={42} /><h2>Карта ещё не создана</h2><p>Добавьте первое здание, затем создайте этаж и расставьте оборудование.</p>{isAdmin && <button className="btn btn-primary" onClick={addBuilding}>Создать здание</button>}</div>
      : !floorId ? <div className="map-empty"><Building2 size={42} /><h2>В здании пока нет этажей</h2>{isAdmin && <button className="btn btn-primary" onClick={addFloor}>Добавить этаж</button>}</div>
      : <>
        {editing && <MapToolbar tool={tool} setTool={setTool} rooms={rooms} roomId={roomId} setRoomId={setRoomId} onCreateRoom={createRoom} onUndo={() => dispatch({ type: 'undo' })} canUndo={editor.past.length > 0} onDelete={deleteSelected} />}
        <div className="map-workspace">
          <div className="map-canvas-wrap" onDragOver={(event) => editing && event.preventDefault()} onDrop={dropEquipment}>
            <svg ref={svgRef} className="map-canvas" viewBox={`0 0 ${viewWidth} ${viewHeight}`} onClick={canvasClick} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} aria-label="План этажа">
              <defs><pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" /></pattern></defs>
              <rect width="100%" height="100%" className="map-grid-bg" />
              {editor.present.elements.map((item) => item.type === 'room' ? (
                <g key={item.id} data-map-object className={`map-room ${selected?.id === item.id ? 'selected' : ''}`} onPointerDown={(event) => pointerDown(event, 'element', item.id)}>
                  <rect x={item.geometry.x} y={item.geometry.y} width={item.geometry.width} height={item.geometry.height} rx="8" />
                  <text x={item.geometry.x + 14} y={item.geometry.y + 25}>{item.roomName || roomNames[item.roomId] || 'Помещение'}</text>
                  {editing && selected?.id === item.id && <circle className="map-resize-handle" cx={item.geometry.x + item.geometry.width} cy={item.geometry.y + item.geometry.height} r="10" onPointerDown={(event) => pointerDown(event, 'resize', item.id)} />}
                </g>
              ) : item.type === 'wall' ? <line key={item.id} data-map-object className={`map-wall ${selected?.id === item.id ? 'selected' : ''}`} {...item.geometry} onPointerDown={(event) => pointerDown(event, 'element', item.id)} />
                : <text key={item.id} data-map-object className={`map-label ${selected?.id === item.id ? 'selected' : ''}`} x={item.geometry.x} y={item.geometry.y} onPointerDown={(event) => pointerDown(event, 'element', item.id)}>{item.label}</text>)}
              {editor.present.placements.map((placement) => { const equipment = placement.equipment; if (!equipment) return null; const status = statusPresentation(equipment.status); return (
                <g key={placement.equipmentId} data-map-object tabIndex="0" role="button" aria-label={`${equipment.name}, ${status.label}`} className={`map-equipment-marker ${status.className} ${selected?.id === placement.equipmentId ? 'selected' : ''}`} transform={`translate(${placement.x} ${placement.y})`} onPointerDown={(event) => pointerDown(event, 'equipment', placement.equipmentId)} onClick={(event) => { event.stopPropagation(); if (!editing) setPreview({ equipment, roomName: roomNames[equipment.roomId] }); }}>
                  <circle r="20" /><path d="M-7-6h14v12H-7zM-3-10h6v4h-6z" /><text x="27" y="5">{equipment.name.length > 26 ? `${equipment.name.slice(0, 26)}…` : equipment.name}</text>
                </g>); })}
            </svg>
            {preview && <EquipmentMapPreview {...preview} onClose={() => setPreview(null)} />}
          </div>
          {editing && <UnplacedEquipmentPanel items={unplaced} search={search} setSearch={setSearch} />}
        </div>
        <div className="map-legend"><span><i className="map-status-working" />Работает</span><span><i className="map-status-reserve" />Резерв</span><span><i className="map-status-repair" />В ремонте</span><span><i className="map-status-alert" />Требует внимания</span></div>
      </>}
    </section>
  );
}

export default EquipmentMap;
