import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag } from 'lucide-react';

export default function MapLabelDialog({ onClose, onSubmit, initialName = '', editingLabel = false }) {
  const [name, setName] = useState(initialName);
  const form = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    form.current.querySelector('input').focus();
    return () => previous?.focus();
  }, []);
  const keyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key === 'Tab') {
      const items = [...form.current.querySelectorAll('input, button:not(:disabled)')];
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  return createPortal(
    <div className="confirm-overlay" onClick={onClose}>
      <form ref={form} className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="map-label-title" onKeyDown={keyDown} onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSubmit(name.trim()); }}>
        <div className="confirm-icon confirm-icon-info"><Tag size={24} /></div>
        <h3 id="map-label-title" className="confirm-title">{editingLabel ? 'Название метки' : 'Новая метка'}</h3>
        <p className="confirm-message">Название появится в выбранном месте на плане.</p>
        <div className="form-group" style={{ textAlign: 'left' }}>
          <label htmlFor="map-label-name">Название метки</label>
          <input id="map-label-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Например, Цех литья" autoComplete="off" />
        </div>
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>{editingLabel ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </form>
    </div>, document.body,
  );
}
