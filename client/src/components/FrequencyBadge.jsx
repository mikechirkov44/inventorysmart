import { getFrequencyBadgeClass, getFrequencyLabel } from '../utils/frequency';

/**
 * Цветной тег периодичности работы.
 */
function FrequencyBadge({ days, className = '' }) {
  const badgeClass = getFrequencyBadgeClass(days);
  return (
    <span className={`frequency-badge ${badgeClass} ${className}`.trim()}>
      {getFrequencyLabel(days)}
    </span>
  );
}

export default FrequencyBadge;
