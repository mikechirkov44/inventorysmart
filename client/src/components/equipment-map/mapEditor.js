export const GRID_SIZE = 20;
// randomUUID is unavailable on HTTP hosts; getRandomValues also works there.
export function createMapId(source = globalThis.crypto) {
  if (typeof source.randomUUID === 'function') return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export const snap = (value, grid = GRID_SIZE) => Math.round(Number(value) / grid) * grid;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function projectOnWall(wall, point) {
  const { x1, y1, x2, y2 } = wall.geometry;
  const dx = x2 - x1; const dy = y2 - y1;
  const t = clamp(((point.x - x1) * dx + (point.y - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return { x: x1 + t * dx, y: y1 + t * dy, t };
}

export function cutWall(wall, from, to, makeId = createMapId) {
  const points = [projectOnWall(wall, from), projectOnWall(wall, to)].sort((a, b) => a.t - b.t);
  const [a, b] = points;
  if (Math.hypot(a.x - b.x, a.y - b.y) < 1) return null;
  const g = wall.geometry; const parts = [];
  if (a.t > 0.001) parts.push({ ...wall, geometry: { ...g, x2: a.x, y2: a.y } });
  if (b.t < 0.999) parts.push({ ...wall, id: makeId(), geometry: { ...g, x1: b.x, y1: b.y } });
  return parts;
}

export function resizeEquipment(item, edge, point, bounds) {
  let { x, y } = item; let right = x + (item.width || 180); let bottom = y + (item.height || 80);
  if (edge.includes('w')) x = clamp(point.x, Math.max(0, right - 500), right - 100);
  if (edge.includes('e')) right = clamp(point.x, x + 100, Math.min(bounds.width, x + 500));
  if (edge.includes('n')) y = clamp(point.y, Math.max(0, bottom - 300), bottom - 60);
  if (edge.includes('s')) bottom = clamp(point.y, y + 60, Math.min(bounds.height, y + 300));
  return { x, y, width: right - x, height: bottom - y };
}

export function createWallFromPoints(start, end, id, snapToGrid = true) {
  const resolve = snapToGrid ? snap : Number;
  const x1 = resolve(start.x); const y1 = resolve(start.y); const x2 = resolve(end.x); const y2 = resolve(end.y);
  if (x1 === x2 && y1 === y2) return null;
  return { id, type: 'wall', geometry: { x1, y1, x2, y2 }, style: {} };
}

export function createWallRectangle(start, end, makeId) {
  const left = Math.min(snap(start.x), snap(end.x)); const right = Math.max(snap(start.x), snap(end.x));
  const top = Math.min(snap(start.y), snap(end.y)); const bottom = Math.max(snap(start.y), snap(end.y));
  if (right - left < GRID_SIZE || bottom - top < GRID_SIZE) return [];
  return [
    createWallFromPoints({ x: left, y: top }, { x: right, y: top }, makeId()),
    createWallFromPoints({ x: right, y: top }, { x: right, y: bottom }, makeId()),
    createWallFromPoints({ x: right, y: bottom }, { x: left, y: bottom }, makeId()),
    createWallFromPoints({ x: left, y: bottom }, { x: left, y: top }, makeId()),
  ];
}

const STATUS = {
  working: { label: 'Работает', className: 'map-status-working' },
  reserve: { label: 'Резерв', className: 'map-status-reserve' },
  under_repair: { label: 'В ремонте', className: 'map-status-repair' },
  needs_repair: { label: 'Требует ремонта', className: 'map-status-alert' },
};
export const statusPresentation = (status) => STATUS[status] || { label: 'Статус не указан', className: 'map-status-unknown' };

const empty = { elements: [], placements: [] };
export const initialEditorState = { past: [], future: [], present: empty, dirty: false };
const push = (state, present) => ({ past: [...state.past.slice(-49), state.present], future: [], present, dirty: true });

export function editorReducer(state, action) {
  if (action.type === 'load') return { past: [], future: [], present: { elements: action.elements || [], placements: action.placements || [] }, dirty: false };
  if (action.type === 'saved') return { ...state, dirty: action.snapshot ? state.present !== action.snapshot : false };
  if (action.type === 'commit') return action.present === state.present ? state : push(state, action.present);
  if (action.type === 'redo') {
    if (!state.future?.length) return state;
    return { past: [...state.past, state.present], future: state.future.slice(1), present: state.future[0], dirty: true };
  }
  if (action.type === 'undo') {
    if (!state.past.length) return state;
    return { past: state.past.slice(0, -1), future: [state.present, ...(state.future || [])], present: state.past[state.past.length - 1], dirty: true };
  }
  if (action.type === 'addElement') return push(state, { ...state.present, elements: [...state.present.elements, action.element] });
  if (action.type === 'addElements') return push(state, { ...state.present, elements: [...state.present.elements, ...action.elements] });
  if (action.type === 'moveElement') return push(state, { ...state.present, elements: state.present.elements.map((item) => {
    if (item.id !== action.id) return item;
    if (item.type === 'wall') {
      const dx = action.x - item.geometry.x1; const dy = action.y - item.geometry.y1;
      return { ...item, geometry: { ...item.geometry, x1: action.x, y1: action.y, x2: item.geometry.x2 + dx, y2: item.geometry.y2 + dy } };
    }
    return { ...item, geometry: { ...item.geometry, x: action.x, y: action.y } };
  }) });
  if (action.type === 'resizeElement') return push(state, { ...state.present, elements: state.present.elements.map((item) => item.id === action.id ? { ...item, geometry: { ...item.geometry, width: action.width, height: action.height } } : item) });
  if (action.type === 'moveWallEndpoint') return push(state, { ...state.present, elements: state.present.elements.map((item) => {
    if (item.id !== action.id || item.type !== 'wall') return item;
    const keys = action.endpoint === 'start' ? { x: 'x1', y: 'y1' } : { x: 'x2', y: 'y2' };
    return { ...item, geometry: { ...item.geometry, [keys.x]: action.x, [keys.y]: action.y } };
  }) });
  if (action.type === 'deleteElement') return push(state, { ...state.present, elements: state.present.elements.filter((item) => item.id !== action.id) });
  if (action.type === 'placeEquipment') {
    const current = state.present.placements.find((item) => item.equipmentId === action.placement.equipmentId) || {};
    return push(state, { ...state.present, placements: [...state.present.placements.filter((item) => item.equipmentId !== action.placement.equipmentId), { rotation: 0, width: 180, height: 80, ...current, ...action.placement }] });
  }
  if (action.type === 'resizePlacement') return push(state, { ...state.present, placements: state.present.placements.map((item) => item.equipmentId === action.equipmentId ? { ...item, width: action.width, height: action.height } : item) });
  if (action.type === 'removePlacement') return push(state, { ...state.present, placements: state.present.placements.filter((item) => item.equipmentId !== action.equipmentId) });
  return state;
}
