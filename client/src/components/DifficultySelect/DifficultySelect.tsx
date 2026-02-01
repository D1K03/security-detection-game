import { useState, useEffect } from 'react';
import type { Difficulty, DifficultyFactors, Language } from '../../types';
import { calculateGameConfig } from '../../types';
import './DifficultySelect.css';

interface DifficultySelectProps {
  initialDifficulty?: Difficulty;
  initialFactors?: DifficultyFactors;
  initialLanguage?: Language;
  endlessMode: boolean;
  onToggleEndless: () => void;
  tutorialEnabled: boolean;
  onStart: (difficulty: Difficulty, factors: DifficultyFactors, language: Language) => void;
  onBack: () => void;
}

const DIFFICULTY_INFO: Record<Difficulty, { label: string; description: string; color: string }> = {
  EASY: {
    label: 'EASY',
    description: 'Basic vulnerabilities, forgiving time limits',
    color: '#33ff77',
  },
  MEDIUM: {
    label: 'MEDIUM',
    description: 'Standard security challenges',
    color: '#ffcc00',
  },
  HARD: {
    label: 'HARD',
    description: 'Subtle flaws, pressure testing',
    color: '#ff3333',
  },
};

const LANGUAGES: { value: Language; label: string; icon: string }[] = [
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'python', label: 'Python', icon: 'PY' },
  { value: 'java', label: 'Java', icon: 'JV' },
  { value: 'go', label: 'Go', icon: 'GO' },
  { value: 'php', label: 'PHP', icon: 'PHP' },
];

export function DifficultySelect({
  initialDifficulty = 'MEDIUM',
  initialFactors = { affectsTimer: true, affectsComplexity: true, affectsTaskCount: false },
  initialLanguage = 'javascript',
  endlessMode,
  onToggleEndless,
  tutorialEnabled,
  onStart,
  onBack,
}: DifficultySelectProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [factors, setFactors] = useState<DifficultyFactors>(initialFactors);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [config, setConfig] = useState(() => calculateGameConfig(initialDifficulty, initialFactors));

  // Update config when difficulty or factors change
  useEffect(() => {
    setConfig(calculateGameConfig(difficulty, factors));
  }, [difficulty, factors]);

  const toggleFactor = (factor: keyof DifficultyFactors) => {
    setFactors((prev) => ({
      ...prev,
      [factor]: !prev[factor],
    }));
  };

  const handleStart = () => {
    onStart(difficulty, factors, language);
  };

  const activeFactorCount = Object.values(factors).filter(Boolean).length;

  return (
    <div className="difficulty-select">
      <div className="difficulty-content">
        {/* Back button */}
        <button className="back-button" onClick={onBack}>
          <span className="back-arrow">←</span>
          <span>ABORT MISSION</span>
        </button>

        <h1 className="difficulty-title">MISSION PARAMETERS</h1>

        {!tutorialEnabled && (
          <section className="section">
            <h2 className="section-title">ENDLESS MODE</h2>
            <label className={`factor-toggle ${endlessMode ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={endlessMode}
                onChange={onToggleEndless}
              />
              <span className="toggle-indicator" />
              <div className="toggle-content">
                <span className="toggle-icon">∞</span>
                <span className="toggle-label">Endless Streak</span>
              </div>
            </label>
          </section>
        )}

        {/* Difficulty selection */}
        <section className="section">
          <h2 className="section-title">DIFFICULTY LEVEL</h2>
          <div className="difficulty-cards">
            {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map((level) => {
              const info = DIFFICULTY_INFO[level];
              const isSelected = difficulty === level;
              return (
                <button
                  key={level}
                  className={`difficulty-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setDifficulty(level)}
                  style={{ '--card-color': info.color } as React.CSSProperties}
                >
                  <div className="card-indicator" />
                  <div className="card-content">
                    <h3 className="card-title">{info.label}</h3>
                    <p className="card-description">{info.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Difficulty factors */}
        <section className="section">
          <h2 className="section-title">CHALLENGE FACTORS</h2>
          <p className="section-hint">
            More factors = more lenient individual settings
          </p>
          <div className="factors-grid">
            <label className={`factor-toggle ${factors.affectsTimer ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={factors.affectsTimer}
                onChange={() => toggleFactor('affectsTimer')}
              />
              <span className="toggle-indicator" />
              <div className="toggle-content">
                <span className="toggle-icon">⏱</span>
                <span className="toggle-label">Timer</span>
              </div>
            </label>

            <label className={`factor-toggle ${factors.affectsComplexity ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={factors.affectsComplexity}
                onChange={() => toggleFactor('affectsComplexity')}
              />
              <span className="toggle-indicator" />
              <div className="toggle-content">
                <span className="toggle-icon">🧩</span>
                <span className="toggle-label">Complexity</span>
              </div>
            </label>

            <label className={`factor-toggle ${factors.affectsTaskCount ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={factors.affectsTaskCount}
                onChange={() => toggleFactor('affectsTaskCount')}
              />
              <span className="toggle-indicator" />
              <div className="toggle-content">
                <span className="toggle-icon">📋</span>
                <span className="toggle-label">Task Count</span>
              </div>
            </label>
          </div>
          {activeFactorCount === 0 && (
            <p className="factor-warning">Select at least one factor</p>
          )}
        </section>

        {/* Language selection */}
        <section className="section">
          <h2 className="section-title">TARGET LANGUAGE</h2>
          <div className="language-grid">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                className={`language-button ${language === lang.value ? 'selected' : ''}`}
                onClick={() => setLanguage(lang.value)}
              >
                <span className="lang-icon">{lang.icon}</span>
                <span className="lang-name">{lang.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Config preview */}
        <section className="section config-preview">
          <h2 className="section-title">MISSION BRIEF</h2>
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">Time per Task</span>
              <span className="config-value">{config.timePerTask}s</span>
            </div>
            <div className="config-item">
              <span className="config-label">Tasks</span>
              <span className="config-value">{config.taskCount}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Complexity</span>
              <span className="config-value capitalize">{config.complexityLevel}</span>
            </div>
          </div>
        </section>

        {/* Start button */}
        <button
          className="start-button"
          onClick={handleStart}
          disabled={activeFactorCount === 0}
        >
          <span className="start-icon">🚀</span>
          <span>START MISSION</span>
        </button>
      </div>
    </div>
  );
}
