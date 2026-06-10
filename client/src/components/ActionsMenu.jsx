import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

/**
 * Reusable action dropdown menu for table rows.
 * Uses portal to render dropdown outside of table containers to avoid overflow clipping.
 */
export default function ActionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left - 120 + rect.width / 2,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const handleClick = (e) => {
        if (
          dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)
        ) {
          setOpen(false);
        }
      };
      const handleScroll = () => setOpen(false);
      const handleResize = () => updatePosition();

      document.addEventListener('mousedown', handleClick);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        document.removeEventListener('mousedown', handleClick);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [open]);

  const handleItemClick = (onClick) => {
    setOpen(false);
    onClick();
  };

  return (
    <div className="actions-menu">
      <button
        ref={btnRef}
        className="actions-menu-btn"
        onClick={() => {
          if (!open) updatePosition();
          setOpen(!open);
        }}
        aria-label="Действия"
      >
        <MoreVertical size={16} />
      </button>
      {open && createPortal(
        <div ref={dropdownRef} className="actions-menu-dropdown" style={menuStyle}>
          {items.map((item, idx) => (
            <button
              key={idx}
              className={`actions-menu-item ${item.danger ? 'danger' : ''}`}
              onClick={() => handleItemClick(item.onClick)}
            >
              {item.icon && <span className="actions-menu-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
