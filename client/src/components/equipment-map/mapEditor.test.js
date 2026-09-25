import test from 'node:test';
import assert from 'node:assert/strict';
import { editorReducer, initialEditorState, statusPresentation, snap } from './mapEditor.js';

test('snap rounds coordinates to the editor grid', () => assert.equal(snap(27, 20), 20));
test('status presentation has a safe fallback', () => {
  assert.equal(statusPresentation('reserve').label, 'Резерв');
  assert.equal(statusPresentation('future').label, 'Статус не указан');
});
test('editor adds, moves, deletes and undoes elements', () => {
  const added = editorReducer(initialEditorState, { type: 'load', elements: [], placements: [] });
  const withRoom = editorReducer(added, { type: 'addElement', element: { id: 'room-1', type: 'room', geometry: { x: 20, y: 20, width: 100, height: 80 } } });
  const moved = editorReducer(withRoom, { type: 'moveElement', id: 'room-1', x: 60, y: 80 });
  assert.equal(moved.present.elements[0].geometry.x, 60);
  const removed = editorReducer(moved, { type: 'deleteElement', id: 'room-1' });
  assert.equal(removed.present.elements.length, 0);
  assert.equal(editorReducer(removed, { type: 'undo' }).present.elements.length, 1);
});
test('placing the same equipment moves rather than duplicates it', () => {
  let state = editorReducer(initialEditorState, { type: 'load', elements: [], placements: [] });
  state = editorReducer(state, { type: 'placeEquipment', placement: { equipmentId: 'eq-1', x: 10, y: 10 } });
  state = editorReducer(state, { type: 'placeEquipment', placement: { equipmentId: 'eq-1', x: 50, y: 60 } });
  assert.equal(state.present.placements.length, 1);
  assert.equal(state.present.placements[0].x, 50);
});
