import { useEffect } from "react";
import "./HomePage.css";

interface HomePageProps {
  onPlay: () => void;
  onShowInfo: () => void;
  tutorialEnabled: boolean;
  onToggleTutorial: () => void;
}

export function HomePage({
  onPlay,
  onShowInfo,
  tutorialEnabled,
  onToggleTutorial,
}: HomePageProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        onPlay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPlay]);

  return (
    <div className="home-page">
      <div className="home-content">
        {/* Decorative grid background */}
        <div className="home-grid-bg" />

        {/* Main title section */}
        <div className="home-header">
          <div className="home-subtitle">STARSHIP SECURITY PROTOCOL</div>
          <h1 className="home-title">
            <span className="title-line">SECURITY</span>
            <span className="title-line highlight">DETECTION</span>
          </h1>
          <div className="home-tagline">
            Identify vulnerabilities. Protect the ship.
          </div>
        </div>

        {/* Terminal-style info box */}
        <div className="home-terminal">
          <div className="terminal-header">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
            <span className="terminal-title">system_brief.log</span>
          </div>
          <div className="terminal-body">
            <p className="terminal-line">
              <span className="prompt">&gt;</span> Security breaches detected in
              ship systems
            </p>
            <p className="terminal-line">
              <span className="prompt">&gt;</span> Analyze code snippets for
              vulnerabilities
            </p>
            <p className="terminal-line">
              <span className="prompt">&gt;</span> Mark as [SAFE] or
              [VULNERABLE]
            </p>
            <p className="terminal-line warning">
              <span className="prompt">!</span> Warning: False accusations will
              trigger lockdown
            </p>
          </div>
        </div>

        {/* Vulnerability types */}
        <div className="home-vuln-types">
          <div className="vuln-badge">XSS</div>
          <div className="vuln-badge">SQL Injection</div>
          <div className="vuln-badge">RCE</div>
          <div className="vuln-badge">SSRF</div>
        </div>

        {/* Play button */}
        <div className="home-action-row">
          <button className="play-button" onClick={onPlay}>
            <span className="play-icon">▶</span>
            <span className="play-text">INITIALIZE</span>
          </button>
          <button className="info-button" onClick={onShowInfo}>
            WHAT'S THIS?
          </button>
        </div>
        <button className="tutorial-toggle" onClick={onToggleTutorial}>
          {tutorialEnabled ? "TUTORIAL MODE: ON" : "TUTORIAL MODE: OFF"}
        </button>

        {/* Footer */}
        <div className="home-footer">
          <p>Press [ENTER] or initialize to start mission</p>
        </div>
      </div>

      {/* Floating particles */}
      <div className="particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 20}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
