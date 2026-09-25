import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapId, createWallFromPoints, createWallRectangle, editorReducer, initialEditorState, statusPresentation, snap } from './mapEditor.js';

test('map IDs work on HTTP without randomUUID and remain valid UUID v4', () => {
  const source = { getRandomValues: (bytes) => globalThis.crypto.getRandomValues(bytes) };
  const ids = Array.from({ length: 100 }, () => createMapId(source));
  assert.equal(new Set(ids).size, 100);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

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
test('wall drawing gesture creates a snapped wall and ignores a zero-length gesture', () => {
  const wall = createWallFromPoints({ x: 21, y: 39 }, { x: 181, y: 42 }, 'wall-1');
  assert.deepEqual(wall.geometry, { x1: 20, y1: 40, x2: 180, y2: 40 });
  assert.equal(createWallFromPoints({ x: 20, y: 20 }, { x: 21, y: 21 }, 'wall-2'), null);
});
test('equipment cards receive defaults and can be resized', () => {
  let state = editorReducer(initialEditorState, { type: 'load', elements: [], placements: [] });
  state = editorReducer(state, { type: 'placeEquipment', placement: { equipmentId: 'eq-2', x: 10, y: 10 } });
  assert.equal(state.present.placements[0].width, 180);
  assert.equal(state.present.placements[0].height, 80);
  state = editorReducer(state, { type: 'resizePlacement', equipmentId: 'eq-2', width: 260, height: 120 });
  assert.equal(state.present.placements[0].width, 260);
  assert.equal(state.present.placements[0].height, 120);
});
test('rectangle tool creates four independent wall segments', () => {
  const walls = createWallRectangle({ x: 21, y: 19 }, { x: 221, y: 139 }, () => `wall-${Math.random()}`);
  assert.equal(walls.length, 4);
  assert.deepEqual(walls.map((wall) => wall.geometry), [
    { x1: 20, y1: 20, x2: 220, y2: 20 },
    { x1: 220, y1: 20, x2: 220, y2: 140 },
    { x1: 220, y1: 140, x2: 20, y2: 140 },
    { x1: 20, y1: 140, x2: 20, y2: 20 },
  ]);
});
test('wall endpoints can be moved independently', () => {
  let state = editorReducer(initialEditorState, { type: 'load', elements: [{ id: 'wall-1', type: 'wall', geometry: { x1: 20, y1: 20, x2: 100, y2: 20 } }], placements: [] });
  state = editorReducer(state, { type: 'moveWallEndpoint', id: 'wall-1', endpoint: 'end', x: 140, y: 60 });
  assert.deepEqual(state.present.elements[0].geometry, { x1: 20, y1: 20, x2: 140, y2: 60 });
});
