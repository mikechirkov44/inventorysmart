import { Link } from 'react-router-dom';
import { Hash, MapPin, X } from 'lucide-react';
import { statusPresentation } from './mapEditor';

export default function EquipmentMapPreview({ equipment, roomName, onClose }) {
  if (!equipment) return null;
  const status = statusPresentation(equipment.status);
  return (
    <div className="map-preview" role="dialog" aria-label={`Оборудование ${equipment.name}`}>
      <button type="button" className="btn-icon map-preview-close" onClick={onClose} aria-label="Закрыть"><X size={16} /></button>
      {equipment.photo && <img src={equipment.photo} alt="" />}
      <div className="map-preview-content">
        <span className={`map-status ${status.className}`}>{status.label}</span>
        <h3>{equipment.name}</h3>
        <p><Hash size={14} /> {equipment.inventoryNumber || 'Без инвентарного номера'}</p>
        <p><MapPin size={14} /> {roomName || 'Без помещения'}</p>
        <Link className="btn btn-small btn-primary" to={`/equipment/${equipment.id}`}>Открыть карточку</Link>
      </div>
    </div>
  );
}
