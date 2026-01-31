import { useState, useEffect } from 'react';
import './HomePage.css';

interface ApiInfo {
  name: string;
  version: string;
  description: string;
}

interface HomePageProps {
  onPlay: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function HomePage({ onPlay }: HomePageProps) {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);

  // Fetch API info from root endpoint on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
          const data = await response.json();
          setApiInfo(data);
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('offline');
        }
      } catch {
        setConnectionStatus('offline');
      }
    };

    checkConnection();

    // Re-check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-page">
      <div className="home-content">
        {/* Decorative grid background */}
        <div className="home-grid-bg" />

        {/* Connection status indicator */}
        <div className={`connection-status ${connectionStatus}`}>
          <span className="status-dot" />
          <span className="status-text">
            {connectionStatus === 'checking' && 'Connecting to server...'}
            {connectionStatus === 'connected' && `Connected to ${apiInfo?.name || 'API'} v${apiInfo?.version || '?'}`}
            {connectionStatus === 'offline' && 'Offline Mode (Mock Data)'}
          </span>
        </div>

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
              <span className="prompt">&gt;</span> Security breaches detected in ship systems
            </p>
            <p className="terminal-line">
              <span className="prompt">&gt;</span> Analyze code snippets for vulnerabilities
            </p>
            <p className="terminal-line">
              <span className="prompt">&gt;</span> Mark as [SAFE] or [VULNERABLE]
            </p>
            <p className="terminal-line warning">
              <span className="prompt">!</span> Warning: False accusations will trigger lockdown
            </p>
            {connectionStatus === 'connected' && (
              <p className="terminal-line success">
                <span className="prompt">✓</span> Backend connection established
              </p>
            )}
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
        <button className="play-button" onClick={onPlay}>
          <span className="play-icon">▶</span>
          <span className="play-text">INITIALIZE</span>
        </button>

        {/* Footer */}
        <div className="home-footer">
          <p>Press [ENTER] or click to start mission</p>
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
