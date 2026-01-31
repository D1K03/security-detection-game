import { useMemo } from 'react';
import './Timer.css';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  isActive?: boolean;
}

export function Timer({ timeRemaining, totalTime, isActive = true }: TimerProps) {
  // Calculate percentage for the circular progress
  const percentage = useMemo(() => {
    return totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  }, [timeRemaining, totalTime]);

  // Determine color based on time remaining
  const timerState = useMemo(() => {
    const ratio = timeRemaining / totalTime;
    if (ratio > 0.5) return 'normal';
    if (ratio > 0.25) return 'warning';
    return 'danger';
  }, [timeRemaining, totalTime]);

  // Format time display
  const timeDisplay = useMemo(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, '0')}`
      : `${seconds}`;
  }, [timeRemaining]);

  // SVG circle properties
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`timer ${timerState} ${isActive ? 'active' : 'paused'}`}>
      <div className="timer-label">TIME REMAINING</div>

      <div className="timer-circle">
        <svg viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="timer-bg"
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            className="timer-progress"
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
          />
        </svg>

        {/* Time display */}
        <div className="timer-value">
          <span className="timer-number">{timeDisplay}</span>
          {timeRemaining <= totalTime && timeRemaining > 0 && (
            <span className="timer-unit">sec</span>
          )}
        </div>
      </div>

      {/* Warning indicator */}
      {timerState === 'danger' && timeRemaining > 0 && (
        <div className="timer-alert">
          <span className="alert-icon">⚠</span>
          <span className="alert-text">LOW TIME</span>
        </div>
      )}

      {/* Time up indicator */}
      {timeRemaining === 0 && (
        <div className="timer-timeout">
          <span className="timeout-text">TIME UP</span>
        </div>
      )}
    </div>
  );
}
