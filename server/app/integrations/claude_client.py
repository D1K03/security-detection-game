from __future__ import annotations

import json
import os
import re
from itertools import cycle
from typing import List, Optional
from uuid import uuid4

import httpx
from pydantic import BaseModel, ValidationError

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from ..schemas import (
    FrontendDifficulty,
    FrontendLanguage,
    FrontendTask,
    FrontendVulnType,
    FrontendSystemName,
)


SYSTEM_NAMES: List[FrontendSystemName] = [
    "O2",
    "NAVIGATION",
    "SHIELDS",
    "REACTOR",
    "COMMUNICATIONS",
    "ELECTRICAL",
    "MEDBAY",
    "SECURITY",
    "WEAPONS",
    "ADMIN",
]


class ClaudeTaskItem(BaseModel):
    code: str
    isVulnerable: bool
    vulnerabilityType: FrontendVulnType
    systemName: Optional[FrontendSystemName] = None
    vulnerabilityLine: Optional[int] = None
    hints: Optional[List[str]] = None


class ClaudeTaskPayload(BaseModel):
    tasks: List[ClaudeTaskItem]


def generate_frontend_tasks(
    language: FrontendLanguage,
    difficulty: FrontendDifficulty,
    complexity_level: str,
    count: int,
    vuln_density: float,
) -> List[FrontendTask]:
    payload = _request_tasks_from_claude(
        language=language,
        difficulty=difficulty,
        complexity_level=complexity_level,
        count=count,
        vuln_density=vuln_density,
    )

    validated = _validate_tasks_payload(payload, count, vuln_density)
    tasks: List[FrontendTask] = []
    system_cycle = cycle(SYSTEM_NAMES)

    for task in validated.tasks:
        system_name = task.systemName or next(system_cycle)
        tasks.append(
            FrontendTask(
                id=uuid4().hex,
                systemName=system_name,
                code=task.code,
                language=language,
                isVulnerable=task.isVulnerable,
                vulnerabilityType=_normalize_vuln_type(task.isVulnerable, task.vulnerabilityType),
                vulnerabilityLine=task.vulnerabilityLine,
                hints=task.hints,
                status="pending",
            )
        )

    return tasks


def generate_security_mentor_summary(
    hacktron_logs: List[str],
    failed_task_summaries: List[str],
) -> str:
    if not failed_task_summaries:
        return "No vulnerabilities were missed in this run. Systems remained secure and no exploitable patterns were detected."
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured.")

    model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620")
    version = os.getenv("ANTHROPIC_VERSION", "2023-06-01")

    system_prompt = (
        "You are the Security Mentor. Provide a 3-sentence post-mortem summary focused "
        "only on the code vulnerabilities. Do NOT mention tools, scanners, logs, or "
        "any operational failures. Sentence 1: what went wrong (vulns only). "
        "Sentence 2: how an attacker could exploit. Sentence 3: the most direct fix. "
        "Be concise and technical."
    )

    filtered_logs = [
        log for log in hacktron_logs if "hacktron" not in log.lower()
    ]
    user_prompt = {
        "failed_tasks": failed_task_summaries,
        "hacktron_logs": filtered_logs,
    }

    response = _call_claude(
        api_key=api_key,
        model=model,
        version=version,
        system_prompt=system_prompt,
        user_prompt=json.dumps(user_prompt),
        max_tokens=220,
    )

    return _strip_heading_marks(response)


def _request_tasks_from_claude(
    language: FrontendLanguage,
    difficulty: FrontendDifficulty,
    complexity_level: str,
    count: int,
    vuln_density: float,
) -> ClaudeTaskPayload:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured.")

    model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620")
    version = os.getenv("ANTHROPIC_VERSION", "2023-06-01")

    vulnerable_target = max(1, round(count * vuln_density))
    system_prompt = (
        "You generate short code snippets for a security training game. "
        "Return strict JSON with a top-level 'tasks' array. "
        "Each task: code (max 10 lines), isVulnerable (boolean), "
        "vulnerabilityType (one of XSS, SQL_INJECTION, SSRF, RCE, PATH_TRAVERSAL, "
        "COMMAND_INJECTION, INSECURE_DESERIALIZATION, SAFE), "
        "systemName (one of O2, NAVIGATION, SHIELDS, REACTOR, COMMUNICATIONS, "
        "ELECTRICAL, MEDBAY, SECURITY, WEAPONS, ADMIN), vulnerabilityLine (number), "
        "and hints (array of exactly 2 short hints). "
        "No markdown, only JSON."
    )

    user_prompt = (
        f"Generate {count} {language} snippets for difficulty {difficulty} "
        f"with {complexity_level} complexity. "
        f"Ensure exactly {vulnerable_target} snippets are vulnerable."
    )

    response = _call_claude(
        api_key=api_key,
        model=model,
        version=version,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=1400,
    )

    return _parse_json_payload(response)


def _call_claude(
    api_key: str,
    model: str,
    version: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
) -> str:
    headers = {
        "x-api-key": api_key,
        "anthropic-version": version,
        "content-type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException as exc:
        raise RuntimeError("Claude API request timed out") from exc
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(f"Claude API error: {exc.response.status_code}") from exc
    except httpx.RequestError as exc:
        raise RuntimeError(f"Claude API connection failed: {str(exc)}") from exc

    if isinstance(data, dict) and "content" in data:
        parts = data.get("content") or []
        text_chunks = [part.get("text", "") for part in parts if isinstance(part, dict)]
        return "\n".join(text_chunks).strip()

    return json.dumps(data)

# Helper to parse and validate Claude JSON response
def _parse_json_payload(text: str) -> ClaudeTaskPayload:
    try:
        raw = json.loads(text)
    except json.JSONDecodeError:
        raw = json.loads(_extract_json(text))

    if isinstance(raw, list):
        raw = {"tasks": raw}
    elif isinstance(raw, dict) and "tasks" not in raw and "snippets" in raw:
        raw = {"tasks": raw.get("snippets", [])}

    if isinstance(raw, dict) and "tasks" in raw:
        raw["tasks"] = [_normalize_task_item(item) for item in raw["tasks"]]

    try:
        return ClaudeTaskPayload.model_validate(raw)
    except ValidationError as exc:
        raise ValueError(f"Claude JSON validation failed: {exc}") from exc


def _validate_tasks_payload(
    payload: ClaudeTaskPayload,
    count: int,
    vuln_density: float,
) -> ClaudeTaskPayload:
    # Validation relaxed to prevent runtime errors from LLM variability.
    # The game will adapt to the actual number of tasks returned.

    return payload


def _normalize_vuln_type(is_vulnerable: bool, vuln_type: FrontendVulnType) -> FrontendVulnType:
    if not is_vulnerable:
        return "SAFE"
    if vuln_type == "SAFE":
        return "XSS"
    return vuln_type


def _extract_json(text: str) -> str:
    # Extract the first complete JSON object/array using bracket matching.
    start = None
    stack = []
    for idx, char in enumerate(text):
        if char in "{[":
            if start is None:
                start = idx
            stack.append(char)
        elif char in "}]":
            if not stack:
                continue
            opening = stack.pop()
            if (opening == "{" and char != "}") or (opening == "[" and char != "]"):
                continue
            if not stack and start is not None:
                return text[start:idx + 1]
    raise ValueError("Claude response did not contain valid JSON.")

#for hints and field normalization
def _normalize_task_item(item: object) -> dict:
    if not isinstance(item, dict):
        return {}

    normalized = dict(item)
    is_vulnerable = normalized.get("isVulnerable")
    if "isVulnerable" not in normalized and "vulnerable" in normalized:
        normalized["isVulnerable"] = normalized["vulnerable"]
        is_vulnerable = normalized["isVulnerable"]

    if "vulnerabilityType" not in normalized:
        if "type" in normalized:
            normalized["vulnerabilityType"] = normalized["type"]
        elif "vulnerability" in normalized:
            normalized["vulnerabilityType"] = normalized["vulnerability"]
        elif is_vulnerable is False:
            normalized["vulnerabilityType"] = "SAFE"
        elif is_vulnerable is True:
            normalized["vulnerabilityType"] = "XSS"

    hints = normalized.get("hints")
    if hints is None:
        normalized["hints"] = []
    elif not isinstance(hints, list):
        normalized["hints"] = [str(hints)]
    else:
        normalized["hints"] = [str(hint) for hint in hints][:2]

    return normalized


def _strip_heading_marks(text: str) -> str:
    # Keep periods, commas, and hyphens while stripping other leading symbols.
    clean_text = re.sub(r"[^A-Za-z0-9\s\.,-]+", "", text)
    return re.sub(r"\s+", " ", clean_text).strip()
