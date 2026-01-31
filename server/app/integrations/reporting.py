from __future__ import annotations

from typing import Dict, List

from ..schemas import AuditFinding, FrontendTask, FrontendVulnType


REMEDIATIONS: Dict[FrontendVulnType, str] = {
    "XSS": "Use proper output encoding. Prefer textContent over innerHTML.",
    "SQL_INJECTION": "Use parameterized queries or prepared statements.",
    "RCE": "Avoid shell execution with user input. Use allowlists and safe APIs.",
    "SSRF": "Validate URLs and use an allowlist of trusted domains.",
    "PATH_TRAVERSAL": "Sanitize file paths and restrict to allowed directories.",
    "COMMAND_INJECTION": "Avoid shell execution. Use parameterized command APIs.",
    "INSECURE_DESERIALIZATION": "Avoid deserializing untrusted data; use safe formats like JSON.",
    "SAFE": "No remediation needed.",
}

SEVERITY_MAP: Dict[FrontendVulnType, str] = {
    "XSS": "HIGH",
    "SQL_INJECTION": "CRITICAL",
    "RCE": "CRITICAL",
    "SSRF": "HIGH",
    "PATH_TRAVERSAL": "HIGH",
    "COMMAND_INJECTION": "CRITICAL",
    "INSECURE_DESERIALIZATION": "HIGH",
    "SAFE": "LOW",
}

DESCRIPTIONS: Dict[FrontendVulnType, str] = {
    "XSS": "User input is rendered without proper escaping.",
    "SQL_INJECTION": "User input is concatenated directly into SQL.",
    "RCE": "User input reaches command execution without validation.",
    "SSRF": "User input drives outbound requests without allowlisting.",
    "PATH_TRAVERSAL": "User input builds file paths without sanitization.",
    "COMMAND_INJECTION": "User input is concatenated into shell commands.",
    "INSECURE_DESERIALIZATION": "Untrusted data is deserialized without validation.",
    "SAFE": "Code follows secure patterns.",
}


def build_findings(tasks: List[FrontendTask]) -> List[AuditFinding]:
    findings: List[AuditFinding] = []
    for task in tasks:
        if not task.isVulnerable:
            continue
        vulnerability = task.vulnerabilityType
        findings.append(
            AuditFinding(
                taskId=task.id,
                systemName=task.systemName,
                vulnerability=vulnerability,
                severity=SEVERITY_MAP[vulnerability],
                description=DESCRIPTIONS[vulnerability],
                codeLocation={"line": task.vulnerabilityLine or 1, "column": 1},
                remediation=REMEDIATIONS[vulnerability],
                codeSnippet=task.code,
            )
        )
    return findings


def summarize_findings(findings: List[AuditFinding]) -> str:
    if not findings:
        return "Security scan complete. No vulnerabilities detected."

    critical = sum(1 for f in findings if f.severity == "CRITICAL")
    high = sum(1 for f in findings if f.severity == "HIGH")
    total = len(findings)
    summary = f"Security scan detected {total} vulnerability{'ies' if total != 1 else ''}. "
    if critical:
        summary += f"{critical} CRITICAL issue{'s' if critical != 1 else ''} require immediate attention. "
    if high:
        summary += f"{high} HIGH severity issue{'s' if high != 1 else ''} should be addressed promptly. "
    summary += "Review the findings for remediation guidance."
    return summary
