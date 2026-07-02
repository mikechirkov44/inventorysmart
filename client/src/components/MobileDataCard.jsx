/**
 * Карточный вид таблицы на мобильных устройствах.
 */
export function MobileDataCards({ children, empty, emptyMessage = 'Записей не найдено' }) {
  return (
    <div className="mobile-data-cards">
      {empty ? <div className="no-results">{emptyMessage}</div> : children}
    </div>
  );
}

export function MobileDataCard({ children, className = '' }) {
  return <div className={`mobile-data-card ${className}`.trim()}>{children}</div>;
}

export function MobileDataCardTitle({ children }) {
  return <div className="mobile-data-card-title">{children}</div>;
}

export function MobileDataCardRow({ label, children }) {
  return (
    <div className="mobile-data-card-row">
      <span className="mobile-data-card-label">{label}</span>
      <span className="mobile-data-card-value">{children}</span>
    </div>
  );
}

export function MobileDataCardActions({ children }) {
  return <div className="mobile-data-card-actions">{children}</div>;
}
