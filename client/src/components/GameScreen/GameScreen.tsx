import type { Task, Language } from '../../types';
import { ConsoleTerminal } from '../ConsoleTerminal/ConsoleTerminal';
import { TaskTracker } from '../TaskTracker/TaskTracker';
import { SecurityAction } from '../SecurityAction/SecurityAction';
import { Timer } from '../Timer/Timer';
import './GameScreen.css';

interface GameScreenProps {
  tasks: Task[];
  currentTaskIndex: number;
  currentTask: Task | null;
  language: Language;
  timeRemaining: number;
  timePerTask: number;
  onAnswer: (answer: 'safe' | 'vulnerable') => void;
  disabled?: boolean;
}

export function GameScreen({
  tasks,
  currentTaskIndex,
  currentTask,
  language,
  timeRemaining,
  timePerTask,
  onAnswer,
  disabled = false,
}: GameScreenProps) {
  if (!currentTask) {
    return (
      <div className="game-screen loading">
        <div className="loading-indicator">
          <div className="loading-spinner" />
          <p>LOADING SECURITY PROTOCOLS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-screen">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <span className="header-label">SYSTEM:</span>
          <span className="header-value">{currentTask.systemName}</span>
        </div>
        <div className="header-center">
          <span className="header-task">
            TASK {currentTaskIndex + 1} OF {tasks.length}
          </span>
        </div>
        <div className="header-right">
          <span className="header-label">LANGUAGE:</span>
          <span className="header-value">{language.toUpperCase()}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="game-main">
        {/* Left sidebar - Task Tracker */}
        <aside className="game-sidebar left">
          <TaskTracker tasks={tasks} currentTaskIndex={currentTaskIndex} />
        </aside>

        {/* Center - Console Terminal */}
        <section className="game-center">
          <ConsoleTerminal
            code={currentTask.code}
            language={language}
            systemName={currentTask.systemName}
          />
        </section>

        {/* Right sidebar - Timer & Actions */}
        <aside className="game-sidebar right">
          <Timer
            timeRemaining={timeRemaining}
            totalTime={timePerTask}
            isActive={!disabled}
          />
          <SecurityAction
            onSafe={() => onAnswer('safe')}
            onVulnerable={() => onAnswer('vulnerable')}
            disabled={disabled}
          />
        </aside>
      </main>

      {/* Footer status bar */}
      <footer className="game-footer">
        <div className="footer-status">
          <span className="status-dot active" />
          <span>SECURITY SCAN ACTIVE</span>
        </div>
        <div className="footer-hint">
          Press <kbd>S</kbd> for SAFE or <kbd>V</kbd> for VULNERABLE
        </div>
        <div className="footer-info">
          <span className="info-label">STARSHIP SECURITY v2.1.0</span>
        </div>
      </footer>
    </div>
  );
}
