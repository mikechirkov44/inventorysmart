import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Square } from 'lucide-react';
import CustomSelect from '../CustomSelect';

export default function MapRoomDialog({ rooms, usedRoomIds, initialRoomId = '', onClose, onSubmit }) {
  const available = rooms.filter((room) => room.id === initialRoomId || !usedRoomIds.includes(room.id));
  const [mode, setMode] = useState(initialRoomId || available.length ? 'existing' : 'new');
  const [roomId, setRoomId] = useState(initialRoomId || available[0]?.id || '');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const form = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    form.current.querySelector('button, input')?.focus();
    return () => previous?.focus();
  }, []);

  const canSave = mode === 'new' ? Boolean(name.trim()) : Boolean(roomId);
  const submit = async (event) => {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onSubmit(mode === 'new' ? { name: name.trim() } : { roomId });
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="confirm-overlay" onClick={onClose}>
      <form ref={form} className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="map-room-title" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <div className="confirm-icon confirm-icon-info"><Square size={24} /></div>
        <h3 id="map-room-title" className="confirm-title">{initialRoomId ? 'Помещение на плане' : 'Новое помещение'}</h3>
        <p className="confirm-message">Зона берёт название из справочника помещений.</p>
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label>Источник</label>
          <CustomSelect
            value={mode}
            onChange={setMode}
            options={[
              { value: 'existing', label: 'Из справочника' },
              { value: 'new', label: 'Новое помещение' },
            ]}
          />
        </div>
        {mode === 'existing' ? (
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label>Помещение</label>
            <CustomSelect
              value={roomId}
              onChange={setRoomId}
              placeholder={available.length ? 'Выберите помещение' : 'В справочнике нет свободных помещений'}
              searchable
              options={available.map((room) => ({ value: room.id, label: room.name }))}
            />
          </div>
        ) : (
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label htmlFor="map-room-name">Название</label>
            <input id="map-room-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Например, Цех литья" autoComplete="off" />
          </div>
        )}
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave || saving}>{saving ? 'Сохранение...' : 'Поставить на план'}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
