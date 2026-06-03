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

export function SkeletonCardGrid({ count = 6 }) {
  return (
    <div className="equipment-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
