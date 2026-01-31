import type { Language, Difficulty } from '../types';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.detail || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Backend response types
export interface BackendSessionResponse {
  session_id: string;
  created_at: string;
  difficulty: string;
  config: {
    base_time_seconds: number;
    penalty_seconds: number;
    vuln_density: number;
    complexity_tag: string;
  };
}

export interface BackendTask {
  id: string;
  system_name: string;
  code: string;
  language: string;
  difficulty: string;
}

export interface BackendTaskListResponse {
  session_id: string;
  tasks: BackendTask[];
}

export interface BackendSubmitResponse {
  correct: number;
  incorrect: number;
  missed_task_ids: string[];
}

export interface BackendAuditLog {
  task_id: string;
  raw_log: string;
  findings?: string[];
}

export interface BackendFinishResponse {
  session_id: string;
  score: number;
  missed_task_ids: string[];
  audit_logs: BackendAuditLog[];
  mentor_report: {
    summary: string;
  };
}

// Map backend difficulty to frontend
function mapDifficulty(difficulty: string): Difficulty {
  const map: Record<string, Difficulty> = {
    easy: 'EASY',
    medium: 'MEDIUM',
    hard: 'HARD',
  };
  return map[difficulty] || 'MEDIUM';
}

// Map frontend difficulty to backend
function mapDifficultyToBackend(difficulty: Difficulty): string {
  const map: Record<Difficulty, string> = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
  };
  return map[difficulty] || 'medium';
}

// API methods
export const api = {
  // Health check
  async health(): Promise<{ status: string }> {
    return fetchApi('/health');
  },

  // Root endpoint - API info
  async root(): Promise<{ name: string; version: string; description: string }> {
    return fetchApi('/');
  },

  // Create a new game session
  async createSession(params: {
    difficulty: Difficulty;
    taskCount: number;
    language: Language;
  }): Promise<BackendSessionResponse> {
    return fetchApi('/session', {
      method: 'POST',
      body: JSON.stringify({
        difficulty: mapDifficultyToBackend(params.difficulty),
        task_count: params.taskCount,
        language: params.language,
      }),
    });
  },

  // Get tasks for a session
  async getTasks(sessionId: string): Promise<BackendTaskListResponse> {
    return fetchApi(`/session/${sessionId}/tasks`);
  },

  // Submit answers for tasks
  async submitAnswers(
    sessionId: string,
    answers: Array<{ taskId: string; choice: 'safe' | 'vulnerable' }>
  ): Promise<BackendSubmitResponse> {
    // Map frontend choices to backend format
    const backendAnswers = answers.map((a) => ({
      task_id: a.taskId,
      user_choice: a.choice === 'vulnerable' ? 'sabotaged' : 'clean',
    }));

    return fetchApi(`/session/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: backendAnswers }),
    });
  },

  // Finish session and get results
  async finishSession(sessionId: string): Promise<BackendFinishResponse> {
    return fetchApi(`/session/${sessionId}/finish`, {
      method: 'POST',
    });
  },

  // Get session results
  async getResults(sessionId: string): Promise<BackendFinishResponse> {
    return fetchApi(`/session/${sessionId}/results`);
  },
};

export { mapDifficulty, mapDifficultyToBackend };
export default api;
