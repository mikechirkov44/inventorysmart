import { BoxSelect, MousePointer2, Minus, Tag, Undo2, Redo2 } from 'lucide-react';

const TOOLS = [['select', 'Выбор', MousePointer2], ['wall', 'Стена', Minus], ['rectangle', 'Прямоугольник', BoxSelect], ['label', 'Метка', Tag]];
const HINTS = {
  select: 'Нажмите объект, чтобы выделить. Потяните за него, чтобы переместить.',
  wall: 'Нажмите начало стены, затем конец. Esc — отмена.',
  rectangle: 'Зажмите мышь и растяните прямоугольник из четырёх стен.',
  label: 'Нажмите место на плане и введите название.',
  opening: 'Укажите начало и конец проёма на выбранной стене. Esc — отмена.',
};
export default function MapToolbar({ tool, setTool, placing, onUndo, onRedo, canUndo, canRedo }) {
  return <div className="map-tools-container"><aside className="map-toolbar" aria-label="Инструменты карты">
    {TOOLS.map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={tool === value && !placing} className={`btn btn-small ${tool === value && !placing ? 'btn-primary' : ''}`} onClick={() => setTool(value)}><Icon size={17} />{label}</button>)}
    <span className="map-toolbar-spacer" />
    <button className="btn btn-small" title="Ctrl+Z" disabled={!canUndo} onClick={onUndo}><Undo2 size={17} />Отменить</button>
    <button className="btn btn-small" title="Ctrl+Shift+Z" disabled={!canRedo} onClick={onRedo}><Redo2 size={17} />Повторить</button>
  </aside><div className="map-instruction" role="status">{placing ? 'Нажмите на плане, чтобы поставить выбранное оборудование. Esc — отмена.' : HINTS[tool]}</div></div>;
}
