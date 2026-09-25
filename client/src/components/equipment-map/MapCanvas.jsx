import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, LocateFixed } from 'lucide-react';
import { clamp, snap, createMapId, createWallFromPoints, createWallRectangle, cutWall, projectOnWall, resizeEquipment, statusPresentation } from './mapEditor';

const HANDLES = [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]];

export default function MapCanvas({ layout, bounds, editing, tool, setTool, selected, setSelected, dispatch, placing, onPlace, onLabel, onPreview, onDelete, onCancel }) {
  const svg = useRef(null);
  const gesture = useRef(null);
  const clickedObject = useRef(null);
  const space = useRef(false);
  const start = useRef(null);
  const [draft, setDraft] = useState(null);
  const [guide, setGuide] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [panning, setPanning] = useState(false);
  const current = draft || layout;
  const reset = () => { gesture.current = null; start.current = null; setDraft(null); setGuide(null); setPanning(false); };
  useEffect(() => { reset(); }, [tool]);

  const rawPoint = (event) => {
    const p = svg.current.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(svg.current.getScreenCTM().inverse());
  };
  const pointAt = (event, exclude) => {
    const raw = rawPoint(event);
    const point = { x: clamp(snap(raw.x), 0, bounds.width), y: clamp(snap(raw.y), 0, bounds.height) };
    const tolerance = 14 / (svg.current.getScreenCTM()?.a || 1);
    let nearest = tolerance;
    for (const wall of layout.elements.filter(item => item.type === 'wall' && item.id !== exclude)) {
      for (const p of [{ x: wall.geometry.x1, y: wall.geometry.y1 }, { x: wall.geometry.x2, y: wall.geometry.y2 }]) {
        const distance = Math.hypot(p.x - raw.x, p.y - raw.y);
        if (distance < nearest) { nearest = distance; point.x = p.x; point.y = p.y; }
      }
    }
    return point;
  };
  const zoomAt = (factor, anchor) => {
    setView(old => {
      const zoom = clamp(old.zoom * factor, .5, 4);
      const p = anchor || { x: old.x + bounds.width / old.zoom / 2, y: old.y + bounds.height / old.zoom / 2 };
      return { zoom, x: p.x - (p.x - old.x) * old.zoom / zoom, y: p.y - (p.y - old.y) * old.zoom / zoom };
    });
  };
  useEffect(() => {
    const element = svg.current;
    const wheel = event => { event.preventDefault(); zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, rawPoint(event)); };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  // bounds only affects button zoom; wheel supplies its own anchor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const keyDown = event => {
      if (event.target.closest('input, textarea, select, [role="dialog"], [contenteditable="true"]')) return;
      if (event.code === 'Space') { event.preventDefault(); space.current = true; setPanning(true); }
      if (!editing) return;
      if (event.key === 'Escape') { reset(); setTool('select'); onCancel(); }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); onDelete(); }
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault(); reset(); dispatch({ type: event.shiftKey || event.key.toLowerCase() === 'y' ? 'redo' : 'undo' });
      }
    };
    const keyUp = event => { if (event.code === 'Space') { space.current = false; setPanning(false); } };
    const blur = () => { space.current = false; reset(); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur); };
  }, [editing, dispatch, onDelete, onCancel, setTool]);

  const finish = (present) => { dispatch({ type: 'commit', present }); reset(); setTool('select'); };
  const down = event => {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    const point = pointAt(event);
    const hit = event.target.closest('[data-id]');
    clickedObject.current = hit ? { ...hit.dataset } : null;
    svg.current.setPointerCapture(event.pointerId);
    if (space.current || event.button === 1) {
      clickedObject.current = null;
      gesture.current = { kind: 'pan', screen: { x: event.clientX, y: event.clientY }, view, scale: svg.current.getScreenCTM().a }; return;
    }
    if (!editing) return;
    if (tool !== 'select' || placing) { gesture.current = { kind: tool, from: point, to: point, moved: false }; return; }
    const target = event.target.closest('[data-id]');
    if (!target) { setSelected(null); return; }
    const { id, kind, edge } = target.dataset;
    const item = kind === 'equipment' ? layout.placements.find(p => p.equipmentId === id) : layout.elements.find(p => p.id === id);
    if (!item) return;
    setSelected({ kind, id });
    gesture.current = { kind: 'object', objectKind: kind, id, edge, item, from: point, base: layout, moved: false };
  };
  const move = event => {
    const g = gesture.current;
    const point = pointAt(event, g?.id);
    if (g?.kind === 'pan') {
      setView({ ...g.view, x: g.view.x - (event.clientX - g.screen.x) / g.scale, y: g.view.y - (event.clientY - g.screen.y) / g.scale }); return;
    }
    if (!editing) return;
    if (g?.kind === 'object') {
      const dx = snap(point.x - g.from.x); const dy = snap(point.y - g.from.y);
      if (!g.moved && dx === 0 && dy === 0) return;
      g.moved = true;
      clickedObject.current = null;
      let item = g.item;
      if (g.objectKind === 'equipment') {
        const geometry = g.edge ? resizeEquipment(item, g.edge, point, bounds) : { x: clamp(item.x + dx, 0, bounds.width - (item.width || 180)), y: clamp(item.y + dy, 0, bounds.height - (item.height || 80)) };
        item = { ...item, ...geometry };
        g.present = { ...g.base, placements: g.base.placements.map(p => p.equipmentId === g.id ? item : p) };
      } else {
        let geometry = item.geometry;
        if (item.type === 'wall') {
          if (g.edge) geometry = { ...geometry, [g.edge === 'start' ? 'x1' : 'x2']: point.x, [g.edge === 'start' ? 'y1' : 'y2']: point.y };
          else {
            const mx = clamp(dx, -Math.min(geometry.x1, geometry.x2), bounds.width - Math.max(geometry.x1, geometry.x2));
            const my = clamp(dy, -Math.min(geometry.y1, geometry.y2), bounds.height - Math.max(geometry.y1, geometry.y2));
            geometry = { x1: geometry.x1 + mx, y1: geometry.y1 + my, x2: geometry.x2 + mx, y2: geometry.y2 + my };
          }
        } else geometry = { x: clamp(geometry.x + dx, 0, bounds.width), y: clamp(geometry.y + dy, 0, bounds.height) };
        item = { ...item, geometry };
        g.present = { ...g.base, elements: g.base.elements.map(p => p.id === g.id ? item : p) };
      }
      setDraft(g.present); return;
    }
    if (g) { g.to = point; g.moved ||= Math.hypot(point.x - g.from.x, point.y - g.from.y) >= 20; }
    if (tool === 'wall' && (start.current || g)) setGuide({ type: 'wall', from: start.current || g.from, to: point });
    if (tool === 'rectangle' && g) setGuide({ type: 'rectangle', from: g.from, to: point });
    if (tool === 'opening' && start.current) {
      const wall = layout.elements.find(p => p.id === selected?.id);
      if (wall) setGuide({ type: 'opening', from: start.current, to: projectOnWall(wall, point) });
    }
  };
  const up = event => {
    const g = gesture.current; gesture.current = null;
    if (!g || g.kind === 'pan') return;
    const point = pointAt(event, g.id);
    if (g.kind === 'object') { if (g.present) dispatch({ type: 'commit', present: g.present }); setDraft(null); return; }
    if (placing) { onPlace(placing, point); reset(); setTool('select'); return; }
    if (tool === 'label') { onLabel({ geometry: point }); return; }
    if (tool === 'wall') {
      const from = start.current || (g.moved ? g.from : null);
      if (!from) { start.current = point; setGuide({ type: 'wall', from: point, to: point }); return; }
      const wall = createWallFromPoints(from, point, createMapId(), false);
      if (wall) { finish({ ...layout, elements: [...layout.elements, wall] }); setSelected({ kind: 'element', id: wall.id }); }
    }
    if (tool === 'rectangle') {
      const walls = createWallRectangle(g.from, point, createMapId);
      if (walls.length) { finish({ ...layout, elements: [...layout.elements, ...walls] }); setSelected({ kind: 'element', id: walls[0].id }); }
      else setGuide(null);
    }
    if (tool === 'opening') {
      const wall = layout.elements.find(p => p.id === selected?.id && p.type === 'wall');
      if (!wall) return;
      const projected = projectOnWall(wall, point);
      if (!start.current) { start.current = projected; setGuide({ type: 'opening', from: projected, to: projected }); return; }
      const parts = cutWall(wall, start.current, projected);
      if (parts) { finish({ ...layout, elements: layout.elements.flatMap(p => p.id === wall.id ? parts : [p]) }); setSelected(null); }
    }
  };

  return <div className={`map-canvas-wrap map-mode-${tool} ${panning ? 'is-panning' : ''}`} onDragOver={event => editing && event.preventDefault()} onDrop={event => {
    if (!editing) return; event.preventDefault(); const id = event.dataTransfer.getData('application/x-equipment-id');
    if (id) { onPlace(id, pointAt(event)); setTool('select'); }
  }}>
    <svg ref={svg} className="map-canvas" viewBox={`${view.x} ${view.y} ${bounds.width / view.zoom} ${bounds.height / view.zoom}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={reset} aria-label="План этажа" onClick={() => {
      if (editing) return; const id = clickedObject.current?.kind === 'equipment' ? clickedObject.current.id : null;
      if (id) onPreview(layout.placements.find(p => p.equipmentId === id)?.equipment);
    }} onDoubleClick={() => {
      if (!editing || tool !== 'select') return;
      const id = clickedObject.current?.kind === 'element' ? clickedObject.current.id : null;
      const item = layout.elements.find(p => p.id === id && p.type === 'label');
      if (item) onLabel(item);
    }}>
      <defs><pattern id="map-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" /></pattern></defs>
      <rect width={bounds.width} height={bounds.height} className="map-grid-bg" />
      {current.elements.map(item => item.type === 'wall' ? <g key={item.id} data-id={item.id} data-kind="element">
        <line className="map-wall-hit" {...item.geometry} />
        <line className={`map-wall ${selected?.id === item.id ? 'selected' : ''}`} {...item.geometry} />
        {editing && selected?.id === item.id && tool === 'select' && ['start', 'end'].map((edge, index) => <circle key={edge} data-id={item.id} data-kind="element" data-edge={edge} className="map-wall-handle" cx={item.geometry[index ? 'x2' : 'x1']} cy={item.geometry[index ? 'y2' : 'y1']} r={8 / view.zoom} />)}
      </g> : <text key={item.id} data-id={item.id} data-kind="element" className={`map-label ${selected?.id === item.id ? 'selected' : ''}`} x={item.geometry.x} y={item.geometry.y}>{item.label}</text>)}
      {current.placements.map(item => {
        if (!item.equipment) return null;
        const w = item.width || 180; const h = item.height || 80; const equipment = item.equipment;
        const status = statusPresentation(equipment.status);
        return <g key={item.equipmentId} data-id={item.equipmentId} data-kind="equipment" className={`map-equipment-marker ${status.className} ${selected?.id === item.equipmentId ? 'selected' : ''}`} transform={`translate(${item.x} ${item.y})`}>
          <title>{equipment.name} · {equipment.inventoryNumber || 'Без номера'} · {status.label}</title>
          <rect className="map-equipment-card" width={w} height={h} rx="8" />
          <rect className="map-equipment-status-bar" width="6" height={h} rx="3" />
          <text className="map-equipment-name" x="16" y="25">{equipment.name.length > Math.floor((w - 30) / 12) ? `${equipment.name.slice(0, Math.floor((w - 30) / 12))}…` : equipment.name}</text>
          <text className="map-equipment-number" x="16" y={Math.min(h - 15, 50)}>{equipment.inventoryNumber || 'Без номера'}</text>
          {editing && selected?.id === item.equipmentId && tool === 'select' && HANDLES.map(([edge, x, y]) => <rect key={edge} data-id={item.equipmentId} data-kind="equipment" data-edge={edge} className="map-resize-handle" x={w * x - 6 / view.zoom} y={h * y - 6 / view.zoom} width={12 / view.zoom} height={12 / view.zoom} rx="2" style={{ cursor: `${edge}-resize` }}><title>Изменить размер</title></rect>)}
        </g>;
      })}
      {guide && (guide.type === 'rectangle' ? <rect className="map-rectangle-preview" x={Math.min(guide.from.x, guide.to.x)} y={Math.min(guide.from.y, guide.to.y)} width={Math.abs(guide.from.x - guide.to.x)} height={Math.abs(guide.from.y - guide.to.y)} /> : <g className="map-guide"><line className={guide.type === 'opening' ? 'map-opening-preview' : 'map-wall-preview'} x1={guide.from.x} y1={guide.from.y} x2={guide.to.x} y2={guide.to.y} /><circle cx={guide.to.x} cy={guide.to.y} r="7" /></g>)}
    </svg>
    <div className="map-navigation"><button className="btn btn-small" aria-label="Уменьшить" onClick={() => zoomAt(1 / 1.25)}><Minus size={16} /></button><span>{Math.round(view.zoom * 100)}%</span><button className="btn btn-small" aria-label="Увеличить" onClick={() => zoomAt(1.25)}><Plus size={16} /></button><button className="btn btn-small" title="Показать весь этаж" onClick={() => setView({ x: 0, y: 0, zoom: 1 })}><LocateFixed size={16} /></button></div>
    <span className="map-navigation-hint">Колесо — масштаб · Пробел + мышь — перемещение</span>
  </div>;
}
