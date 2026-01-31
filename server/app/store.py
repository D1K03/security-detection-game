from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from .schemas import (
    DIFFICULTY_CONFIGS,
    AnswerSchema,
    AuditLogSchema,
    Difficulty,
    FrontendDifficulty,
    FrontendTask,
    FinishResponse,
    MentorReportSchema,
    SubmitAnswersResponse,
    TaskPublicSchema,
    TaskSchema,
)
from .integrations.claude_client import generate_frontend_tasks, generate_security_mentor_summary
from .integrations.hacktron import scan_with_hacktron



@dataclass
class SessionData:
    session_id: str
    difficulty: Difficulty
    created_at: datetime
    tasks: List[TaskSchema]
    answers: Dict[str, AnswerSchema] = field(default_factory=dict)
    audit_logs: List[AuditLogSchema] = field(default_factory=list)
    mentor_report: Optional[MentorReportSchema] = None


class InMemoryStore:
    def __init__(self) -> None:
        self.sessions: Dict[str, SessionData] = {}

    # Create a new session with generated tasks
    def create_session(self, difficulty: Difficulty, task_count: int) -> SessionData:
        session_id = uuid4().hex
        created_at = datetime.now(timezone.utc)
        tasks = generate_tasks(difficulty, task_count)
        session = SessionData(
            session_id=session_id,
            difficulty=difficulty,
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
                difficulty=task.difficulty,
                language=task.language,
            )
            for task in session.tasks
        ]

    def submit_answers(self, session_id: str, answers: List[AnswerSchema]) -> SubmitAnswersResponse:
        session = self.get_session(session_id)
        valid_ids = {task.id for task in session.tasks}
        seen = set()

        for answer in answers:
            if answer.task_id not in valid_ids:
                raise ValueError(f"Unknown task id: {answer.task_id}")
            if answer.task_id in seen:
                raise ValueError(f"Duplicate answer for task id: {answer.task_id}")
            seen.add(answer.task_id)
            session.answers[answer.task_id] = answer

        correct, _, missed_task_ids = score_session(session)
        return SubmitAnswersResponse(
            correct=correct,
            incorrect=len(missed_task_ids),
            missed_task_ids=missed_task_ids,
        )

    def finish_session(self, session_id: str) -> FinishResponse:
        session = self.get_session(session_id)
        correct, _, missed_task_ids = score_session(session)

        if not session.audit_logs:
            try:
                session.audit_logs = build_hacktron_audit_logs(session, missed_task_ids)
            except Exception as exc:
                session.audit_logs = [
                    AuditLogSchema(task_id=task_id, raw_log=f"Audit failed: {str(exc)}")
                    for task_id in missed_task_ids
                ]

        if session.mentor_report is None:
            try:
                session.mentor_report = build_mentor_report(session, missed_task_ids)
            except Exception as exc:
                session.mentor_report = build_fallback_mentor_report(missed_task_ids)

        return FinishResponse(
            session_id=session_id,
            score=correct,
            missed_task_ids=missed_task_ids,
            audit_logs=session.audit_logs,
            mentor_report=session.mentor_report,
        )

    def get_session_results(self, session_id: str) -> FinishResponse:
        session = self.get_session(session_id)

        if not session.audit_logs or session.mentor_report is None:
            return self.finish_session(session_id)

        correct, _, missed_task_ids = score_session(session)
        return FinishResponse(
            session_id=session_id,
            score=correct,
            missed_task_ids=missed_task_ids,
            audit_logs=session.audit_logs,
            mentor_report=session.mentor_report,
        )

# Generate tasks based on difficulty and count
def generate_tasks(difficulty: Difficulty, task_count: int, language: str = "javascript") -> List[TaskSchema]:
    config = DIFFICULTY_CONFIGS[difficulty]
    frontend_tasks = generate_frontend_tasks(
        language=language,
        difficulty=_to_frontend_difficulty(difficulty),
        complexity_level=_map_complexity(config.complexity_tag),
        count=task_count,
        vuln_density=config.vuln_density,
    )
    return [_to_task_schema(task, difficulty) for task in frontend_tasks]

def score_session(session: SessionData) -> tuple[int, int, List[str]]:
    correct = 0
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
            missed.append(task.id)

    incorrect = len(missed)
    return correct, incorrect, missed

# Build audit logs using Hacktron for missed tasks
def build_hacktron_audit_logs(session: SessionData, missed_task_ids: List[str]) -> List[AuditLogSchema]:
    if not missed_task_ids:
        return []
    missed_tasks = [task for task in session.tasks if task.id in missed_task_ids]
    task_payload = [(task.id, task.code) for task in missed_tasks]
    logs = scan_with_hacktron(task_payload, missed_tasks[0].language or "javascript")
    return [
        AuditLogSchema(task_id=task_id, raw_log=raw_log)
        for task_id, raw_log in logs
    ]

# Build mentor report using Claude based on audit logs and missed tasks
def build_mentor_report(session: SessionData, missed_task_ids: List[str]) -> MentorReportSchema:
    failed_tasks = [task for task in session.tasks if task.id in missed_task_ids]
    failed_summaries = [
        f"{task.system_name}: {task.vulnerability_type} in {task.language or 'javascript'}"
        for task in failed_tasks
    ]
    hacktron_logs = [log.raw_log for log in session.audit_logs]
    summary = generate_security_mentor_summary(hacktron_logs, failed_summaries)
    return MentorReportSchema(summary=summary)

# Fallback mentor report if Claude integration fails
def build_fallback_mentor_report(missed_task_ids: List[str]) -> MentorReportSchema:
    if not missed_task_ids:
        summary = "Clean sweep. No missed vulnerabilities detected in this run."
    else:
        summary = (
            "You missed at least one vulnerable system. Review input handling, "
            "use parameterized queries, and validate outbound requests."
        )
    return MentorReportSchema(summary=summary)

# Map internal difficulty to frontend difficulty format
def _to_frontend_difficulty(difficulty: Difficulty) -> FrontendDifficulty:
    return difficulty.upper()  # type: ignore[return-value]

# Map complexity tags to frontend complexity levels
def _map_complexity(tag: str) -> str:
    return {"low": "basic", "medium": "intermediate", "high": "advanced"}.get(tag, "basic")

# Convert FrontendTask to TaskSchema
def _to_task_schema(frontend_task: FrontendTask, difficulty: Difficulty) -> TaskSchema:
    return TaskSchema(
        id=frontend_task.id,
        system_name=frontend_task.systemName,
        code=frontend_task.code,
        is_vulnerable=frontend_task.isVulnerable,
        vulnerability_type=_map_vuln_type(frontend_task.vulnerabilityType),
        difficulty=difficulty,
        language=frontend_task.language,
        vulnerability_line=frontend_task.vulnerabilityLine,
    )

# Normalize vulnerability type based on whether the task is vulnerable
def _map_vuln_type(vuln_type: str) -> str:
    return {
        "XSS": "xss",
        "SQL_INJECTION": "sqli",
        "SSRF": "ssrf",
        "RCE": "rce",
        "PATH_TRAVERSAL": "path_traversal",
        "COMMAND_INJECTION": "command_injection",
        "INSECURE_DESERIALIZATION": "insecure_deserialization",
        "SAFE": "none",
    }.get(vuln_type, "none")
