import { BoxSelect, MousePointer2, Redo2, Tag, Undo2 } from 'lucide-react';

export default function MapToolbar({ tool, setTool, rooms, roomId, setRoomId, onCreateRoom, onUndo, canUndo, onDelete }) {
  return (
    <aside className="map-toolbar" aria-label="Инструменты карты">
      <button type="button" className={`btn btn-small ${tool === 'select' ? 'btn-primary' : ''}`} onClick={() => setTool('select')}><MousePointer2 size={15} /> Выбор</button>
      <button type="button" className={`btn btn-small ${tool === 'room' ? 'btn-primary' : ''}`} onClick={() => setTool('room')}><BoxSelect size={15} /> Помещение</button>
      <button type="button" title="Зажмите кнопку мыши и протяните стену или укажите начало и конец двумя кликами" className={`btn btn-small ${tool === 'wall' ? 'btn-primary' : ''}`} onClick={() => setTool('wall')}><Redo2 size={15} /> Стена</button>
      <button type="button" className={`btn btn-small ${tool === 'label' ? 'btn-primary' : ''}`} onClick={() => setTool('label')}><Tag size={15} /> Метка</button>
      {tool === 'room' && <select value={roomId} onChange={(event) => setRoomId(event.target.value)} aria-label="Помещение">
        <option value="">Выберите помещение</option>{rooms.map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}
      </select>}
      {tool === 'room' && <button type="button" className="btn btn-small" onClick={onCreateRoom}>+ Новое помещение</button>}
      <span className="map-toolbar-spacer" />
      <button type="button" className="btn btn-small" disabled={!canUndo} onClick={onUndo}><Undo2 size={15} /> Отменить</button>
      <button type="button" className="btn btn-small btn-danger-outline" onClick={onDelete}>Удалить выбранное</button>
    </aside>
  );
}
