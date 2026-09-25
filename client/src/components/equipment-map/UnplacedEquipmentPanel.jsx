import { Search } from 'lucide-react';
import { statusPresentation } from './mapEditor';

export default function UnplacedEquipmentPanel({ items, search, setSearch }) {
  return (
    <aside className="map-unplaced">
      <h3>Не размещено <span>{items.length}</span></h3>
      <label className="map-equipment-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти оборудование" /></label>
      <div className="map-unplaced-list">
        {items.map((item) => { const status = statusPresentation(item.status); return (
          <div key={item.id} className="map-unplaced-item" draggable onDragStart={(event) => event.dataTransfer.setData('application/x-equipment-id', item.id)}>
            <strong>{item.name}</strong><small>{item.inventoryNumber || 'Без номера'}</small><span className={`map-status-dot ${status.className}`} title={status.label} />
          </div>
        ); })}
        {!items.length && <p className="map-panel-empty">Всё оборудование размещено</p>}
      </div>
    </aside>
  );
}
