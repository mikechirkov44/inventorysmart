import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Building2, Edit3, LocateFixed, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { equipmentMapAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import EquipmentMapPreview from '../components/equipment-map/EquipmentMapPreview';
import MapToolbar from '../components/equipment-map/MapToolbar';
import MapLabelDialog from '../components/equipment-map/MapLabelDialog';
import UnplacedEquipmentPanel from '../components/equipment-map/UnplacedEquipmentPanel';
import { createMapId as newId, createWallFromPoints, createWallRectangle, editorReducer, initialEditorState, snap, statusPresentation } from '../components/equipment-map/mapEditor';

function EquipmentMap() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || String(user?.positionName || '').toLowerCase() === 'администратор';
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [floor, setFloor] = useState(null);
  const [unplaced, setUnplaced] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tool, setTool] = useState('select');
  const [pendingLabel, setPendingLabel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [saveState, setSaveState] = useState('saved');
  const [wallPreview, setWallPreview] = useState(null);
  const [rectanglePreview, setRectanglePreview] = useState(null);
  const [editor, dispatch] = useReducer(editorReducer, initialEditorState);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const wallStart = useRef(null);
  const wallGesture = useRef(null);
  const suppressWallClick = useRef(false);

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
  }, [refreshBuildings, toast]);

  const loadFloor = useCallback(async () => {
    if (!floorId) { setFloor(null); dispatch({ type: 'load', elements: [], placements: [] }); return; }
    setLoading(true);
    try {
      const { data } = await equipmentMapAPI.getFloor(floorId);
      setFloor(data);
      const elements = data.elements.flatMap((item) => item.type === 'room'
        ? createWallRectangle(item.geometry, { x: item.geometry.x + item.geometry.width, y: item.geometry.y + item.geometry.height }, newId)
        : [item]);
      dispatch({ type: 'load', elements, placements: data.placements });
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
    if (suppressWallClick.current) { suppressWallClick.current = false; return; }
    const point = clientPoint(event);
    if (tool === 'label') {
      setPendingLabel(point);
    } else if (tool === 'wall') {
      if (!wallStart.current) { wallStart.current = point; setWallPreview({ start: point, end: point }); }
      else {
        const wall = createWallFromPoints(wallStart.current, point, newId());
        if (wall) dispatch({ type: 'addElement', element: wall });
        wallStart.current = null; setWallPreview(null);
      }
    } else setSelected(null);
  };

  const canvasPointerDown = (event) => {
    if (!editing || !['wall', 'rectangle'].includes(tool) || event.target.closest?.('[data-map-object]')) return;
    const point = clientPoint(event);
    wallGesture.current = { tool, start: point, current: point, moved: false };
    if (tool === 'wall') setWallPreview({ start: point, end: point });
    else setRectanglePreview({ start: point, end: point });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const pointerDown = (event, kind, id) => {
    event.stopPropagation(); setSelected({ kind: ['resize', 'wallStart', 'wallEnd'].includes(kind) ? 'element' : kind, id });
    if (!editing) return;
    // A visible resize handle must work regardless of the last drawing tool.
    const directManipulation = ['equipment', 'equipmentResize', 'wallStart', 'wallEnd'].includes(kind);
    if (tool !== 'select' && !directManipulation) return;
    if (tool !== 'select') changeTool('select');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { kind, id };
  };
  const pointerMove = (event) => {
    if (wallGesture.current && editing && ['wall', 'rectangle'].includes(tool)) {
      const point = clientPoint(event);
      wallGesture.current.current = point;
      wallGesture.current.moved ||= Math.abs(point.x - wallGesture.current.start.x) >= 20 || Math.abs(point.y - wallGesture.current.start.y) >= 20;
      if (wallGesture.current.tool === 'wall') setWallPreview({ start: wallGesture.current.start, end: point });
      else setRectanglePreview({ start: wallGesture.current.start, end: point });
      return;
    }
    if (wallStart.current && editing && tool === 'wall') setWallPreview({ start: wallStart.current, end: clientPoint(event) });
    if (!dragRef.current || !editing) return;
    const point = clientPoint(event); const { kind, id } = dragRef.current;
    if (kind === 'element') dispatch({ type: 'moveElement', id, x: point.x, y: point.y });
    else if (kind === 'resize') {
      const item = editor.present.elements.find((entry) => entry.id === id);
      if (item) dispatch({ type: 'resizeElement', id, width: Math.max(40, point.x - item.geometry.x), height: Math.max(40, point.y - item.geometry.y) });
    } else if (kind === 'wallStart' || kind === 'wallEnd') {
      dispatch({ type: 'moveWallEndpoint', id, endpoint: kind === 'wallStart' ? 'start' : 'end', x: point.x, y: point.y });
    } else if (kind === 'equipmentResize') {
      const item = editor.present.placements.find((entry) => entry.equipmentId === id);
      if (item) dispatch({
        type: 'resizePlacement', equipmentId: id,
        width: Math.max(100, Math.min(500, (floor?.canvasWidth || 1600) - item.x, point.x - item.x)),
        height: Math.max(60, Math.min(300, (floor?.canvasHeight || 900) - item.y, point.y - item.y)),
      });
    } else {
      const item = editor.present.placements.find((entry) => entry.equipmentId === id);
      const width = item?.width || 180; const height = item?.height || 80;
      dispatch({ type: 'placeEquipment', placement: { equipmentId: id, x: Math.max(0, Math.min((floor?.canvasWidth || 1600) - width, point.x)), y: Math.max(0, Math.min((floor?.canvasHeight || 900) - height, point.y)) } });
    }
  };
  const pointerUp = () => {
    if (wallGesture.current) {
      const gesture = wallGesture.current;
      if (gesture.moved) {
        if (gesture.tool === 'rectangle') {
          const walls = createWallRectangle(gesture.start, gesture.current, newId);
          if (walls.length) dispatch({ type: 'addElements', elements: walls });
        } else {
          const wall = createWallFromPoints(gesture.start, gesture.current, newId());
          if (wall) dispatch({ type: 'addElement', element: wall });
        }
        wallStart.current = null; suppressWallClick.current = true;
      }
      wallGesture.current = null;
      if (gesture.moved) { setWallPreview(null); setRectanglePreview(null); }
    }
    dragRef.current = null;
  };
  const dropEquipment = (event) => {
    if (!editing) return; event.preventDefault();
    const equipmentId = event.dataTransfer.getData('application/x-equipment-id'); if (!equipmentId) return;
    const item = unplaced.find((entry) => entry.id === equipmentId);
    const point = clientPoint(event);
    dispatch({ type: 'placeEquipment', placement: { equipmentId, x: Math.max(0, Math.min((floor?.canvasWidth || 1600) - 180, point.x)), y: Math.max(0, Math.min((floor?.canvasHeight || 900) - 80, point.y)), width: 180, height: 80, equipment: item } });
    setUnplaced((current) => current.filter((entry) => entry.id !== equipmentId));
  };
  const deleteSelected = () => {
    if (!selected) return;
    dispatch(selected.kind === 'element' ? { type: 'deleteElement', id: selected.id } : { type: 'removePlacement', equipmentId: selected.id }); setSelected(null);
  };
  const changeTool = (nextTool) => {
    suppressWallClick.current = false;
    setTool(nextTool); wallStart.current = null; wallGesture.current = null;
    setWallPreview(null); setRectanglePreview(null);
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
        {editing && <MapToolbar tool={tool} setTool={changeTool} onUndo={() => dispatch({ type: 'undo' })} canUndo={editor.past.length > 0} onDelete={deleteSelected} hasSelection={Boolean(selected)} />}
        <div className="map-workspace">
          <div className="map-canvas-wrap" onDragOver={(event) => editing && event.preventDefault()} onDrop={dropEquipment}>
            <svg ref={svgRef} className="map-canvas" viewBox={`0 0 ${viewWidth} ${viewHeight}`} onClick={canvasClick} onPointerDown={canvasPointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} aria-label="План этажа">
              <defs><pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" /></pattern></defs>
              <rect width="100%" height="100%" className="map-grid-bg" />
              {wallPreview && <line className="map-wall-preview" x1={wallPreview.start.x} y1={wallPreview.start.y} x2={wallPreview.end.x} y2={wallPreview.end.y} />}
              {rectanglePreview && <rect className="map-rectangle-preview" x={Math.min(rectanglePreview.start.x, rectanglePreview.end.x)} y={Math.min(rectanglePreview.start.y, rectanglePreview.end.y)} width={Math.abs(rectanglePreview.end.x - rectanglePreview.start.x)} height={Math.abs(rectanglePreview.end.y - rectanglePreview.start.y)} />}
              {editor.present.elements.map((item) => item.type === 'wall' ? <g key={item.id} data-map-object>
                <line className={`map-wall ${selected?.id === item.id ? 'selected' : ''}`} {...item.geometry} onPointerDown={(event) => pointerDown(event, 'element', item.id)} />
                {editing && selected?.id === item.id && <>
                  <circle className="map-wall-handle" cx={item.geometry.x1} cy={item.geometry.y1} r="11" onPointerDown={(event) => pointerDown(event, 'wallStart', item.id)} />
                  <circle className="map-wall-handle" cx={item.geometry.x2} cy={item.geometry.y2} r="11" onPointerDown={(event) => pointerDown(event, 'wallEnd', item.id)} />
                </>}
              </g>
                : <text key={item.id} data-map-object className={`map-label ${selected?.id === item.id ? 'selected' : ''}`} x={item.geometry.x} y={item.geometry.y} onPointerDown={(event) => pointerDown(event, 'element', item.id)}>{item.label}</text>)}
              {editor.present.placements.map((placement) => { const equipment = placement.equipment; if (!equipment) return null; const status = statusPresentation(equipment.status); const width = placement.width || 180; const height = placement.height || 80; return (
                <g key={placement.equipmentId} data-map-object tabIndex="0" role="button" aria-label={`${equipment.name}, ${status.label}`} className={`map-equipment-marker ${status.className} ${selected?.id === placement.equipmentId ? 'selected' : ''}`} transform={`translate(${placement.x} ${placement.y})`} onPointerDown={(event) => pointerDown(event, 'equipment', placement.equipmentId)} onClick={(event) => { event.stopPropagation(); if (!editing) setPreview({ equipment, roomName: null }); }}>
                  <rect className="map-equipment-card" width={width} height={height} rx="10" />
                  <rect className="map-equipment-status-bar" width="7" height={height} rx="4" />
                  <path transform="translate(22 22)" d="M-7-6h14v12H-7zM-3-10h6v4h-6z" />
                  <text className="map-equipment-name" x="40" y="24">{equipment.name.length > Math.max(12, Math.floor(width / 9)) ? `${equipment.name.slice(0, Math.max(12, Math.floor(width / 9)))}…` : equipment.name}</text>
                  <text className="map-equipment-number" x="18" y={Math.min(height - 17, 55)}>{equipment.inventoryNumber || 'Без инв. номера'}</text>
                  {editing && selected?.id === placement.equipmentId && <circle className="map-resize-handle" cx={width} cy={height} r="14" onPointerDown={(event) => pointerDown(event, 'equipmentResize', placement.equipmentId)}><title>Потяните за угол, чтобы изменить размер</title></circle>}
                </g>); })}
            </svg>
            {preview && <EquipmentMapPreview {...preview} onClose={() => setPreview(null)} />}
          </div>
          {editing && <UnplacedEquipmentPanel items={unplaced} search={search} setSearch={setSearch} />}
        </div>
        <div className="map-legend"><span><i className="map-status-working" />Работает</span><span><i className="map-status-reserve" />Резерв</span><span><i className="map-status-repair" />В ремонте</span><span><i className="map-status-alert" />Требует внимания</span></div>
      </>}
      {pendingLabel && <MapLabelDialog onClose={() => setPendingLabel(null)} onSubmit={(label) => {
        dispatch({ type: 'addElement', element: { id: newId(), type: 'label', label, geometry: pendingLabel, style: {} } });
        setPendingLabel(null);
      }} />}
    </section>
  );
}

export default EquipmentMap;
