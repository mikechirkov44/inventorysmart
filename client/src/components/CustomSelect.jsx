import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom styled select dropdown — SaaS-style.
 * Props:
 *   value - current value
 *   onChange - callback(newValue)
 *   options - [{value, label}]
 *   placeholder - placeholder text
 *   className - extra CSS class
 *   disabled - boolean
 */
export default function CustomSelect({ value, onChange, options = [], placeholder = 'Выберите...', className = '', disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`cs-wrapper ${disabled ? 'cs-disabled' : ''} ${className}`}>
      <button type="button" className={`cs-trigger ${open ? 'cs-open' : ''}`} onClick={() => !disabled && setOpen(!open)} disabled={disabled}>
        <span className={!selected ? 'cs-placeholder' : ''}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={`cs-chevron ${open ? 'cs-chevron-open' : ''}`} />
      </button>
      {open && (
        <div className="cs-dropdown">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`cs-option ${opt.value === value ? 'cs-selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
