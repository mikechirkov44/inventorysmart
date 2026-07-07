import { Link } from 'react-router-dom';
import { MapPin, User, CheckCircle } from 'lucide-react';
import FrequencyBadge from './FrequencyBadge';
import { getTaskScanPath } from '../utils/taskScan';

/**
 * Карточка плановой работы в календаре обходов.
 */
function CalendarEventCard({ event, canExecute = false }) {
  return (
    <div className={`calendar-event-card ${event.isOverdue ? 'is-overdue' : ''}`}>
      <div className="calendar-event-content">
        <div className="calendar-event-header">
          <Link to={`/equipment/${event.equipmentId}`} className="calendar-event-equipment">
            {event.equipmentName}
          </Link>
          {event.inventoryNumber && (
            <span className="calendar-event-inv">{event.inventoryNumber}</span>
          )}
          {event.isOverdue && (
            <span className="status-badge status-needs-repair">Просрочено</span>
          )}
        </div>
        <div className="calendar-event-body">
          <span className="calendar-event-work">{event.workName}</span>
          <FrequencyBadge days={event.frequencyDays} />
        </div>
        {(event.roomName || event.employeeName) && (
          <div className="calendar-event-meta">
            {event.roomName && (
              <span><MapPin size={14} /> {event.roomName}</span>
            )}
            {event.employeeName && (
              <span><User size={14} /> {event.employeeName}</span>
            )}
          </div>
        )}
      </div>
      {canExecute && (
        <div className="calendar-event-actions">
          <Link to={getTaskScanPath(event)} className="btn btn-primary btn-small">
            <CheckCircle size={14} />
            Выполнить
          </Link>
        </div>
      )}
    </div>
  );
}

export default CalendarEventCard;
