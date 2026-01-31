from __future__ import annotations

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
    MentorReportSchema,
    SubmitAnswersResponse,
    TaskPublicSchema,
    TaskSchema,
)


SYSTEM_NAMES = [
    "Navigation",
    "O2",
    "Reactor",
    "Shields",
    "Comms",
    "Weapons",
]


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
        created_at = datetime.utcnow()
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
                code=task.code,
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

#this is going to be replaced with a call to claude to generate tasks based on difficulty and count
def generate_tasks(difficulty: Difficulty, task_count: int) -> List[TaskSchema]:
    config = DIFFICULTY_CONFIGS[difficulty]
    vulnerable_count = max(1, round(task_count * config.vuln_density))
    tasks: List[TaskSchema] = []

    for index in range(task_count):
        is_vulnerable = index < vulnerable_count
        vulnerability_type = "none"
        code = "const input = req.query.q;\nres.send(`<p>${input}</p>`);"
        if is_vulnerable:
            vulnerability_type = ["xss", "sqli", "ssrf", "rce"][index % 4]

        tasks.append(
            TaskSchema(
                id=f"task-{index + 1}",
                system_name=SYSTEM_NAMES[index % len(SYSTEM_NAMES)],
                code=code,
                is_vulnerable=is_vulnerable,
                vulnerability_type=vulnerability_type,
                difficulty=difficulty,
            )
        )

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
