import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom styled select dropdown — SaaS-style.
 * Portal-based (position: fixed) to avoid clipping inside overflow containers.
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
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const winH = window.innerHeight;
    const winW = window.innerWidth;
    const itemH = 36;
    const pad = 16;
    const naturalHeight = options.length * itemH + pad;
    const maxH = Math.min(naturalHeight, Math.floor(winH * 0.45));
    const needsScroll = naturalHeight > maxH;
    const dropdownHeight = needsScroll ? maxH : naturalHeight;

    let top = rect.bottom + 4;
    if (top + dropdownHeight > winH - 8) {
      top = Math.max(8, rect.top - dropdownHeight - 4);
    }

    // Width: at least trigger width, but allow expansion up to viewport
    const minW = rect.width;
    const maxW = Math.min(400, winW - rect.left - 16);

    setPos({ top, left: rect.left, minWidth: minW, maxWidth: maxW, maxHeight: needsScroll ? maxH : 'none' });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const onScroll = () => setOpen(false);
      const onResize = () => setOpen(false);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
      };
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open]);

  const selected = options.find(o => o.value === value);

  const handleToggle = () => {
    if (disabled) return;
    if (!open) updatePosition();
    setOpen(!open);
  };

  return (
    <div ref={wrapperRef} className={`cs-wrapper ${disabled ? 'cs-disabled' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`cs-trigger ${open ? 'cs-open' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className={!selected ? 'cs-placeholder' : ''}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={`cs-chevron ${open ? 'cs-chevron-open' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="cs-dropdown"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            minWidth: pos.minWidth,
            maxWidth: pos.maxWidth,
            maxHeight: pos.maxHeight,
            zIndex: 99999,
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
