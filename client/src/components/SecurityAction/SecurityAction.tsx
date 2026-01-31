import { useEffect, useCallback } from 'react';
import './SecurityAction.css';

interface SecurityActionProps {
  onSafe: () => void;
  onVulnerable: () => void;
  disabled?: boolean;
}

export function SecurityAction({
  onSafe,
  onVulnerable,
  disabled = false,
}: SecurityActionProps) {
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      // Ignore if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 's':
          event.preventDefault();
          onSafe();
          break;
        case 'v':
          event.preventDefault();
          onVulnerable();
          break;
      }
    },
    [disabled, onSafe, onVulnerable]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="security-action">
      <h3 className="action-title">SECURITY VERDICT</h3>
      <p className="action-hint">Analyze the code and make your decision</p>

      <div className="action-buttons">
        <button
          className="action-button safe"
          onClick={onSafe}
          disabled={disabled}
        >
          <span className="button-icon">✓</span>
          <span className="button-label">SAFE</span>
          <span className="button-key">S</span>
        </button>

        <button
          className="action-button vulnerable"
          onClick={onVulnerable}
          disabled={disabled}
        >
          <span className="button-icon">⚠</span>
          <span className="button-label">VULNERABLE</span>
          <span className="button-key">V</span>
        </button>
      </div>

      <div className="action-warning">
        <span className="warning-icon">!</span>
        <span className="warning-text">
          False accusations trigger system lockdown
        </span>
      </div>
    </div>
  );
}
