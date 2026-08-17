import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

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
 *   searchable - показывает поиск по вариантам
 */
export default function CustomSelect({ value, onChange, options = [], placeholder = 'Выберите...', className = '', disabled = false, searchable = false, searchPlaceholder = 'Поиск...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
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
    const naturalHeight = options.length * itemH + pad + (searchable ? 48 : 0);
    const spaceBelow = winH - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const preferBelow = spaceBelow >= Math.min(naturalHeight, 160) || spaceBelow >= spaceAbove;
    const available = Math.max(120, preferBelow ? spaceBelow : spaceAbove);
    const maxH = Math.min(naturalHeight, available, Math.floor(winH * 0.6));
    const needsScroll = naturalHeight > maxH;
    const dropdownHeight = needsScroll ? maxH : naturalHeight;

    let top = preferBelow ? rect.bottom + 4 : Math.max(8, rect.top - dropdownHeight - 4);
    if (preferBelow && top + dropdownHeight > winH - 8) {
      top = Math.max(8, winH - dropdownHeight - 8);
    }

    // Width: at least trigger width, but allow expansion up to viewport
    const minW = rect.width;
    const maxW = Math.min(480, winW - rect.left - 16);

    setPos({ top, left: rect.left, minWidth: minW, maxWidth: maxW, maxHeight: needsScroll ? maxH : 'none' });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const onScroll = (event) => {
        if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
        setOpen(false);
      };
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
  const normalizedSearch = search.trim().toLocaleLowerCase('ru');
  const filteredOptions = normalizedSearch
    ? options.filter((option) => `${option.label} ${option.searchText || ''}`.toLocaleLowerCase('ru').includes(normalizedSearch))
    : options;

  const handleToggle = () => {
    if (disabled) return;
    if (!open) updatePosition();
    setOpen(!open);
    if (open) setSearch('');
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
          {searchable && (
            <div className="cs-search" onClick={(event) => event.stopPropagation()}>
              <Search size={15} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
              />
            </div>
          )}
          {filteredOptions.map(opt => (
            <div
              key={opt.value}
              className={`cs-option ${opt.value === value ? 'cs-selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14} />}
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <div className="cs-empty">Ничего не найдено</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
