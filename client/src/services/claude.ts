import type {
  GenerateSnippetsRequest,
  GenerateSnippetsResponse,
  ApiResult,
  IClaudeService,
} from '../types';
import type { Task, SystemName, VulnerabilityType } from '../types';
import api from './api';

// System names for tasks
const SYSTEM_NAMES: SystemName[] = [
  'O2',
  'NAVIGATION',
  'SHIELDS',
  'REACTOR',
  'COMMUNICATIONS',
  'ELECTRICAL',
  'MEDBAY',
  'SECURITY',
  'WEAPONS',
  'ADMIN',
];

// Mock vulnerable code snippets for development
const MOCK_SNIPPETS: Record<string, { code: string; vulnerable: boolean; type: VulnerabilityType; line?: number }[]> = {
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
      code: `// Fetch user avatar
async function fetchAvatar(url) {
  const response = await fetch(url);
  return response.blob();
}`,
      vulnerable: true,
      type: 'SSRF',
      line: 3,
    },
    {
      code: `// Execute system command
function runDiagnostic(input) {
  const cmd = 'diagnostic --target ' + input;
  return exec(cmd);
}`,
      vulnerable: true,
      type: 'COMMAND_INJECTION',
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
    {
      code: `// Validated file download
function downloadFile(filename) {
  const sanitized = path.basename(filename);
  const filepath = path.join(UPLOAD_DIR, sanitized);
  return fs.readFile(filepath);
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
      code: `# Template renderer
def render_page(user_input):
    template = f"<div>{user_input}</div>"
    return template`,
      vulnerable: true,
      type: 'XSS',
      line: 3,
    },
    {
      code: `# Command executor
def run_command(user_cmd):
    os.system(f"echo {user_cmd}")`,
      vulnerable: true,
      type: 'RCE',
      line: 3,
    },
    {
      code: `# URL fetcher
def fetch_url(url):
    response = requests.get(url)
    return response.text`,
      vulnerable: true,
      type: 'SSRF',
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
    {
      code: `# Sanitized output
def render_page_safe(user_input):
    escaped = html.escape(user_input)
    return f"<div>{escaped}</div>"`,
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
      code: `// File reader
public String readFile(String filename) {
    Path path = Paths.get("/data/" + filename);
    return Files.readString(path);
}`,
      vulnerable: true,
      type: 'PATH_TRAVERSAL',
      line: 3,
    },
    {
      code: `// Object deserializer
public Object deserialize(byte[] data) {
    ObjectInputStream ois = new ObjectInputStream(
        new ByteArrayInputStream(data));
    return ois.readObject();
}`,
      vulnerable: true,
      type: 'INSECURE_DESERIALIZATION',
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
      code: `// Command runner
func RunCommand(input string) (string, error) {
    cmd := exec.Command("sh", "-c", input)
    return cmd.Output()
}`,
      vulnerable: true,
      type: 'RCE',
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
// Display message
function showMessage() {
    echo "<div>" . $_GET['message'] . "</div>";
}`,
      vulnerable: true,
      type: 'XSS',
      line: 4,
    },
    {
      code: `<?php
// Include file
function loadPage($page) {
    include($_GET['page'] . ".php");
}`,
      vulnerable: true,
      type: 'PATH_TRAVERSAL',
      line: 4,
    },
    {
      code: `<?php
// Safe query
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

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Shuffle array
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

class ClaudeService implements IClaudeService {
  async generateSnippets(
    request: GenerateSnippetsRequest
  ): Promise<ApiResult<GenerateSnippetsResponse>> {
    try {
      // Try to use real API first
      const response = await api.generateSnippets({
        language: request.language,
        difficulty: request.difficulty,
        complexityLevel: request.complexityLevel,
        count: request.count,
      });
      return { success: true, data: response as GenerateSnippetsResponse };
    } catch {
      // Fall back to mock data
      console.log('Using mock data for code snippets');
      return this.generateMockSnippets(request);
    }
  }

  private generateMockSnippets(
    request: GenerateSnippetsRequest
  ): ApiResult<GenerateSnippetsResponse> {
    const snippets = MOCK_SNIPPETS[request.language] || MOCK_SNIPPETS.javascript;
    const shuffledSnippets = shuffle(snippets);
    const selectedSnippets = shuffledSnippets.slice(0, request.count);
    const shuffledSystems = shuffle([...SYSTEM_NAMES]);

    const tasks: Task[] = selectedSnippets.map((snippet, index) => ({
      id: generateId(),
      systemName: shuffledSystems[index % shuffledSystems.length],
      code: snippet.code,
      language: request.language,
      isVulnerable: snippet.vulnerable,
      vulnerabilityType: snippet.type,
      vulnerabilityLine: snippet.line,
      status: 'pending' as const,
    }));

    return {
      success: true,
      data: { tasks },
    };
  }
}

export const claudeService = new ClaudeService();
export default claudeService;
