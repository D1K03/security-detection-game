import type { Language, Difficulty, Task, AuditReport, AuditFinding } from './game';

// ============================================
// Claude Code Generation API
// ============================================

export interface GenerateSnippetsRequest {
  language: Language;
  difficulty: Difficulty;
  complexityLevel: 'basic' | 'intermediate' | 'advanced';
  count: number;
}

export interface GenerateSnippetsResponse {
  tasks: Task[];
  error?: string;
}

// ============================================
// Hacktron Audit API
// ============================================

export interface AuditRequest {
  tasks: Task[];
  language: Language;
}

export interface AuditResponse {
  report: AuditReport;
  error?: string;
}

// ============================================
// ElevenLabs TTS API
// ============================================

export interface TTSRequest {
  text: string;
  voiceId?: string;
  voiceSettings?: {
    stability: number;
    similarityBoost: number;
    style?: number;
  };
}

export interface TTSResponse {
  audioUrl: string;
  duration?: number;
  error?: string;
}

// ============================================
// API Error Handling
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// ============================================
// API Service Interface
// ============================================

export interface IClaudeService {
  generateSnippets(request: GenerateSnippetsRequest): Promise<ApiResult<GenerateSnippetsResponse>>;
}

export interface IHacktronService {
  auditTasks(request: AuditRequest): Promise<ApiResult<AuditResponse>>;
}

export interface IElevenLabsService {
  generateSpeech(request: TTSRequest): Promise<ApiResult<TTSResponse>>;
  generateReportAudio(summary: string): Promise<ApiResult<TTSResponse>>;
}

// Re-export for convenience
export type { AuditReport, AuditFinding };
