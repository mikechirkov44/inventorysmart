/**
 * @module Skeleton
 * @description Компоненты-скелетоны для отображения загрузки контента.
 * Имитируют структуру страницы во время загрузки данных.
 */

/** Скелетон карточки оборудования */
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-photo" />
      <div className="skeleton skeleton-line" style={{ width: '70%' }} />
      <div className="skeleton skeleton-line-short" />
      <div className="skeleton skeleton-line" style={{ width: '40%', height: 20, marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="skeleton skeleton-btn" />
        <div className="skeleton skeleton-btn" />
      </div>
    </div>
  );
}

/**
 * Скелетон таблицы.
 * @param {Object} props
 * @param {number} [props.rows=5] - Количество строк
 * @param {number} [props.cols=5] - Количество столбцов
 */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-table-row"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="skeleton skeleton-cell"
              style={{ width: `${50 + Math.random() * 40}%`, height: 14 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Скелетон текстового блока.
 * @param {Object} props
 * @param {number} [props.lines=3] - Количество строк
 * @param {string} [props.width] - Ширина строк (CSS)
 */
export function SkeletonText({ lines = 3, width }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? '60%' : (width || '100%') }}
        />
      ))}
    </div>
  );
}

/** Скелетон целой страницы (заголовок + поиск + таблица) */
export function SkeletonPage() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="skeleton skeleton-title" />
        <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 8 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 12, marginBottom: 20 }} />
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}

/** Скелетон мобильных карточек */
export function SkeletonMobileCards({ count = 4 }) {
  return (
    <div className="mobile-data-cards skeleton-mobile-cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mobile-data-card">
          <div className="skeleton skeleton-line" style={{ width: '60%', marginBottom: 12 }} />
          <div className="skeleton skeleton-line" style={{ width: '90%', height: 12 }} />
          <div className="skeleton skeleton-line" style={{ width: '70%', height: 12, marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {number} [props.count=6] - Количество карточек-скелетонов
 */
export function SkeletonCardGrid({ count = 6 }) {
  return (
    <div className="equipment-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
