import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    DIFFICULTY_CONFIGS,
    AuditRequest,
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


# Endpoint to create a new session
@app.post("/session", response_model=SessionCreateResponse)
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
        raise HTTPException(status_code=503, detail=str(exc)) from exc

# Endpoint to list tasks in a session
@app.get("/session/{session_id}/tasks", response_model=TaskListResponse)
def list_tasks(session_id: str) -> TaskListResponse:
    try:
        tasks = store.list_public_tasks(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return TaskListResponse(session_id=session_id, tasks=tasks)


# Endpoint to submit answers for a session
@app.post("/session/{session_id}/submit", response_model=SubmitAnswersResponse)
def submit_answers(session_id: str, payload: SubmitAnswersRequest) -> SubmitAnswersResponse:
    try:
        return store.submit_answers(session_id, payload.answers)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

# Endpoint to finish a session and get results
@app.post("/session/{session_id}/finish", response_model=FinishResponse)
def finish_session(session_id: str) -> FinishResponse:
    try:
        return store.finish_session(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

# Endpoint to get results of a session
@app.get("/session/{session_id}/results", response_model=FinishResponse)
def get_results(session_id: str) -> FinishResponse:
    try:
        return store.finish_session(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/generate", response_model=GenerateSnippetsResponse)
def generate_snippets(payload: GenerateSnippetsRequest) -> GenerateSnippetsResponse:
    try:
        difficulty_key = payload.difficulty.lower()
        if difficulty_key not in DIFFICULTY_CONFIGS:
            raise HTTPException(status_code=400, detail="Unknown difficulty.")
        tasks = generate_frontend_tasks(
            language=payload.language,
            difficulty=payload.difficulty,
            complexity_level=payload.complexityLevel,
            count=payload.count,
            vuln_density=DIFFICULTY_CONFIGS[difficulty_key].vuln_density,
        )
        return GenerateSnippetsResponse(tasks=tasks)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/audit", response_model=AuditResponse)
def audit_tasks(payload: AuditRequest) -> AuditResponse:
    if not payload.tasks:
        raise HTTPException(status_code=400, detail="No tasks provided for audit.")

    tasks = payload.tasks
    task_payload = [(task.id, task.code) for task in tasks]
    hacktron_logs: list[str] = []
    try:
        hacktron_output = scan_with_hacktron(task_payload, payload.language)
        hacktron_logs = [log for _, log in hacktron_output]
    except Exception as exc:
        hacktron_logs = [str(exc)]

    findings = build_findings(tasks)
    try:
        summary = generate_security_mentor_summary(
            hacktron_logs,
            [f"{task.systemName}: {task.vulnerabilityType}" for task in tasks if task.isVulnerable],
        )
    except Exception:
        summary = summarize_findings(findings)

    return AuditResponse(report={"findings": findings, "summary": summary})


@app.post("/tts", response_model=TTSResponse)
def tts(payload: TTSRequest) -> TTSResponse:
    raise HTTPException(status_code=501, detail="TTS integration is not configured.")
