from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    DIFFICULTY_CONFIGS,
    FinishResponse,
    SessionCreateRequest,
    SessionCreateResponse,
    SubmitAnswersRequest,
    SubmitAnswersResponse,
    TaskListResponse,
)
from .store import InMemoryStore

app = FastAPI(
    title="Security Sabotage API",
    description="Backend API for the Security Detection Game",
    version="1.0.0",
)

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = InMemoryStore()


# Root endpoint - API info
@app.get("/")
def root():
    """Root endpoint returning API information."""
    return {
        "name": "Security Sabotage API",
        "version": "1.0.0",
        "description": "Backend API for the Security Detection Game",
        "endpoints": {
            "root": "/",
            "health": "/health",
            "create_session": "POST /session",
            "list_tasks": "GET /session/{session_id}/tasks",
            "submit_answers": "POST /session/{session_id}/submit",
            "finish_session": "POST /session/{session_id}/finish",
            "get_results": "GET /session/{session_id}/results",
        },
    }


# Health check endpoint
@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "security-sabotage-api"}

# Endpoint to create a new session
@app.post("/session", response_model=SessionCreateResponse)
def create_session(payload: SessionCreateRequest) -> SessionCreateResponse:
    session = store.create_session(payload.difficulty, payload.task_count, payload.language)
    return SessionCreateResponse(
        session_id=session.session_id,
        created_at=session.created_at,
        difficulty=session.difficulty,
        config=DIFFICULTY_CONFIGS[session.difficulty],
    )

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
