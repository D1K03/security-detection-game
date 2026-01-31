from fastapi import FastAPI, HTTPException

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

app = FastAPI(title="Security Sabotage API")
store = InMemoryStore()

# Endpoint to create a new session
@app.post("/session", response_model=SessionCreateResponse)
def create_session(payload: SessionCreateRequest) -> SessionCreateResponse:
    session = store.create_session(payload.difficulty, payload.task_count)
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
