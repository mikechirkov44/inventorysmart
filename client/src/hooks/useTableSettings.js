import { useState, useEffect, useCallback } from 'react';

/**
 * @module useTableSettings
 * @description Хук для управления настройками таблиц (колонки, порядок, видимость)
 * @param {string} tableId - Уникальный идентификатор таблицы
 * @param {Array} defaultColumns - Колонки по умолчанию
 * @returns {Object} Настройки таблицы и методы управления
 */
export function useTableSettings(tableId, defaultColumns) {
  const storageKey = `table_settings_${tableId}`;

  const [columns, setColumns] = useState(() => {
    if (typeof window === 'undefined') return defaultColumns;
    
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with default columns to handle new columns
        const merged = defaultColumns.map(defCol => {
          const savedCol = parsed.find(c => c.key === defCol.key);
          return savedCol ? { ...defCol, ...savedCol } : defCol;
        });
        return merged;
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  const [isManaging, setIsManaging] = useState(false);

  // Save to localStorage when columns change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(columns));
    }
  }, [columns, storageKey]);

  const toggleColumn = useCallback((key) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  }, []);

  const reorderColumns = useCallback((newOrder) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [moved] = newColumns.splice(newOrder.sourceIndex, 1);
      newColumns.splice(newOrder.destinationIndex, 0, moved);
      return newColumns.map((col, index) => ({ ...col, order: index }));
    });
  }, []);

  const moveColumn = useCallback((dragIndex, hoverIndex) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [moved] = newColumns.splice(dragIndex, 1);
      newColumns.splice(hoverIndex, 0, moved);
      return newColumns;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setColumns(defaultColumns);
  }, [defaultColumns]);

  const visibleColumns = columns.filter(col => col.visible !== false);

  return {
    columns,
    visibleColumns,
    isManaging,
    setIsManaging,
    toggleColumn,
    reorderColumns,
    moveColumn,
    resetToDefault
  };
}

export default useTableSettings;
