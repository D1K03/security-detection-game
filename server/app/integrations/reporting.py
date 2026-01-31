from __future__ import annotations

from typing import Dict, List

from ..schemas import AuditFinding, FrontendTask, FrontendVulnType


VULNERABILITY_METADATA: Dict[FrontendVulnType, Dict[str, str]] = {
    "XSS": {
        "severity": "HIGH",
        "description": "User input is rendered without proper escaping.",
        "remediation": "Use proper output encoding. Prefer textContent over innerHTML.",
    },
    "SQL_INJECTION": {
        "severity": "CRITICAL",
        "description": "User input is concatenated directly into SQL.",
        "remediation": "Use parameterized queries or prepared statements.",
    },
    "RCE": {
        "severity": "CRITICAL",
        "description": "User input reaches command execution without validation.",
        "remediation": "Avoid shell execution with user input. Use allowlists and safe APIs.",
    },
    "SSRF": {
        "severity": "HIGH",
        "description": "User input drives outbound requests without allowlisting.",
        "remediation": "Validate URLs and use an allowlist of trusted domains.",
    },
    "PATH_TRAVERSAL": {
        "severity": "HIGH",
        "description": "User input builds file paths without sanitization.",
        "remediation": "Sanitize file paths and restrict to allowed directories.",
    },
    "COMMAND_INJECTION": {
        "severity": "CRITICAL",
        "description": "User input is concatenated into shell commands.",
        "remediation": "Avoid shell execution. Use parameterized command APIs.",
    },
    "INSECURE_DESERIALIZATION": {
        "severity": "HIGH",
        "description": "Untrusted data is deserialized without validation.",
        "remediation": "Avoid deserializing untrusted data; use safe formats like JSON.",
    },
    "SAFE": {
        "severity": "LOW",
        "description": "Code follows secure patterns.",
        "remediation": "No remediation needed.",
    },
}


def build_findings(tasks: List[FrontendTask]) -> List[AuditFinding]:
    findings: List[AuditFinding] = []
    for task in tasks:
        if not task.isVulnerable:
            continue

        vulnerability = task.vulnerabilityType
        metadata = VULNERABILITY_METADATA.get(vulnerability, VULNERABILITY_METADATA["SAFE"])

        findings.append(
            AuditFinding(
                taskId=task.id,
                systemName=task.systemName,
                vulnerability=vulnerability,
                severity=metadata["severity"],
                description=metadata["description"],
                codeLocation={"line": task.vulnerabilityLine or 1, "column": 1},
                remediation=metadata["remediation"],
                codeSnippet=task.code,
            )
        )
    return findings


def summarize_findings(findings: List[AuditFinding]) -> str:
    if not findings:
        return "Security scan complete. No vulnerabilities detected."

    total = len(findings)
    critical = sum(1 for f in findings if f.severity == "CRITICAL")
    high = sum(1 for f in findings if f.severity == "HIGH")

    parts = [f"Security scan detected {total} vulnerabilit{'y' if total == 1 else 'ies'}."]

    if critical:
        parts.append(f"{critical} CRITICAL issue{'s' if critical != 1 else ''} require immediate attention.")
    if high:
        parts.append(f"{high} HIGH severity issue{'s' if high != 1 else ''} should be addressed promptly.")

    parts.append("Review the findings for remediation guidance.")
    return " ".join(parts)
