import { useState, useEffect } from 'react';
import type { AuditReport, Task, VulnerabilityType } from '../../types';
import { elevenlabsService } from '../../services';
import './ReportModal.css';

interface ReportModalProps {
  report: AuditReport | null;
  failedTasks: Task[];
  onRestart: () => void;
  audioUrl?: string;
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ff0040',
  HIGH: '#ff3333',
  MEDIUM: '#ff9900',
  LOW: '#ffcc00',
};

const VULN_ICONS: Record<VulnerabilityType, string> = {
  XSS: '🔓',
  SQL_INJECTION: '💉',
  RCE: '💻',
  SSRF: '🌐',
  PATH_TRAVERSAL: '📁',
  COMMAND_INJECTION: '⚡',
  INSECURE_DESERIALIZATION: '📦',
  SAFE: '✓',
};

export function ReportModal({
  report,
  failedTasks,
  onRestart,
  audioUrl: initialAudioUrl,
}: ReportModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(initialAudioUrl);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  // Update audioUrl when initialAudioUrl changes
  useEffect(() => {
    if (initialAudioUrl) {
      setAudioUrl(initialAudioUrl);
    }
  }, [initialAudioUrl]);

  // Generate audio summary on demand
  const handleGenerateAudio = async () => {
    if (!report?.summary || isGeneratingAudio) return;

    setIsGeneratingAudio(true);
    setAudioError(null);

    try {
      const generatedAudioUrl = await elevenlabsService.generateReportAudio(report.summary);

      if (generatedAudioUrl) {
        setAudioUrl(generatedAudioUrl);
        // Auto-play the generated audio
        const audio = new Audio(generatedAudioUrl);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          console.error('Failed to load or play audio');
          setIsPlaying(false);
          setAudioError('Failed to play audio');
        };
        setAudioElement(audio);
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Audio playback failed:', error);
          setIsPlaying(false);
          setAudioError('Audio playback failed');
        }
      } else {
        setAudioError('Voice generation service unavailable');
      }
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setAudioError('Failed to generate voice summary');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!audioUrl) return;

    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        await audioElement.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        console.error('Failed to load or play audio');
        setIsPlaying(false);
      };
      setAudioElement(audio);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Audio playback failed:', error);
        setIsPlaying(false);
      }
    }
  };

  // Sort findings by severity
  const sortedFindings = report?.findings
    ? [...report.findings].sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity as typeof SEVERITY_ORDER[number]) -
          SEVERITY_ORDER.indexOf(b.severity as typeof SEVERITY_ORDER[number])
      )
    : [];

  return (
    <div className="report-modal">
      <div className="report-container">
        {/* Header */}
        <header className="report-header">
          <div className="header-icon">📋</div>
          <div className="header-text">
            <h1 className="report-title">SECURITY AUDIT REPORT</h1>
            <p className="report-subtitle">Ship Computer Analysis v2.1</p>
          </div>
          {audioUrl && (
            <button
              className={`audio-button ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlayAudio}
            >
              <span className="audio-icon">{isPlaying ? '⏸' : '▶'}</span>
              <span className="audio-label">
                {isPlaying ? 'PAUSE' : 'PLAY AUDIO'}
              </span>
            </button>
          )}
        </header>

        {/* Summary */}
        {report?.summary && (
          <section className="report-section summary">
            <div className="summary-header">
              <h2 className="section-title">EXECUTIVE SUMMARY</h2>
              {!audioUrl && !isGeneratingAudio && (
                <button
                  className="generate-audio-button"
                  onClick={handleGenerateAudio}
                  title="Generate voice summary using ElevenLabs"
                >
                  <span className="audio-icon">🔊</span>
                  <span>GENERATE VOICE SUMMARY</span>
                </button>
              )}
              {isGeneratingAudio && (
                <div className="generating-audio">
                  <span className="loading-spinner-small" />
                  <span>Generating voice...</span>
                </div>
              )}
            </div>
            <p className="summary-text">{report.summary}</p>
            {audioError && (
              <div className="audio-error">
                <span className="error-icon">⚠️</span>
                <span>{audioError}</span>
              </div>
            )}
          </section>
        )}

        {/* Findings */}
        <section className="report-section findings">
          <h2 className="section-title">
            VULNERABILITY FINDINGS ({sortedFindings.length})
          </h2>

          {sortedFindings.length === 0 ? (
            <div className="no-findings">
              <span className="success-icon">✓</span>
              <p>No vulnerabilities detected in analyzed code segments.</p>
            </div>
          ) : (
            <div className="findings-list">
              {sortedFindings.map((finding, index) => (
                <div key={finding.taskId + index} className="finding-card">
                  <div className="finding-header">
                    <span className="finding-icon">
                      {VULN_ICONS[finding.vulnerability] || '⚠'}
                    </span>
                    <span className="finding-system">{finding.systemName}</span>
                    <span
                      className="finding-severity"
                      style={{ color: SEVERITY_COLORS[finding.severity] }}
                    >
                      {finding.severity}
                    </span>
                  </div>

                  <div className="finding-type">
                    {finding.vulnerability.replace('_', ' ')}
                  </div>

                  <p className="finding-description">{finding.description}</p>

                  {finding.codeLocation && (
                    <div className="finding-location">
                      <span className="location-label">Location:</span>
                      <span className="location-value">
                        Line {finding.codeLocation.line}
                        {finding.codeLocation.column
                          ? `, Column ${finding.codeLocation.column}`
                          : ''}
                      </span>
                    </div>
                  )}

                  <div className="finding-remediation">
                    <span className="remediation-label">Remediation:</span>
                    <p className="remediation-text">{finding.remediation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Failed tasks without report data */}
        {failedTasks.length > 0 && sortedFindings.length === 0 && (
          <section className="report-section failed-tasks">
            <h2 className="section-title">FAILED SECURITY CHECKS</h2>
            <div className="failed-list">
              {failedTasks.map((task) => (
                <div key={task.id} className="failed-item">
                  <span className="failed-icon">
                    {VULN_ICONS[task.vulnerabilityType]}
                  </span>
                  <span className="failed-system">{task.systemName}</span>
                  <span className="failed-type">
                    {task.vulnerabilityType.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="report-footer">
          <button className="restart-button" onClick={onRestart}>
            <span className="button-icon">🔄</span>
            <span>RETURN TO BRIDGE</span>
          </button>

          <p className="footer-note">
            Report generated by Hacktron Security Scanner &amp; Claude AI
          </p>
        </footer>
      </div>

      {/* Background decoration */}
      <div className="report-backdrop" />
    </div>
  );
}
