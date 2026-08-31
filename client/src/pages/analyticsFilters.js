export function buildRoomFilterOptions(rooms) {
  return [
    { value: '', label: 'Все' },
    ...rooms.map((room) => ({ value: room.id, label: room.name })),
  ];
}
