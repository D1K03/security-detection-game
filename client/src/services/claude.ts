import type {
  GenerateSnippetsRequest,
  GenerateSnippetsResponse,
  ApiResult,
  IClaudeService,
} from '../types';
import type { Task, SystemName, VulnerabilityType, Language } from '../types';
import { api, type BackendTask } from './api';

// Map backend system names to frontend format
function mapSystemName(name: string): SystemName {
  const systemMap: Record<string, SystemName> = {
    'O2': 'O2',
    'Navigation': 'NAVIGATION',
    'Shields': 'SHIELDS',
    'Reactor': 'REACTOR',
    'Communications': 'COMMUNICATIONS',
    'Electrical': 'ELECTRICAL',
    'Medbay': 'MEDBAY',
    'Security': 'SECURITY',
    'Weapons': 'WEAPONS',
    'Admin': 'ADMIN',
  };
  return systemMap[name] || 'SECURITY';
}


// Convert backend task to frontend task format
function mapBackendTaskToFrontend(task: BackendTask, index: number): Task {
  return {
    id: task.id,
    systemName: mapSystemName(task.system_name),
    code: task.code,
    language: task.language as Language,
    isVulnerable: false, // Will be determined by user's answer
    vulnerabilityType: 'SAFE', // Hidden from user
    status: index === 0 ? 'current' : 'pending',
  };
}

// Store session ID for later use
let currentSessionId: string | null = null;

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

export function setCurrentSessionId(sessionId: string | null): void {
  currentSessionId = sessionId;
}

class ClaudeService implements IClaudeService {
  async generateSnippets(
    request: GenerateSnippetsRequest
  ): Promise<ApiResult<GenerateSnippetsResponse>> {
    try {
      // Create session with backend
      const session = await api.createSession({
        difficulty: request.difficulty,
        taskCount: request.count,
        language: request.language,
      });

      // Store session ID
      currentSessionId = session.session_id;

      // Get tasks from backend
      const taskResponse = await api.getTasks(session.session_id);

      // Map backend tasks to frontend format
      const tasks: Task[] = taskResponse.tasks.map((task, index) =>
        mapBackendTaskToFrontend(task, index)
      );

      return {
        success: true,
        data: { tasks },
      };
    } catch (error) {
      console.warn('Backend API failed, using mock data:', error);
      // Fall back to mock data
      return this.generateMockSnippets(request);
    }
  }

  private generateMockSnippets(
    request: GenerateSnippetsRequest
  ): ApiResult<GenerateSnippetsResponse> {
    // Mock data as fallback
    const mockSnippets = this.getMockSnippets(request.language);
    const shuffled = [...mockSnippets].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, request.count);

    const systemNames: SystemName[] = [
      'O2', 'NAVIGATION', 'SHIELDS', 'REACTOR', 'COMMUNICATIONS',
      'ELECTRICAL', 'MEDBAY', 'SECURITY', 'WEAPONS', 'ADMIN'
    ];
    const shuffledSystems = [...systemNames].sort(() => Math.random() - 0.5);

    const tasks: Task[] = selected.map((snippet, index) => ({
      id: `task-${index + 1}`,
      systemName: shuffledSystems[index % shuffledSystems.length],
      code: snippet.code,
      language: request.language,
      isVulnerable: snippet.vulnerable,
      vulnerabilityType: snippet.type,
      vulnerabilityLine: snippet.line,
      status: index === 0 ? 'current' : 'pending',
    }));

    return {
      success: true,
      data: { tasks },
    };
  }

  private getMockSnippets(language: Language): Array<{
    code: string;
    vulnerable: boolean;
    type: VulnerabilityType;
    line?: number;
  }> {
    const snippets: Record<Language, Array<{
      code: string;
      vulnerable: boolean;
      type: VulnerabilityType;
      line?: number;
    }>> = {
      javascript: [
        {
          code: `// User search functionality
function searchUsers(query) {
  const sql = "SELECT * FROM users WHERE name = '" + query + "'";
  return database.execute(sql);
}`,
          vulnerable: true,
          type: 'SQL_INJECTION',
          line: 3,
        },
        {
          code: `// Display user comment
function renderComment(comment) {
  document.getElementById('comment').innerHTML = comment.text;
}`,
          vulnerable: true,
          type: 'XSS',
          line: 3,
        },
        {
          code: `// Safe user lookup
function findUser(userId) {
  const id = parseInt(userId, 10);
  if (isNaN(id)) return null;
  return database.query('SELECT * FROM users WHERE id = ?', [id]);
}`,
          vulnerable: false,
          type: 'SAFE',
        },
        {
          code: `// Secure comment display
function displayComment(comment) {
  const escaped = escapeHtml(comment.text);
  document.getElementById('comment').textContent = escaped;
}`,
          vulnerable: false,
          type: 'SAFE',
        },
      ],
      python: [
        {
          code: `# Database query handler
def get_user(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return cursor.execute(query)`,
          vulnerable: true,
          type: 'SQL_INJECTION',
          line: 3,
        },
        {
          code: `# Safe database query
def get_user_safe(username):
    query = "SELECT * FROM users WHERE username = %s"
    return cursor.execute(query, (username,))`,
          vulnerable: false,
          type: 'SAFE',
        },
      ],
      java: [
        {
          code: `// User authentication
public User login(String username, String password) {
    String query = "SELECT * FROM users WHERE username = '" +
                   username + "' AND password = '" + password + "'";
    return jdbcTemplate.queryForObject(query, User.class);
}`,
          vulnerable: true,
          type: 'SQL_INJECTION',
          line: 3,
        },
        {
          code: `// Safe parameterized query
public User loginSafe(String username, String password) {
    String query = "SELECT * FROM users WHERE username = ? AND password = ?";
    return jdbcTemplate.queryForObject(query, User.class, username, password);
}`,
          vulnerable: false,
          type: 'SAFE',
        },
      ],
      go: [
        {
          code: `// Database handler
func GetUser(username string) (*User, error) {
    query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", username)
    return db.Query(query)
}`,
          vulnerable: true,
          type: 'SQL_INJECTION',
          line: 3,
        },
        {
          code: `// Safe query with prepared statement
func GetUserSafe(username string) (*User, error) {
    query := "SELECT * FROM users WHERE name = $1"
    return db.QueryRow(query, username).Scan(&user)
}`,
          vulnerable: false,
          type: 'SAFE',
        },
      ],
      php: [
        {
          code: `<?php
// User lookup
function getUser($id) {
    $query = "SELECT * FROM users WHERE id = " . $_GET['id'];
    return mysqli_query($conn, $query);
}`,
          vulnerable: true,
          type: 'SQL_INJECTION',
          line: 4,
        },
        {
          code: `<?php
// Safe prepared query
function getUserSafe($id) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}`,
          vulnerable: false,
          type: 'SAFE',
        },
      ],
    };

    return snippets[language] || snippets.javascript;
  }
}

export const claudeService = new ClaudeService();
export default claudeService;
