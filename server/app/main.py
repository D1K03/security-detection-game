import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from .schemas import (
    DIFFICULTY_CONFIGS,
    AuditRequest,
    AuditReport,
    AuditResponse,
    FinishResponse,
    GenerateSnippetsRequest,
    GenerateSnippetsResponse,
    SessionCreateRequest,
    SessionCreateResponse,
    SubmitAnswersRequest,
    SubmitAnswersResponse,
    TaskListResponse,
    TTSRequest,
    TTSResponse,
)
from .store import InMemoryStore
from .integrations.claude_client import generate_frontend_tasks, generate_security_mentor_summary
from .integrations.hacktron import scan_with_hacktron
from .integrations.reporting import build_findings, summarize_findings

app = FastAPI(title="Security Sabotage API")
store = InMemoryStore()

CLIENT_INDEX_PATH = Path(__file__).resolve().parents[2] / "client" / "index.html"

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
def landing_page() -> HTMLResponse:
    if CLIENT_INDEX_PATH.exists():
        return HTMLResponse(CLIENT_INDEX_PATH.read_text(encoding="utf-8"))
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client landing page not found.")


@app.post("/session", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreateRequest) -> SessionCreateResponse:
    try:
        session = store.create_session(payload.difficulty, payload.task_count)
        return SessionCreateResponse(
            session_id=session.session_id,
            created_at=session.created_at,
            difficulty=session.difficulty,
            config=DIFFICULTY_CONFIGS[session.difficulty],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to create session: {str(exc)}"
        ) from exc


@app.get("/session/{session_id}/tasks", response_model=TaskListResponse)
def list_tasks(session_id: str) -> TaskListResponse:
    try:
        tasks = store.list_public_tasks(session_id)
        return TaskListResponse(session_id=session_id, tasks=tasks)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}"
        ) from exc


@app.post("/session/{session_id}/submit", response_model=SubmitAnswersResponse)
def submit_answers(session_id: str, payload: SubmitAnswersRequest) -> SubmitAnswersResponse:
    try:
        return store.submit_answers(session_id, payload.answers)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}"
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        ) from exc


@app.post("/session/{session_id}/finish", response_model=FinishResponse)
def finish_session(session_id: str) -> FinishResponse:
    try:
        return store.finish_session(session_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}"
        ) from exc


@app.get("/session/{session_id}/results", response_model=FinishResponse)
def get_results(session_id: str) -> FinishResponse:
    try:
        return store.get_session_results(session_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}"
        ) from exc


@app.post("/generate", response_model=GenerateSnippetsResponse)
def generate_snippets(payload: GenerateSnippetsRequest) -> GenerateSnippetsResponse:
    difficulty_key = payload.difficulty.lower()
    if difficulty_key not in DIFFICULTY_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid difficulty: {payload.difficulty}. Must be EASY, MEDIUM, or HARD."
        )

    try:
        tasks = generate_frontend_tasks(
            language=payload.language,
            difficulty=payload.difficulty,
            complexity_level=payload.complexityLevel,
            count=payload.count,
            vuln_density=DIFFICULTY_CONFIGS[difficulty_key].vuln_density,
        )
        return GenerateSnippetsResponse(tasks=tasks)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate snippets: {str(exc)}"
        ) from exc


@app.post("/audit", response_model=AuditResponse)
def audit_tasks(payload: AuditRequest) -> AuditResponse:
    if not payload.tasks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tasks provided for audit."
        )

    task_payload = [(task.id, task.code) for task in payload.tasks]
    hacktron_logs: list[str] = []

    try:
        hacktron_output = scan_with_hacktron(task_payload, payload.language)
        hacktron_logs = [log for _, log in hacktron_output]
    except Exception as exc:
        hacktron_logs = [f"Hacktron scan failed: {str(exc)}"]

    findings = build_findings(payload.tasks)

    try:
        summary = generate_security_mentor_summary(
            hacktron_logs,
            [f"{task.systemName}: {task.vulnerabilityType}" for task in payload.tasks if task.isVulnerable],
        )
    except Exception:
        summary = summarize_findings(findings)

    report = AuditReport(findings=findings, summary=summary)
    return AuditResponse(report=report)


@app.post("/tts", response_model=TTSResponse)
def tts(payload: TTSRequest) -> TTSResponse:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="TTS integration is not configured."
    )
