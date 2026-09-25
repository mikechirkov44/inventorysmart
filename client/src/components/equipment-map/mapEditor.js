export const GRID_SIZE = 20;
export const snap = (value, grid = GRID_SIZE) => Math.round(Number(value) / grid) * grid;

export function createWallFromPoints(start, end, id) {
  const x1 = snap(start.x); const y1 = snap(start.y); const x2 = snap(end.x); const y2 = snap(end.y);
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
export const initialEditorState = { past: [], present: empty, dirty: false };
const push = (state, present) => ({ past: [...state.past.slice(-29), state.present], present, dirty: true });

export function editorReducer(state, action) {
  if (action.type === 'load') return { past: [], present: { elements: action.elements || [], placements: action.placements || [] }, dirty: false };
  if (action.type === 'saved') return { ...state, dirty: false };
  if (action.type === 'undo') {
    if (!state.past.length) return state;
    return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], dirty: true };
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
