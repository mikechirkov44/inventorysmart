import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomFilterOptions } from './analyticsFilters.js';

test('room filter starts with an option that clears the selected room', () => {
  const rooms = [
    { id: 'room-1', name: 'ИТ' },
    { id: 'room-2', name: 'Лаборатория' },
  ];

  assert.deepEqual(buildRoomFilterOptions(rooms), [
    { value: '', label: 'Все' },
    { value: 'room-1', label: 'ИТ' },
    { value: 'room-2', label: 'Лаборатория' },
  ]);
});
