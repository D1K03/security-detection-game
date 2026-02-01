import type {
  GenerateSnippetsRequest,
  GenerateSnippetsResponse,
  ApiResult,
  IClaudeService,
} from '../types';
import api from './api';

class ClaudeService implements IClaudeService {
  async generateSnippets(
    request: GenerateSnippetsRequest
  ): Promise<ApiResult<GenerateSnippetsResponse>> {
    try {
      const response = await api.generateSnippets({
        language: request.language,
        difficulty: request.difficulty,
        complexityLevel: request.complexityLevel,
        count: request.count,
      });
      return { success: true, data: response as GenerateSnippetsResponse };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLAUDE_UNAVAILABLE',
          message:
            error instanceof Error
              ? error.message
              : 'Claude generation service is unavailable',
        },
      };
    }
  }
}

export const claudeService = new ClaudeService();
export default claudeService;
