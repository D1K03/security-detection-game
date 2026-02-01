// Game State Machine Phases
export type GamePhase = 'IDLE' | 'LOADING' | 'PLAYING' | 'AUDITING' | 'DEBRIEF';

// Difficulty Levels
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

// Factors that difficulty can affect
export interface DifficultyFactors {
  affectsTimer: boolean;
  affectsComplexity: boolean;
  affectsTaskCount: boolean;
}

// Supported programming languages
export type Language = 'javascript' | 'python' | 'java' | 'go' | 'php';

// Types of security vulnerabilities
export type VulnerabilityType =
  | 'XSS'
  | 'SQL_INJECTION'
  | 'RCE'
  | 'SSRF'
  | 'PATH_TRAVERSAL'
  | 'COMMAND_INJECTION'
  | 'INSECURE_DESERIALIZATION'
  | 'SAFE';

// System names for Among Us style task display
export type SystemName =
  | 'O2'
  | 'NAVIGATION'
  | 'SHIELDS'
  | 'REACTOR'
  | 'COMMUNICATIONS'
  | 'ELECTRICAL'
  | 'MEDBAY'
  | 'SECURITY'
  | 'WEAPONS'
  | 'ADMIN';

// Task status
export type TaskStatus = 'pending' | 'completed' | 'failed' | 'current';

// Individual task/code snippet
export interface Task {
  id: string;
  systemName: SystemName;
  code: string;
  language: Language;
  isVulnerable: boolean;
  vulnerabilityType: VulnerabilityType;
  vulnerabilityLine?: number;
  explanation?: string;
  hints?: string[];
  status: TaskStatus;
  userAnswer?: 'safe' | 'vulnerable';
}

// Main game state
export interface GameState {
  phase: GamePhase;
  difficulty: Difficulty;
  difficultyFactors: DifficultyFactors;
  language: Language;
  tasks: Task[];
  currentTaskIndex: number;
  timePerTask: number;
  timeRemaining: number;
  score: number;
  totalCorrect: number;
  totalIncorrect: number;
  gameOverReason?: 'timeout' | 'wrong_answer' | 'completed';
  auditReport?: AuditReport;
}

// Audit report from Hacktron/Claude
export interface AuditReport {
  findings: AuditFinding[];
  summary: string;
  audioUrl?: string;
}

// Individual finding in audit report
export interface AuditFinding {
  taskId: string;
  systemName: SystemName;
  vulnerability: VulnerabilityType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  codeLocation: {
    line: number;
    column?: number;
  };
  remediation: string;
  codeSnippet?: string;
}

// Game configuration based on difficulty
export interface GameConfig {
  taskCount: number;
  timePerTask: number;
  complexityLevel: 'basic' | 'intermediate' | 'advanced';
}

// Calculate game config based on difficulty and factors
export function calculateGameConfig(
  difficulty: Difficulty,
  factors: DifficultyFactors
): GameConfig {
  const factorCount = [
    factors.affectsTimer,
    factors.affectsComplexity,
    factors.affectsTaskCount,
  ].filter(Boolean).length;

  // Base values
  let taskCount = 5;
  let timePerTask = 45;
  let complexityLevel: 'basic' | 'intermediate' | 'advanced' = 'basic';

  // Adjust time based on factor count
  // More factors = more lenient time
  if (factorCount === 1) {
    timePerTask = 15;
  } else if (factorCount === 2) {
    timePerTask = 30;
  } else if (factorCount === 3) {
    timePerTask = 45;
  }

  // Adjust based on difficulty if that factor is active
  if (factors.affectsTaskCount) {
    switch (difficulty) {
      case 'EASY':
        taskCount = 3 + Math.floor(Math.random() * 2); // 3-4
        break;
      case 'MEDIUM':
        taskCount = 5;
        break;
      case 'HARD':
        taskCount = 6 + Math.floor(Math.random() * 2); // 6-7
        break;
    }
  }

  if (factors.affectsComplexity) {
    switch (difficulty) {
      case 'EASY':
        complexityLevel = 'basic';
        break;
      case 'MEDIUM':
        complexityLevel = 'intermediate';
        break;
      case 'HARD':
        complexityLevel = 'advanced';
        break;
    }
  }

  if (factors.affectsTimer) {
    // Additional timer adjustment based on difficulty
    switch (difficulty) {
      case 'EASY':
        timePerTask = Math.floor(timePerTask * 1.5);
        break;
      case 'MEDIUM':
        // Keep base time
        break;
      case 'HARD':
        timePerTask = Math.floor(timePerTask * 0.7);
        break;
    }
  }

  return { taskCount, timePerTask, complexityLevel };
}
