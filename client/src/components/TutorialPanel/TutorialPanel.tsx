import { useEffect, useState } from "react";
import type { Language } from "../../types";
import "./TutorialPanel.css";

interface TutorialPanelProps {
  language: Language;
  hints?: string[];
  taskId?: string;
}

const LANGUAGE_HINTS: Record<Language, string[]> = {
  javascript: [
    "Look for string concatenation in SQL or command execution.",
    "Be wary of innerHTML / dangerouslySetInnerHTML with user input.",
    "Watch fetch(url) or axios(url) when url comes from users (SSRF).",
  ],
  python: [
    "Check for f-strings building SQL or shell commands.",
    "Look for requests.get(url) with user-controlled urls.",
    "Watch for unsafe deserialization (pickle, yaml.load).",
  ],
  java: [
    "Check string-built SQL and Runtime.exec() usage.",
    "Look for file path concatenation without sanitization.",
    "Watch for deserialization of untrusted data.",
  ],
  go: [
    "Check fmt.Sprintf() building SQL or shell commands.",
    "Look for exec.Command with user-controlled input.",
    "Watch for URL fetching from user input (SSRF).",
  ],
  php: [
    "Check direct $_GET/$_POST in SQL or echo output.",
    "Look for include/require with user input.",
    "Watch file paths built from user input.",
  ],
};

export function TutorialPanel({ language, hints = [], taskId }: TutorialPanelProps) {
  const [revealed, setRevealed] = useState(0);
  const fallbackHints = LANGUAGE_HINTS[language] || LANGUAGE_HINTS.javascript;
  const activeHints = hints.length ? hints : fallbackHints;

  useEffect(() => {
    setRevealed(0);
  }, [taskId, language]);
  return (
    <div className="tutorial-panel">
      <div className="tutorial-title">TUTORIAL MODE</div>
      <ul>
        {activeHints.slice(0, revealed).map((hint, idx) => (
          <li key={`${language}-hint-${idx}`}>{hint}</li>
        ))}
      </ul>
      {revealed < Math.min(2, activeHints.length) && (
        <button
          className="tutorial-reveal"
          onClick={() => setRevealed((prev) => prev + 1)}
        >
          REVEAL HINT
        </button>
      )}
      <div className="tutorial-footer">Tip: Mark SAFE only when no risky pattern appears.</div>
    </div>
  );
}
