import type { Task, SystemName } from '../../types';
import './TaskTracker.css';

interface TaskTrackerProps {
  tasks: Task[];
  currentTaskIndex: number;
}

// System icons for Among Us style
const SYSTEM_ICONS: Record<SystemName, string> = {
  O2: '🌬️',
  NAVIGATION: '🧭',
  SHIELDS: '🛡️',
  REACTOR: '⚛️',
  COMMUNICATIONS: '📡',
  ELECTRICAL: '⚡',
  MEDBAY: '💉',
  SECURITY: '🔐',
  WEAPONS: '🎯',
  ADMIN: '📊',
};

// Get status indicator
function getStatusIndicator(status: Task['status']) {
  switch (status) {
    case 'completed':
      return { icon: '✓', className: 'status-completed' };
    case 'failed':
      return { icon: '✗', className: 'status-failed' };
    case 'current':
      return { icon: '●', className: 'status-current' };
    case 'pending':
    default:
      return { icon: '○', className: 'status-pending' };
  }
}

export function TaskTracker({ tasks, currentTaskIndex }: TaskTrackerProps) {
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="task-tracker">
      {/* Header */}
      <div className="tracker-header">
        <h2 className="tracker-title">SYSTEM STATUS</h2>
        <div className="tracker-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">
            {completedCount}/{tasks.length}
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="tracker-list">
        {tasks.map((task, index) => {
          const status = getStatusIndicator(task.status);
          const icon = SYSTEM_ICONS[task.systemName] || '🔧';
          const isCurrent = index === currentTaskIndex;

          return (
            <div
              key={task.id}
              className={`tracker-item ${status.className} ${isCurrent ? 'is-current' : ''}`}
            >
              <span className="item-icon">{icon}</span>
              <span className="item-name">{task.systemName}</span>
              <span className={`item-status ${status.className}`}>
                {status.icon}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="tracker-legend">
        <div className="legend-item">
          <span className="legend-icon status-pending">○</span>
          <span className="legend-label">Pending</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon status-current">●</span>
          <span className="legend-label">Active</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon status-completed">✓</span>
          <span className="legend-label">Clear</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon status-failed">✗</span>
          <span className="legend-label">Breach</span>
        </div>
      </div>
    </div>
  );
}
