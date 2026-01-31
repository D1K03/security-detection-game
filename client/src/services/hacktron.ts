import type {
  AuditRequest,
  AuditResponse,
  ApiResult,
  IHacktronService,
  AuditFinding,
} from '../types';
import type { Task, VulnerabilityType } from '../types';
import api from './api';

// Remediation suggestions by vulnerability type
const REMEDIATIONS: Record<VulnerabilityType, string> = {
  XSS: 'Use proper output encoding. For HTML context, use textContent instead of innerHTML. Consider using a templating library with auto-escaping.',
  SQL_INJECTION: 'Use parameterized queries or prepared statements. Never concatenate user input directly into SQL queries.',
  RCE: 'Avoid using shell commands with user input. If necessary, use strict input validation and allowlisting.',
  SSRF: 'Validate and sanitize URLs. Use an allowlist of permitted domains. Disable redirects or validate redirect targets.',
  PATH_TRAVERSAL: 'Sanitize file paths using path.basename() or equivalent. Use an allowlist of permitted directories.',
  COMMAND_INJECTION: 'Avoid shell execution. If required, use parameterized commands and strict input validation.',
  INSECURE_DESERIALIZATION: 'Avoid deserializing untrusted data. Use safe serialization formats like JSON. Implement integrity checks.',
  SAFE: 'No remediation needed - this code follows security best practices.',
};

// Severity mapping
const SEVERITY_MAP: Record<VulnerabilityType, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
  XSS: 'HIGH',
  SQL_INJECTION: 'CRITICAL',
  RCE: 'CRITICAL',
  SSRF: 'HIGH',
  PATH_TRAVERSAL: 'HIGH',
  COMMAND_INJECTION: 'CRITICAL',
  INSECURE_DESERIALIZATION: 'HIGH',
  SAFE: 'LOW',
};

// Description templates
const DESCRIPTIONS: Record<VulnerabilityType, string> = {
  XSS: 'Cross-Site Scripting (XSS) vulnerability detected. User input is directly inserted into the DOM without proper sanitization, allowing attackers to inject malicious scripts.',
  SQL_INJECTION: 'SQL Injection vulnerability detected. User input is directly concatenated into SQL queries, allowing attackers to manipulate database operations.',
  RCE: 'Remote Code Execution (RCE) vulnerability detected. User input is passed to system command execution without proper validation.',
  SSRF: 'Server-Side Request Forgery (SSRF) vulnerability detected. The application fetches URLs provided by users without validation, allowing internal network access.',
  PATH_TRAVERSAL: 'Path Traversal vulnerability detected. User input is used in file path construction without proper sanitization, allowing access to arbitrary files.',
  COMMAND_INJECTION: 'Command Injection vulnerability detected. User input is concatenated into shell commands, allowing arbitrary command execution.',
  INSECURE_DESERIALIZATION: 'Insecure Deserialization vulnerability detected. Untrusted data is deserialized without validation, potentially allowing code execution.',
  SAFE: 'This code segment follows security best practices and does not contain obvious vulnerabilities.',
};

class HacktronService implements IHacktronService {
  async auditTasks(request: AuditRequest): Promise<ApiResult<AuditResponse>> {
    try {
      // Try to use real API first
      const response = await api.auditTasks({
        tasks: request.tasks,
        language: request.language,
      });
      return { success: true, data: response as AuditResponse };
    } catch {
      // Fall back to mock analysis
      console.log('Using mock data for audit report');
      return this.generateMockAudit(request);
    }
  }

  private generateMockAudit(request: AuditRequest): ApiResult<AuditResponse> {
    const findings: AuditFinding[] = request.tasks
      .filter((task) => task.isVulnerable)
      .map((task: Task) => ({
        taskId: task.id,
        systemName: task.systemName,
        vulnerability: task.vulnerabilityType,
        severity: SEVERITY_MAP[task.vulnerabilityType],
        description: DESCRIPTIONS[task.vulnerabilityType],
        codeLocation: {
          line: task.vulnerabilityLine || 1,
          column: 1,
        },
        remediation: REMEDIATIONS[task.vulnerabilityType],
        codeSnippet: task.code,
      }));

    // Generate summary
    const vulnerableCount = findings.length;
    const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = findings.filter((f) => f.severity === 'HIGH').length;

    let summary: string;
    if (vulnerableCount === 0) {
      summary = 'Security scan complete. All analyzed code segments follow security best practices. No vulnerabilities detected.';
    } else {
      summary = `Security scan detected ${vulnerableCount} vulnerabilit${vulnerableCount === 1 ? 'y' : 'ies'} across ship systems. `;
      if (criticalCount > 0) {
        summary += `${criticalCount} CRITICAL severity issue${criticalCount === 1 ? '' : 's'} require immediate attention. `;
      }
      if (highCount > 0) {
        summary += `${highCount} HIGH severity issue${highCount === 1 ? '' : 's'} should be addressed promptly. `;
      }
      summary += 'Review the detailed findings below for remediation guidance.';
    }

    return {
      success: true,
      data: {
        report: {
          findings,
          summary,
        },
      },
    };
  }
}

export const hacktronService = new HacktronService();
export default hacktronService;
