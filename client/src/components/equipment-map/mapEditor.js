export const GRID_SIZE = 20;
export const snap = (value, grid = GRID_SIZE) => Math.round(Number(value) / grid) * grid;

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
  if (action.type === 'moveElement') return push(state, { ...state.present, elements: state.present.elements.map((item) => {
    if (item.id !== action.id) return item;
    if (item.type === 'wall') {
      const dx = action.x - item.geometry.x1; const dy = action.y - item.geometry.y1;
      return { ...item, geometry: { ...item.geometry, x1: action.x, y1: action.y, x2: item.geometry.x2 + dx, y2: item.geometry.y2 + dy } };
    }
    return { ...item, geometry: { ...item.geometry, x: action.x, y: action.y } };
  }) });
  if (action.type === 'resizeElement') return push(state, { ...state.present, elements: state.present.elements.map((item) => item.id === action.id ? { ...item, geometry: { ...item.geometry, width: action.width, height: action.height } } : item) });
  if (action.type === 'deleteElement') return push(state, { ...state.present, elements: state.present.elements.filter((item) => item.id !== action.id) });
  if (action.type === 'placeEquipment') {
    const current = state.present.placements.find((item) => item.equipmentId === action.placement.equipmentId) || {};
    return push(state, { ...state.present, placements: [...state.present.placements.filter((item) => item.equipmentId !== action.placement.equipmentId), { rotation: 0, ...current, ...action.placement }] });
  }
  if (action.type === 'removePlacement') return push(state, { ...state.present, placements: state.present.placements.filter((item) => item.equipmentId !== action.equipmentId) });
  return state;
}
