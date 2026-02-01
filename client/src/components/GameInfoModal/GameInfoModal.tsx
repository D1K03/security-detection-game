import "./GameInfoModal.css";

interface GameInfoModalProps {
  onClose: () => void;
}

export function GameInfoModal({ onClose }: GameInfoModalProps) {
  return (
    <div className="game-info-modal">
      <div className="game-info-card">
        <header>
          <h2>MISSION BRIEFING</h2>
          <button className="game-info-close" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="game-info-body">
          <p>
            You are the ship's security analyst. Each system contains a short
            code snippet. Decide if it is SAFE or VULNERABLE.
          </p>
          <ul>
            <li>Mark SAFE only if you see no exploit path.</li>
            <li>
              Mark VULNERABLE if you spot XSS, SQLi, SSRF, RCE, or similar.
            </li>
            <li>Wrong calls or timeouts trigger an emergency audit.</li>
          </ul>
          <p>
            After the round, Hacktron scans missed tasks and Claude summarizes
            the weaknesses with fixes.
          </p>
        </div>
        <footer>
          <button className="game-info-ack" onClick={onClose}>
            ACKNOWLEDGE
          </button>
        </footer>
      </div>
    </div>
  );
}
