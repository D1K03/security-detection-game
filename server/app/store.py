from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

# Import schemas and configurations
from .schemas import (
    DIFFICULTY_CONFIGS,
    AnswerSchema,
    AuditLogSchema,
    Difficulty,
    FinishResponse,
    Language,
    MentorReportSchema,
    SubmitAnswersResponse,
    SystemName,
    TaskPublicSchema,
    TaskSchema,
)


SYSTEM_NAMES: List[SystemName] = [
    "O2",
    "Navigation",
    "Shields",
    "Reactor",
    "Communications",
    "Electrical",
    "Medbay",
    "Security",
    "Weapons",
    "Admin",
]


@dataclass
class SessionData:
    session_id: str
    difficulty: Difficulty
    language: Language
    created_at: datetime
    tasks: List[TaskSchema]
    answers: Dict[str, AnswerSchema] = field(default_factory=dict)
    audit_logs: List[AuditLogSchema] = field(default_factory=list)
    mentor_report: Optional[MentorReportSchema] = None


class InMemoryStore:
    def __init__(self) -> None:
        self.sessions: Dict[str, SessionData] = {}

    # Create a new session with generated tasks
    def create_session(self, difficulty: Difficulty, task_count: int, language: Language = "javascript") -> SessionData:
        session_id = uuid4().hex
        created_at = datetime.utcnow()
        tasks = generate_tasks(difficulty, task_count, language)
        session = SessionData(
            session_id=session_id,
            difficulty=difficulty,
            language=language,
            created_at=created_at,
            tasks=tasks,
        )
        self.sessions[session_id] = session
        return session

    # Retrieve a session by ID
    def get_session(self, session_id: str) -> SessionData:
        session = self.sessions.get(session_id)
        if not session:
            raise KeyError(f"Unknown session: {session_id}")
        return session

    def list_public_tasks(self, session_id: str) -> List[TaskPublicSchema]:
        session = self.get_session(session_id)
        return [
            TaskPublicSchema(
                id=task.id,
                system_name=task.system_name,
                code=task.code,
                language=task.language,
                difficulty=task.difficulty,
            )
            for task in session.tasks
        ]
    # Submit answers and score them
    def submit_answers(self, session_id: str, answers: List[AnswerSchema]) -> SubmitAnswersResponse:
        session = self.get_session(session_id)
        for answer in answers:
            session.answers[answer.task_id] = answer

        correct, incorrect, missed_task_ids = score_session(session)
        return SubmitAnswersResponse(
            correct=correct,
            incorrect=incorrect,
            missed_task_ids=missed_task_ids,
        )

    # Finish session, generate audit logs and mentor report
    def finish_session(self, session_id: str) -> FinishResponse:
        session = self.get_session(session_id)
        correct, incorrect, missed_task_ids = score_session(session)

        if not session.audit_logs:
            session.audit_logs = build_stub_audit_logs(session, missed_task_ids)

        if session.mentor_report is None:
            session.mentor_report = build_stub_mentor_report(missed_task_ids)

        return FinishResponse(
            session_id=session_id,
            score=correct,
            missed_task_ids=missed_task_ids,
            audit_logs=session.audit_logs,
            mentor_report=session.mentor_report,
        )

# Code snippets organized by language and vulnerability type
CODE_SNIPPETS: Dict[Language, Dict[str, List[Dict]]] = {
    "javascript": {
        "vulnerable": [
            {
                "code": '''// User search functionality
function searchUsers(query) {
  const sql = "SELECT * FROM users WHERE name = '" + query + "'";
  return database.execute(sql);
}''',
                "type": "sqli",
                "line": 3,
                "explanation": "SQL query uses string concatenation with user input, allowing SQL injection attacks."
            },
            {
                "code": '''// Display user comment
function renderComment(comment) {
  document.getElementById('comment').innerHTML = comment.text;
}''',
                "type": "xss",
                "line": 3,
                "explanation": "User input is directly inserted into innerHTML without sanitization, enabling XSS attacks."
            },
            {
                "code": '''// Fetch external resource
async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}''',
                "type": "ssrf",
                "line": 3,
                "explanation": "User-provided URL is fetched without validation, enabling SSRF attacks to internal resources."
            },
            {
                "code": '''// Run system diagnostic
function runDiagnostic(target) {
  const cmd = 'ping -c 4 ' + target;
  return require('child_process').execSync(cmd);
}''',
                "type": "command_injection",
                "line": 3,
                "explanation": "User input is concatenated into a shell command, allowing command injection."
            },
            {
                "code": '''// Read configuration file
function loadConfig(filename) {
  const path = './configs/' + filename;
  return fs.readFileSync(path, 'utf8');
}''',
                "type": "path_traversal",
                "line": 3,
                "explanation": "Filename is concatenated without sanitization, allowing path traversal with ../ sequences."
            },
            {
                "code": '''// Process user template
function renderTemplate(template) {
  return eval('`' + template + '`');
}''',
                "type": "rce",
                "line": 3,
                "explanation": "User input is passed to eval(), allowing arbitrary code execution."
            },
        ],
        "safe": [
            {
                "code": '''// Safe user lookup with parameterized query
function findUser(userId) {
  const id = parseInt(userId, 10);
  if (isNaN(id)) return null;
  return database.query('SELECT * FROM users WHERE id = ?', [id]);
}''',
                "explanation": "Uses parameterized query and validates input type."
            },
            {
                "code": '''// Secure comment display
function displayComment(comment) {
  const div = document.getElementById('comment');
  div.textContent = comment.text;
}''',
                "explanation": "Uses textContent instead of innerHTML to prevent XSS."
            },
            {
                "code": '''// Validated file download
function downloadFile(filename) {
  const sanitized = path.basename(filename);
  const filepath = path.join(UPLOAD_DIR, sanitized);
  return fs.readFileSync(filepath);
}''',
                "explanation": "Uses path.basename to prevent path traversal attacks."
            },
            {
                "code": '''// Safe URL validation
async function fetchApprovedUrl(url) {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error('Host not allowed');
  }
  return fetch(url);
}''',
                "explanation": "Validates URL against allowlist before fetching."
            },
        ]
    },
    "python": {
        "vulnerable": [
            {
                "code": '''# Database query handler
def get_user(username):
    query = f"SELECT * FROM users WHERE username = '{username}'"
    return cursor.execute(query)''',
                "type": "sqli",
                "line": 3,
                "explanation": "f-string interpolation in SQL query allows SQL injection."
            },
            {
                "code": '''# Template renderer
def render_page(user_input):
    template = f"<div>{user_input}</div>"
    return template''',
                "type": "xss",
                "line": 3,
                "explanation": "User input directly embedded in HTML without escaping."
            },
            {
                "code": '''# Command executor
def run_command(user_cmd):
    os.system(f"echo {user_cmd}")''',
                "type": "rce",
                "line": 3,
                "explanation": "User input passed to os.system allows arbitrary command execution."
            },
            {
                "code": '''# URL fetcher
def fetch_url(url):
    response = requests.get(url)
    return response.text''',
                "type": "ssrf",
                "line": 3,
                "explanation": "Fetches user-provided URL without validation."
            },
            {
                "code": '''# File reader
def read_file(filename):
    with open(f"/data/{filename}", "r") as f:
        return f.read()''',
                "type": "path_traversal",
                "line": 3,
                "explanation": "Filename concatenated without sanitization allows path traversal."
            },
        ],
        "safe": [
            {
                "code": '''# Safe database query with parameterized statement
def get_user_safe(username):
    query = "SELECT * FROM users WHERE username = %s"
    return cursor.execute(query, (username,))''',
                "explanation": "Uses parameterized query to prevent SQL injection."
            },
            {
                "code": '''# Sanitized HTML output
def render_page_safe(user_input):
    escaped = html.escape(user_input)
    return f"<div>{escaped}</div>"''',
                "explanation": "Escapes user input before embedding in HTML."
            },
            {
                "code": '''# Safe subprocess execution
def run_command_safe(args):
    allowed = ["status", "version", "help"]
    if args[0] not in allowed:
        raise ValueError("Command not allowed")
    return subprocess.run(args, capture_output=True)''',
                "explanation": "Validates command against allowlist and uses subprocess with list args."
            },
        ]
    },
    "java": {
        "vulnerable": [
            {
                "code": '''// User authentication
public User login(String username, String password) {
    String query = "SELECT * FROM users WHERE username = '" +
                   username + "' AND password = '" + password + "'";
    return jdbcTemplate.queryForObject(query, User.class);
}''',
                "type": "sqli",
                "line": 3,
                "explanation": "String concatenation in SQL query allows injection."
            },
            {
                "code": '''// File reader
public String readFile(String filename) throws IOException {
    Path path = Paths.get("/data/" + filename);
    return Files.readString(path);
}''',
                "type": "path_traversal",
                "line": 3,
                "explanation": "Filename concatenated without validation allows path traversal."
            },
            {
                "code": '''// Object deserializer
public Object deserialize(byte[] data) throws Exception {
    ObjectInputStream ois = new ObjectInputStream(
        new ByteArrayInputStream(data));
    return ois.readObject();
}''',
                "type": "rce",
                "line": 3,
                "explanation": "Deserializes untrusted data which can lead to RCE via gadget chains."
            },
        ],
        "safe": [
            {
                "code": '''// Safe parameterized query
public User loginSafe(String username, String password) {
    String query = "SELECT * FROM users WHERE username = ? AND password = ?";
    return jdbcTemplate.queryForObject(query, User.class, username, password);
}''',
                "explanation": "Uses parameterized query with placeholders."
            },
            {
                "code": '''// Validated file access
public String readFileSafe(String filename) throws IOException {
    Path base = Paths.get("/data/").toRealPath();
    Path file = base.resolve(filename).normalize();
    if (!file.startsWith(base)) {
        throw new SecurityException("Path traversal detected");
    }
    return Files.readString(file);
}''',
                "explanation": "Validates resolved path stays within base directory."
            },
        ]
    },
    "go": {
        "vulnerable": [
            {
                "code": '''// Database handler
func GetUser(username string) (*User, error) {
    query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", username)
    return db.Query(query)
}''',
                "type": "sqli",
                "line": 3,
                "explanation": "fmt.Sprintf used to build SQL query allows injection."
            },
            {
                "code": '''// Command runner
func RunCommand(input string) (string, error) {
    cmd := exec.Command("sh", "-c", input)
    out, err := cmd.Output()
    return string(out), err
}''',
                "type": "rce",
                "line": 3,
                "explanation": "User input passed directly to shell execution."
            },
        ],
        "safe": [
            {
                "code": '''// Safe query with prepared statement
func GetUserSafe(username string) (*User, error) {
    query := "SELECT * FROM users WHERE name = $1"
    return db.QueryRow(query, username).Scan(&user)
}''',
                "explanation": "Uses prepared statement with placeholder."
            },
            {
                "code": '''// Safe command execution
func RunCommandSafe(args []string) (string, error) {
    allowed := map[string]bool{"ls": true, "pwd": true}
    if !allowed[args[0]] {
        return "", errors.New("command not allowed")
    }
    cmd := exec.Command(args[0], args[1:]...)
    out, err := cmd.Output()
    return string(out), err
}''',
                "explanation": "Validates command against allowlist, avoids shell."
            },
        ]
    },
    "php": {
        "vulnerable": [
            {
                "code": '''<?php
// User lookup
function getUser($id) {
    $query = "SELECT * FROM users WHERE id = " . $_GET['id'];
    return mysqli_query($conn, $query);
}''',
                "type": "sqli",
                "line": 4,
                "explanation": "User input concatenated directly into SQL query."
            },
            {
                "code": '''<?php
// Display message
function showMessage() {
    echo "<div>" . $_GET['message'] . "</div>";
}''',
                "type": "xss",
                "line": 4,
                "explanation": "User input echoed without escaping allows XSS."
            },
            {
                "code": '''<?php
// Include page
function loadPage($page) {
    include($_GET['page'] . ".php");
}''',
                "type": "path_traversal",
                "line": 4,
                "explanation": "User input in include() allows local file inclusion."
            },
        ],
        "safe": [
            {
                "code": '''<?php
// Safe prepared query
function getUserSafe($id) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}''',
                "explanation": "Uses prepared statement with parameter binding."
            },
            {
                "code": '''<?php
// Safe output
function showMessageSafe() {
    echo "<div>" . htmlspecialchars($_GET['message'], ENT_QUOTES) . "</div>";
}''',
                "explanation": "Uses htmlspecialchars to escape output."
            },
        ]
    },
}


# This will be replaced with a call to Claude to generate tasks
def generate_tasks(difficulty: Difficulty, task_count: int, language: Language = "javascript") -> List[TaskSchema]:
    config = DIFFICULTY_CONFIGS[difficulty]
    vulnerable_count = max(1, round(task_count * config.vuln_density))
    safe_count = task_count - vulnerable_count

    tasks: List[TaskSchema] = []
    snippets = CODE_SNIPPETS.get(language, CODE_SNIPPETS["javascript"])

    # Get available snippets
    vulnerable_snippets = snippets.get("vulnerable", [])
    safe_snippets = snippets.get("safe", [])

    # Shuffle and select snippets
    random.shuffle(vulnerable_snippets)
    random.shuffle(safe_snippets)

    # Shuffle system names
    systems = SYSTEM_NAMES.copy()
    random.shuffle(systems)

    task_index = 0

    # Add vulnerable tasks
    for i in range(min(vulnerable_count, len(vulnerable_snippets))):
        snippet = vulnerable_snippets[i]
        tasks.append(
            TaskSchema(
                id=f"task-{task_index + 1}",
                system_name=systems[task_index % len(systems)],
                code=snippet["code"],
                language=language,
                is_vulnerable=True,
                vulnerability_type=snippet["type"],
                vulnerability_line=snippet.get("line"),
                explanation=snippet.get("explanation"),
                difficulty=difficulty,
            )
        )
        task_index += 1

    # Add safe tasks
    for i in range(min(safe_count, len(safe_snippets))):
        snippet = safe_snippets[i]
        tasks.append(
            TaskSchema(
                id=f"task-{task_index + 1}",
                system_name=systems[task_index % len(systems)],
                code=snippet["code"],
                language=language,
                is_vulnerable=False,
                vulnerability_type="none",
                explanation=snippet.get("explanation"),
                difficulty=difficulty,
            )
        )
        task_index += 1

    # Shuffle the tasks so vulnerable and safe are mixed
    random.shuffle(tasks)

    # Re-assign IDs after shuffle
    for i, task in enumerate(tasks):
        task.id = f"task-{i + 1}"

    return tasks

# Scoring logic to compare user answers against expected vulnerabilities
def score_session(session: SessionData) -> tuple[int, int, List[str]]:
    correct = 0
    incorrect = 0
    missed: List[str] = []

    for task in session.tasks:
        answer = session.answers.get(task.id)
        if not answer:
            missed.append(task.id)
            continue

        expected_choice = "sabotaged" if task.is_vulnerable else "clean"
        if answer.user_choice == expected_choice:
            correct += 1
        else:
            incorrect += 1
            missed.append(task.id)

    return correct, incorrect, missed

#audit log for hacktron - to be replaced with real logs from hacktron
def build_stub_audit_logs(session: SessionData, missed_task_ids: List[str]) -> List[AuditLogSchema]:
    logs: List[AuditLogSchema] = []
    for task_id in missed_task_ids:
        logs.append(
            AuditLogSchema(
                task_id=task_id,
                raw_log=f"[stub] Hacktron would scan {task_id} for exploitable patterns.",
            )
        )
    return logs

#mentor report from claude - to be replaced with real report from claude
def build_stub_mentor_report(missed_task_ids: List[str]) -> MentorReportSchema:
    if not missed_task_ids:
        summary = "Clean sweep. No missed vulnerabilities detected in this run."
    else:
        summary = (
            "You missed at least one vulnerable system. Review input handling, "
            "use parameterized queries, and validate outbound requests."
        )
    return MentorReportSchema(summary=summary)
