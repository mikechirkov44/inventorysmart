import { useState, useCallback, useMemo } from 'react';

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
        // Restore order from saved columns, but merge with defaults for new columns
        const merged = parsed.map(savedCol => {
          const defCol = defaultColumns.find(c => c.key === savedCol.key);
          return defCol ? { ...defCol, ...savedCol } : savedCol;
        }).filter(col => defaultColumns.some(def => def.key === col.key)); // Remove deleted columns
        
        // Add new columns that weren't in saved data
        const newColumns = defaultColumns.filter(def => !parsed.some(saved => saved.key === def.key));
        return [...merged, ...newColumns];
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  const [isManaging, setIsManaging] = useState(false);

  // Save to localStorage when columns change
  const saveToStorage = useCallback((newColumns) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newColumns));
    }
  }, [storageKey]);

  const toggleColumn = useCallback((key) => {
    setColumns(prev => {
      const newColumns = prev.map(col => 
        col.key === key ? { ...col, visible: !col.visible } : col
      );
      saveToStorage(newColumns);
      return newColumns;
    });
  }, [saveToStorage]);

  const moveColumn = useCallback((dragIndex, hoverIndex) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [moved] = newColumns.splice(dragIndex, 1);
      newColumns.splice(hoverIndex, 0, moved);
      saveToStorage(newColumns);
      return newColumns;
    });
  }, [saveToStorage]);

  const resetToDefault = useCallback(() => {
    setColumns(defaultColumns);
    saveToStorage(defaultColumns);
  }, [defaultColumns, saveToStorage]);

  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible !== false);
  }, [columns]);

  return {
    columns,
    visibleColumns,
    isManaging,
    setIsManaging,
    toggleColumn,
    moveColumn,
    resetToDefault
  };
}

export default useTableSettings;
