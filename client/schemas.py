from pydantic import BaseModel, Field 
from typing import List, Optional, Literal
from datetime import datetime

VulnType = Literal["SQLi", "XSS", "RCE", "LFI", "RFI", "Open Redirect", "IDOR", "SSRF", "Path Traversal"]
Difflevel = Literal["Low", "Medium", "High"]

class TaskSchema(BaseModel):
    id: str
    code: str
    is_vulnerable: bool
    vulnerability = VulnType
    difficulty: Difflevel

# Model for creating a new session request
class SessionCreateRequest(BaseModel):
    difficulty: Difflevel
    task_count: int = Field(ge=0, le=10)

# Model for session creation response
class SessionCreateResponse(BaseModel):
    session_id: str
    created_at: datetime 

# Model for listing tasks in a session
class TaskListResponse(BaseModel):
    session_id:  str
    tasks: List[TaskSchema]

# Model for submitting answers
class AnswerSchema(BaseModel):
    task_id: str
    user_choice: Literal["clean", "sabotage"]

# Model for submitting answers request
class SubmitAnswersRequest(BaseModel):
    answers: List[AnswerSchema]

# Model for submitting answers response
class SubmitAnswersResponse(BaseModel):
    correct_answers: int
    incorrect_answers: int

# Model for session result response
class AuditLogSchema(BaseModel):
    task_id: str
    raw_log: str
    findings: Optional[List[str]] = None

# Model for mentor report
class Report(BaseModel):
    summary: str

# Model for finishing session response
class FinishResponse(BaseModel):
    session_id: str
    score: int
    missed_task_ids: List[str]
    audit_logs: List[AuditLogSchema]
    mentor_report: Report

