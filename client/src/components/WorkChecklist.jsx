export function ChecklistSteps({ steps, onToggle, readOnly = false }) {
  if (!steps?.length) return null;
  return (
    <div className="wo-checklist">
      {steps.map((step, index) => (
        <label key={`${index}-${step.text}`} className="wo-checklist-item">
          <span className={`custom-checkbox ${step.done ? 'checked' : ''}`}>
            <input
              type="checkbox"
              checked={!!step.done}
              disabled={readOnly}
              onChange={() => onToggle?.(index)}
            />
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>{step.text}</span>
        </label>
      ))}
    </div>
  );
}

export function checklistProgress(steps) {
  const list = Array.isArray(steps) ? steps : [];
  if (!list.length) return '';
  const done = list.filter((step) => step.done).length;
  return `${done} из ${list.length}`;
}
