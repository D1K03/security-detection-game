import "./LoadingOverlay.css";

interface LoadingOverlayProps {
  message?: string;
  subtext?: string;
  onShowInfo?: () => void;
}

export function LoadingOverlay({
  message,
  subtext,
  onShowInfo,
}: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-card">
        <div className="loading-overlay-spinner" />
        <h2>{message || "ANALYZING SECURITY SYSTEMS..."}</h2>
        {subtext && <p>{subtext}</p>}
        {onShowInfo && (
          <button className="loading-overlay-info" onClick={onShowInfo}>
            WHAT'S THIS?
          </button>
        )}
      </div>
    </div>
  );
}
