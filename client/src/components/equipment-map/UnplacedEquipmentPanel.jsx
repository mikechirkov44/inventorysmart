import { Search } from 'lucide-react';
import { statusPresentation } from './mapEditor';

export default function UnplacedEquipmentPanel({ items, search, setSearch, selectedId, onChoose }) {
  return (
    <aside className="map-unplaced">
      <h3>Не размещено <span>{items.length}</span></h3>
      <p className="map-panel-help">Выберите оборудование, затем нажмите место на плане. Или перетащите карточку.</p>
      <label className="map-equipment-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти оборудование" /></label>
      <div className="map-unplaced-list">
        {items.map((item) => { const status = statusPresentation(item.status); return (
          <button type="button" key={item.id} className={`map-unplaced-item ${selectedId === item.id ? 'is-selected' : ''}`} aria-pressed={selectedId === item.id} onClick={() => onChoose(item.id)} draggable onDragStart={(event) => event.dataTransfer.setData('application/x-equipment-id', item.id)}>
            <strong>{item.name}</strong><small>{item.inventoryNumber || 'Без номера'}</small><span className={`map-status-dot ${status.className}`} title={status.label} />
          </button>
        ); })}
        {!items.length && <p className="map-panel-empty">{search ? 'Ничего не найдено' : 'Всё оборудование размещено'}</p>}
      </div>
    </aside>
  );
}
