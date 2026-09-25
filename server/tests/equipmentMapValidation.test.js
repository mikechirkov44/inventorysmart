const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLayoutPayload } = require('../utils/equipmentMapValidation');

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('normalises valid room, wall, label and placement data', () => {
  const result = validateLayoutPayload({
    version: 2,
    elements: [
      { id: uuid(1), type: 'room', roomId: uuid(2), geometry: { x: 10, y: 20, width: 300, height: 200 } },
      { id: uuid(3), type: 'wall', geometry: { x1: 0, y1: 0, x2: 200, y2: 0 } },
      { id: uuid(4), type: 'label', label: 'Вход', geometry: { x: 50, y: 50 } },
    ],
    placements: [{ equipmentId: uuid(5), x: 100, y: 120 }],
  }, { width: 1600, height: 900 });
  assert.equal(result.version, 2);
  assert.equal(result.elements.length, 3);
  assert.equal(result.placements[0].rotation, 0);
});

test('rejects unsupported element types', () => {
  assert.throws(() => validateLayoutPayload({ version: 0, elements: [{ id: uuid(1), type: 'circle', geometry: {} }], placements: [] }, { width: 100, height: 100 }), /тип элемента/i);
});

test('rejects non-finite and out-of-bounds geometry', () => {
  assert.throws(() => validateLayoutPayload({ version: 0, elements: [{ id: uuid(1), type: 'wall', geometry: { x1: -1, y1: 0, x2: 20, y2: 20 } }], placements: [] }, { width: 100, height: 100 }), /границ/i);
  assert.throws(() => validateLayoutPayload({ version: 0, elements: [], placements: [{ equipmentId: uuid(2), x: 'NaN', y: 1 }] }, { width: 100, height: 100 }), /числ/i);
});

test('rejects duplicate equipment placements', () => {
  assert.throws(() => validateLayoutPayload({ version: 0, elements: [], placements: [
    { equipmentId: uuid(2), x: 1, y: 1 }, { equipmentId: uuid(2), x: 2, y: 2 },
  ] }, { width: 500, height: 400 }), /повтор/i);
});

test('rejects duplicate element ids and overlapping rooms', () => {
  const room = { id: uuid(1), type: 'room', roomId: uuid(2), geometry: { x: 10, y: 10, width: 50, height: 50 } };
  assert.throws(() => validateLayoutPayload({ version: 0, elements: [room, room], placements: [] }, { width: 200, height: 200 }), /повтор/i);
  assert.throws(() => validateLayoutPayload({ version: 0, elements: [room, { ...room, id: uuid(3), roomId: uuid(4), geometry: { x: 30, y: 30, width: 50, height: 50 } }], placements: [] }, { width: 200, height: 200 }), /пересека/i);
});

test('rejects oversized layouts', () => {
  const elements = Array.from({ length: 501 }, (_, index) => ({ id: uuid(index + 1), type: 'label', label: 'x', geometry: { x: 1, y: 1 } }));
  assert.throws(() => validateLayoutPayload({ version: 0, elements, placements: [] }, { width: 100, height: 100 }), /500/);
});

test('normalises equipment block size and rejects blocks outside the floor', () => {
  const result = validateLayoutPayload({ version: 0, elements: [], placements: [{ equipmentId: uuid(8), x: 10, y: 20, width: 220, height: 100 }] }, { width: 500, height: 400 });
  assert.equal(result.placements[0].width, 220);
  assert.equal(result.placements[0].height, 100);
  assert.throws(() => validateLayoutPayload({ version: 0, elements: [], placements: [{ equipmentId: uuid(8), x: 450, y: 20, width: 180, height: 80 }] }, { width: 500, height: 400 }), /границ/i);
});
