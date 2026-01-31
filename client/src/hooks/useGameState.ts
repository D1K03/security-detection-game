import { useReducer, useCallback } from 'react';
import type {
  GameState,
  Difficulty,
  DifficultyFactors,
  Language,
  Task,
  AuditReport,
} from '../types';
import { calculateGameConfig } from '../types';

// Action Types
type GameAction =
  | { type: 'START_GAME' }
  | { type: 'SET_DIFFICULTY'; payload: { difficulty: Difficulty; factors: DifficultyFactors } }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'START_LOADING' }
  | { type: 'LOAD_TASKS'; payload: Task[] }
  | { type: 'START_PLAYING' }
  | { type: 'ANSWER_TASK'; payload: { answer: 'safe' | 'vulnerable' } }
  | { type: 'NEXT_TASK' }
  | { type: 'TICK_TIMER' }
  | { type: 'TIME_UP' }
  | { type: 'GAME_OVER'; payload: { reason: 'timeout' | 'wrong_answer' | 'completed' } }
  | { type: 'START_AUDITING' }
  | { type: 'SET_AUDIT_REPORT'; payload: AuditReport }
  | { type: 'START_DEBRIEF' }
  | { type: 'RESET_GAME' };

// Initial State
const initialState: GameState = {
  phase: 'IDLE',
  difficulty: 'MEDIUM',
  difficultyFactors: {
    affectsTimer: true,
    affectsComplexity: true,
    affectsTaskCount: false,
  },
  language: 'javascript',
  tasks: [],
  currentTaskIndex: 0,
  timePerTask: 30,
  timeRemaining: 30,
  score: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  gameOverReason: undefined,
  auditReport: undefined,
};

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        phase: 'IDLE',
      };

    case 'SET_DIFFICULTY': {
      const config = calculateGameConfig(action.payload.difficulty, action.payload.factors);
      return {
        ...state,
        difficulty: action.payload.difficulty,
        difficultyFactors: action.payload.factors,
        timePerTask: config.timePerTask,
        timeRemaining: config.timePerTask,
      };
    }

    case 'SET_LANGUAGE':
      return {
        ...state,
        language: action.payload,
      };

    case 'START_LOADING':
      return {
        ...state,
        phase: 'LOADING',
        tasks: [],
        currentTaskIndex: 0,
        score: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        gameOverReason: undefined,
        auditReport: undefined,
      };

    case 'LOAD_TASKS': {
      const tasks = action.payload.map((task, index) => ({
        ...task,
        status: index === 0 ? 'current' : 'pending',
      })) as Task[];
      return {
        ...state,
        tasks,
        timeRemaining: state.timePerTask,
      };
    }

    case 'START_PLAYING':
      return {
        ...state,
        phase: 'PLAYING',
        timeRemaining: state.timePerTask,
      };

    case 'ANSWER_TASK': {
      const currentTask = state.tasks[state.currentTaskIndex];
      if (!currentTask) return state;

      const userAnswer = action.payload.answer;
      const isCorrect =
        (userAnswer === 'vulnerable' && currentTask.isVulnerable) ||
        (userAnswer === 'safe' && !currentTask.isVulnerable);

      // Check for game over: clicked "Vulnerable" on safe code
      if (userAnswer === 'vulnerable' && !currentTask.isVulnerable) {
        const updatedTasks = state.tasks.map((task, index) => {
          if (index === state.currentTaskIndex) {
            return { ...task, status: 'failed' as const, userAnswer };
          }
          return task;
        });

        return {
          ...state,
          tasks: updatedTasks,
          totalIncorrect: state.totalIncorrect + 1,
          gameOverReason: 'wrong_answer',
          phase: 'AUDITING',
        };
      }

      // Update task status
      const updatedTasks = state.tasks.map((task, index) => {
        if (index === state.currentTaskIndex) {
          return {
            ...task,
            status: isCorrect ? 'completed' : 'failed',
            userAnswer,
          } as Task;
        }
        // Mark next task as current
        if (index === state.currentTaskIndex + 1) {
          return { ...task, status: 'current' as const };
        }
        return task;
      });

      const newScore = isCorrect ? state.score + 100 : state.score;
      const isLastTask = state.currentTaskIndex >= state.tasks.length - 1;

      if (isLastTask) {
        return {
          ...state,
          tasks: updatedTasks,
          score: newScore,
          totalCorrect: isCorrect ? state.totalCorrect + 1 : state.totalCorrect,
          totalIncorrect: isCorrect ? state.totalIncorrect : state.totalIncorrect + 1,
          gameOverReason: 'completed',
          phase: 'AUDITING',
        };
      }

      return {
        ...state,
        tasks: updatedTasks,
        score: newScore,
        totalCorrect: isCorrect ? state.totalCorrect + 1 : state.totalCorrect,
        totalIncorrect: isCorrect ? state.totalIncorrect : state.totalIncorrect + 1,
        currentTaskIndex: state.currentTaskIndex + 1,
        timeRemaining: state.timePerTask,
      };
    }

    case 'NEXT_TASK': {
      const nextIndex = state.currentTaskIndex + 1;
      if (nextIndex >= state.tasks.length) {
        return {
          ...state,
          gameOverReason: 'completed',
          phase: 'AUDITING',
        };
      }

      const updatedTasks = state.tasks.map((task, index) => {
        if (index === nextIndex) {
          return { ...task, status: 'current' as const };
        }
        return task;
      });

      return {
        ...state,
        tasks: updatedTasks,
        currentTaskIndex: nextIndex,
        timeRemaining: state.timePerTask,
      };
    }

    case 'TICK_TIMER':
      if (state.timeRemaining <= 1) {
        return {
          ...state,
          timeRemaining: 0,
        };
      }
      return {
        ...state,
        timeRemaining: state.timeRemaining - 1,
      };

    case 'TIME_UP': {
      // Mark current task as failed
      const updatedTasks = state.tasks.map((task, index) => {
        if (index === state.currentTaskIndex) {
          return { ...task, status: 'failed' as const };
        }
        return task;
      });

      return {
        ...state,
        tasks: updatedTasks,
        gameOverReason: 'timeout',
        phase: 'AUDITING',
      };
    }

    case 'GAME_OVER':
      return {
        ...state,
        gameOverReason: action.payload.reason,
        phase: 'AUDITING',
      };

    case 'START_AUDITING':
      return {
        ...state,
        phase: 'AUDITING',
      };

    case 'SET_AUDIT_REPORT':
      return {
        ...state,
        auditReport: action.payload,
      };

    case 'START_DEBRIEF':
      return {
        ...state,
        phase: 'DEBRIEF',
      };

    case 'RESET_GAME':
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

// Hook
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Action creators
  const setDifficulty = useCallback((difficulty: Difficulty, factors: DifficultyFactors) => {
    dispatch({ type: 'SET_DIFFICULTY', payload: { difficulty, factors } });
  }, []);

  const setLanguage = useCallback((language: Language) => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  }, []);

  const startLoading = useCallback(() => {
    dispatch({ type: 'START_LOADING' });
  }, []);

  const loadTasks = useCallback((tasks: Task[]) => {
    dispatch({ type: 'LOAD_TASKS', payload: tasks });
  }, []);

  const startPlaying = useCallback(() => {
    dispatch({ type: 'START_PLAYING' });
  }, []);

  const answerTask = useCallback((answer: 'safe' | 'vulnerable') => {
    dispatch({ type: 'ANSWER_TASK', payload: { answer } });
  }, []);

  const nextTask = useCallback(() => {
    dispatch({ type: 'NEXT_TASK' });
  }, []);

  const tickTimer = useCallback(() => {
    dispatch({ type: 'TICK_TIMER' });
  }, []);

  const timeUp = useCallback(() => {
    dispatch({ type: 'TIME_UP' });
  }, []);

  const gameOver = useCallback((reason: 'timeout' | 'wrong_answer' | 'completed') => {
    dispatch({ type: 'GAME_OVER', payload: { reason } });
  }, []);

  const startAuditing = useCallback(() => {
    dispatch({ type: 'START_AUDITING' });
  }, []);

  const setAuditReport = useCallback((report: AuditReport) => {
    dispatch({ type: 'SET_AUDIT_REPORT', payload: report });
  }, []);

  const startDebrief = useCallback(() => {
    dispatch({ type: 'START_DEBRIEF' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  // Computed values
  const currentTask = state.tasks[state.currentTaskIndex] || null;
  const completedTasks = state.tasks.filter((t) => t.status === 'completed').length;
  const failedTasks = state.tasks.filter((t) => t.status === 'failed');
  const pendingTasks = state.tasks.filter((t) => t.status === 'pending' || t.status === 'current');
  const progress = state.tasks.length > 0 ? (completedTasks / state.tasks.length) * 100 : 0;

  return {
    state,
    currentTask,
    completedTasks,
    failedTasks,
    pendingTasks,
    progress,
    actions: {
      setDifficulty,
      setLanguage,
      startLoading,
      loadTasks,
      startPlaying,
      answerTask,
      nextTask,
      tickTimer,
      timeUp,
      gameOver,
      startAuditing,
      setAuditReport,
      startDebrief,
      resetGame,
    },
  };
}

export type GameActions = ReturnType<typeof useGameState>['actions'];
