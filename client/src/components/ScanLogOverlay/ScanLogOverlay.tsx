import { useEffect, useMemo, useState } from "react";
import "./ScanLogOverlay.css";

interface ScanLogOverlayProps {
  active: boolean;
}

const LOG_LINES = [
  "Initializing Hacktron scan engine...",
  "Enumerating ship subsystems...",
  "Loading signature database v2.1.0...",
  "Analyzing input sinks...",
  "Tracing data flows...",
  "Checking outbound request policies...",
  "Scanning for unsafe deserialization...",
  "Verifying query parameterization...",
  "Mapping vulnerable execution paths...",
  "Compiling security report...",
  "Requesting Claude summary...",
];

export function ScanLogOverlay({ active }: ScanLogOverlayProps) {
  const [lines, setLines] = useState<string[]>([]);
  const seed = useMemo(() => Math.floor(Math.random() * 1000), []);

  useEffect(() => {
    if (!active) {
      setLines([]);
      return;
    }

    let index = 0;
    const timer = setInterval(() => {
      const nextLine = LOG_LINES[index % LOG_LINES.length];
      setLines((prev) => [...prev.slice(-8), `[${seed + index}] ${nextLine}`]);
      index += 1;
    }, 300);

    return () => clearInterval(timer);
  }, [active, seed]);

  if (!active) return null;

  return (
    <div className="scan-log-overlay">
      <div className="scan-log-card">
        <div className="scan-log-header">LIVE SECURITY SCAN</div>
        <div className="scan-log-body">
          {lines.map((line, idx) => (
            <div key={`${line}-${idx}`} className="scan-log-line">
              {line}
            </div>
          ))}
        </div>
        <div className="scan-log-footer">Awaiting results...</div>
      </div>
    </div>
  );
}
