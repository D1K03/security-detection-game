from __future__ import annotations

import json
import os
import re
from itertools import cycle
from typing import List, Optional
from uuid import uuid4

import httpx
from pydantic import BaseModel, ValidationError

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
                status="pending",
            )
        )

    return tasks


def generate_security_mentor_summary(
    hacktron_logs: List[str],
    failed_task_summaries: List[str],
) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured.")

    model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620")
    version = os.getenv("ANTHROPIC_VERSION", "2023-06-01")

    system_prompt = (
        "You are the Security Mentor. Provide a 3-sentence post-mortem summary. "
        "Sentence 1: what went wrong. Sentence 2: how an attacker could exploit. "
        "Sentence 3: the most direct fix. Be concise and technical."
    )

    user_prompt = {
        "failed_tasks": failed_task_summaries,
        "hacktron_logs": hacktron_logs,
    }

    response = _call_claude(
        api_key=api_key,
        model=model,
        version=version,
        system_prompt=system_prompt,
        user_prompt=json.dumps(user_prompt),
        max_tokens=220,
    )

    return response.strip()


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
        "ELECTRICAL, MEDBAY, SECURITY, WEAPONS, ADMIN), and vulnerabilityLine (number). "
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

    with httpx.Client(timeout=30) as client:
        response = client.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

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

    try:
        return ClaudeTaskPayload.model_validate(raw)
    except ValidationError as exc:
        raise ValueError(f"Claude JSON validation failed: {exc}") from exc


def _validate_tasks_payload(
    payload: ClaudeTaskPayload,
    count: int,
    vuln_density: float,
) -> ClaudeTaskPayload:
    if len(payload.tasks) != count:
        raise ValueError(f"Claude returned {len(payload.tasks)} tasks, expected {count}.")

    vulnerable_target = max(1, round(count * vuln_density))
    vulnerable_count = sum(1 for task in payload.tasks if task.isVulnerable)
    if vulnerable_count != vulnerable_target:
        raise ValueError(
            "Claude returned an unexpected vulnerable count: "
            f"{vulnerable_count} (expected {vulnerable_target})."
        )

    return payload


def _normalize_vuln_type(is_vulnerable: bool, vuln_type: FrontendVulnType) -> FrontendVulnType:
    if not is_vulnerable:
        return "SAFE"
    if vuln_type == "SAFE":
        return "XSS"
    return vuln_type


def _extract_json(text: str) -> str:
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if not match:
        raise ValueError("Claude response did not contain JSON.")
    return match.group(1)
