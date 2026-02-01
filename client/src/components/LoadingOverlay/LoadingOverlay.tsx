import "./LoadingOverlay.css";

interface LoadingOverlayProps {
  message?: string;
  subtext?: string;
}

export function LoadingOverlay({ message, subtext }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-card">
        <div className="loading-overlay-spinner" />
        <h2>{message || "ANALYZING SECURITY SYSTEMS..."}</h2>
        {subtext && <p>{subtext}</p>}
      </div>
    </div>
  );
}
