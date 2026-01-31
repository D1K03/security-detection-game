// Game types
export type {
  GamePhase,
  Difficulty,
  DifficultyFactors,
  Language,
  VulnerabilityType,
  SystemName,
  TaskStatus,
  Task,
  GameState,
  AuditReport,
  AuditFinding,
  GameConfig,
} from './game';

export { calculateGameConfig } from './game';

// API types
export type {
  GenerateSnippetsRequest,
  GenerateSnippetsResponse,
  AuditRequest,
  AuditResponse,
  TTSRequest,
  TTSResponse,
  ApiError,
  ApiResult,
  IClaudeService,
  IHacktronService,
  IElevenLabsService,
} from './api';
