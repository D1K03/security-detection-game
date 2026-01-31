import { useState, useEffect } from 'react';
import './EmergencyOverlay.css';

interface EmergencyOverlayProps {
  reason: 'timeout' | 'wrong_answer' | 'completed';
  onContinue: () => void;
  score: number;
  totalTasks: number;
  correctAnswers: number;
}

const MESSAGES: Record<'timeout' | 'wrong_answer' | 'completed', { title: string; subtitle: string; type: 'danger' | 'success' }> = {
  timeout: {
    title: 'TIME EXPIRED',
    subtitle: 'Security scan incomplete. System vulnerable.',
    type: 'danger',
  },
  wrong_answer: {
    title: 'SECURITY BREACH',
    subtitle: 'False accusation detected. Lockdown initiated.',
    type: 'danger',
  },
  completed: {
    title: 'SCAN COMPLETE',
    subtitle: 'All systems analyzed. Generating report...',
    type: 'success',
  },
};

export function EmergencyOverlay({
  reason,
  onContinue,
  score,
  totalTasks,
  correctAnswers,
}: EmergencyOverlayProps) {
  const [showButton, setShowButton] = useState(false);
  const message = MESSAGES[reason];
  const isSuccess = message.type === 'success';
  const accuracy = totalTasks > 0 ? Math.round((correctAnswers / totalTasks) * 100) : 0;

  // Show button after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`emergency-overlay ${message.type}`}>
      {/* Flashing background effect */}
      <div className="flash-effect" />

      {/* Content */}
      <div className="emergency-content">
        {/* Alert icon */}
        <div className="alert-icon-container">
          {isSuccess ? (
            <span className="alert-icon success">✓</span>
          ) : (
            <span className="alert-icon danger">!</span>
          )}
        </div>

        {/* Title */}
        <h1 className={`emergency-title ${message.type}`}>{message.title}</h1>
        <p className="emergency-subtitle">{message.subtitle}</p>

        {/* Stats */}
        <div className="emergency-stats">
          <div className="stat-item">
            <span className="stat-value">{score}</span>
            <span className="stat-label">SCORE</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{correctAnswers}/{totalTasks}</span>
            <span className="stat-label">CORRECT</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">{accuracy}%</span>
            <span className="stat-label">ACCURACY</span>
          </div>
        </div>

        {/* Continue button */}
        <button
          className={`continue-button ${showButton ? 'visible' : ''}`}
          onClick={onContinue}
          disabled={!showButton}
        >
          <span className="button-text">
            {isSuccess ? 'VIEW REPORT' : 'ANALYZE FAILURES'}
          </span>
          <span className="button-arrow">→</span>
        </button>
      </div>

      {/* Decorative elements */}
      <div className="scan-lines" />
      <div className="corner-brackets">
        <div className="bracket top-left" />
        <div className="bracket top-right" />
        <div className="bracket bottom-left" />
        <div className="bracket bottom-right" />
      </div>
    </div>
  );
}
