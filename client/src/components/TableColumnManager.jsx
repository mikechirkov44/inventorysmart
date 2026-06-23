import { useState, useCallback } from 'react';
import { Settings, GripVertical, Eye, EyeOff, X, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * @module TableColumnManager
 * @description Компонент управления колонками таблицы (перетаскивание, видимость)
 * @param {Object} props
 * @param {Array} props.columns - Все колонки
 * @param {Function} props.onToggle - Переключение видимости
 * @param {Function} props.onMove - Перемещение колонки
 * @param {Function} props.onReset - Сброс к дефолту
 * @param {boolean} props.isOpen - Открыто ли меню
 * @param {Function} props.onClose - Закрыть меню
 */
function TableColumnManager({ columns, onToggle, onMove, onReset, isOpen, onClose }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // Для Firefox необходимо установить данные
    e.dataTransfer.setData('draggedIndex', String(index));
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedIndexData = e.dataTransfer.getData('draggedIndex');
    const textPlainData = e.dataTransfer.getData('text/plain');
    const sourceIndex = parseInt(draggedIndexData || textPlainData, 10);
    
    if (!isNaN(sourceIndex) && sourceIndex !== dropIndex) {
      onMove(sourceIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [onMove]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  if (!isOpen) return null;

  const modal = (
    <div className="table-settings-modal-overlay" onClick={onClose}>
      <div className="table-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="table-settings-header">
          <h3><Settings size={18} /> Настройка колонок</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div className="table-settings-content">
          <p className="table-settings-hint">
            Перетащите для изменения порядка. Кликните по глазу для скрытия/отображения.
          </p>
          
          <div className="table-columns-list">
            {columns.map((col, index) => (
              <div
                key={col.key}
                className={`table-column-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''} ${col.visible === false ? 'hidden' : ''}`}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
              >
                <GripVertical size={16} className="drag-handle" />
                <span className="column-label">{col.label}</span>
                <button
                  className={`btn-icon btn-visibility ${col.visible === false ? 'hidden' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(col.key);
                  }}
                  title={col.visible === false ? 'Показать' : 'Скрыть'}
                >
                  {col.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="table-settings-footer">
          <button className="btn btn-secondary btn-small" onClick={onReset}>
            <RotateCcw size={14} /> Сбросить
          </button>
          <button className="btn btn-primary btn-small" onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/**
 * @module TableSettingsButton
 * @description Кнопка открытия настроек таблицы
 */
export function TableSettingsButton({ onClick, visibleColumns, totalColumns }) {
  return (
    <button 
      className="btn btn-secondary btn-small table-settings-btn" 
      onClick={onClick}
      title="Настройка колонок"
    >
      <Settings size={14} />
      <span>{visibleColumns}/{totalColumns}</span>
    </button>
  );
}

export default TableColumnManager;
