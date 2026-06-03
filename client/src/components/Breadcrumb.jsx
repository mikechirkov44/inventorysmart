/**
 * @module Breadcrumb
 * @description Компонент навигационной цепочки (хлебные крошки).
 * Отображает путь следования по разделам приложения.
 */

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * @param {Object} props
 * @param {Array<{label: string, to: string}>} props.items - Массив элементов навигации
 */
export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="breadcrumbs">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={12} className="breadcrumb-separator" />}
            {isLast ? (
              <span className="breadcrumb-current">{item.label}</span>
            ) : (
              <Link to={item.to} className="breadcrumb-item">{item.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
