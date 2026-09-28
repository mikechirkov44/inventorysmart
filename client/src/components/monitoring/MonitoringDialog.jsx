import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import EquipmentMonitoring from './EquipmentMonitoring';

export default function MonitoringDialog({ equipment, date, onClose }) {
  const ref = useRef(null);
  const [selectedDate, setSelectedDate] = useState(date);
  useEffect(() => {
    const dialog = ref.current; const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="monitor-modal" aria-labelledby="monitor-modal-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="monitor-modal-header"><div><h2 id="monitor-modal-title">{equipment.name}</h2><span>{equipment.inventoryNumber || 'Без инвентарного номера'}</span></div><div><Link className="btn btn-small" to={`/equipment/${equipment.id}?monitoringDate=${selectedDate}#equipment-monitoring`} onClick={onClose}>Карточка оборудования</Link><button className="btn btn-small" aria-label="Закрыть мониторинг" onClick={onClose}><X size={18} /></button></div></div>
    <EquipmentMonitoring equipmentId={equipment.id} initialDate={date} onDateChange={setSelectedDate} compact />
  </dialog>, document.body);
}
