import { BoxSelect, MousePointer2, Redo2, Tag, Undo2 } from 'lucide-react';

const HINTS = {
  select: 'Нажмите объект, чтобы переместить, изменить размер или удалить его',
  wall: 'Зажмите мышь на карте и протяните до конца стены',
  rectangle: 'Зажмите мышь и растяните прямоугольник — получится четыре отдельные стены',
  label: 'Введите текст и нажмите нужное место на карте',
};

export default function MapToolbar({ tool, setTool, labelText, setLabelText, onUndo, canUndo, onDelete, hasSelection }) {
  return (
    <aside className="map-toolbar" aria-label="Инструменты карты">
      <button type="button" className={`btn btn-small ${tool === 'select' ? 'btn-primary' : ''}`} onClick={() => setTool('select')}><MousePointer2 size={15} /> Выбор</button>
      <button type="button" title="Зажмите кнопку мыши и протяните стену или укажите начало и конец двумя кликами" className={`btn btn-small ${tool === 'wall' ? 'btn-primary' : ''}`} onClick={() => setTool('wall')}><Redo2 size={15} /> Стена</button>
      <button type="button" className={`btn btn-small ${tool === 'rectangle' ? 'btn-primary' : ''}`} onClick={() => setTool('rectangle')}><BoxSelect size={15} /> Прямоугольник</button>
      <button type="button" className={`btn btn-small ${tool === 'label' ? 'btn-primary' : ''}`} onClick={() => setTool('label')}><Tag size={15} /> Метка</button>
      {tool === 'label' && <input className="map-label-input" value={labelText} onChange={(event) => setLabelText(event.target.value)} placeholder="Текст метки" autoFocus />}
      <span className="map-tool-hint">{HINTS[tool]}</span>
      <span className="map-toolbar-spacer" />
      <button type="button" className="btn btn-small" disabled={!canUndo} onClick={onUndo}><Undo2 size={15} /> Отменить</button>
      <button type="button" className="btn btn-small btn-danger-outline" disabled={!hasSelection} onClick={onDelete}>Удалить выбранное</button>
    </aside>
  );
}
