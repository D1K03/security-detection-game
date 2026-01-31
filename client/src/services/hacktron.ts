import type {
  AuditRequest,
  AuditResponse,
  ApiResult,
  IHacktronService,
} from '../types';
import api from './api';

class HacktronService implements IHacktronService {
  async auditTasks(request: AuditRequest): Promise<ApiResult<AuditResponse>> {
    try {
      const response = await api.auditTasks({
        tasks: request.tasks,
        language: request.language,
      });
      return { success: true, data: response as AuditResponse };
    } catch (error) {
      console.error('Failed to audit tasks:', error);
      return {
        success: false,
        error: {
          code: 'AUDIT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to audit code',
        },
      };
    }
  }
}

export const hacktronService = new HacktronService();
export default hacktronService;
