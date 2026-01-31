from __future__ import annotations

import os
import shlex
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable, List, Tuple


EXTENSIONS = {
    "javascript": ".js",
    "python": ".py",
    "java": ".java",
    "go": ".go",
    "php": ".php",
}


def scan_with_hacktron(tasks: Iterable[Tuple[str, str]], language: str) -> List[Tuple[str, str]]:
    command = os.getenv("HACKTRON_CMD")
    if not command:
        raise RuntimeError("HACKTRON_CMD is not configured.")

    args = shlex.split(os.getenv("HACKTRON_ARGS", ""))
    extension = EXTENSIONS.get(language, ".txt")
    results: List[Tuple[str, str]] = []

    for task_id, code in tasks:
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / f"{task_id}{extension}"
            file_path.write_text(code, encoding="utf-8")

            cmd = [command] + _expand_args(args, file_path)
            output = _run_command(cmd)
            results.append((task_id, output))

    return results


def _expand_args(args: List[str], file_path: Path) -> List[str]:
    if not args:
        return [str(file_path)]
    if any("{file}" in arg for arg in args):
        return [arg.replace("{file}", str(file_path)) for arg in args]
    return args + [str(file_path)]


def _run_command(cmd: List[str]) -> str:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False, timeout=30)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"Hacktron command timed out: {' '.join(cmd)}") from exc
    except FileNotFoundError as exc:
        raise RuntimeError(f"Hacktron command not found: {cmd[0]}") from exc

    if result.returncode != 0:
        error_msg = result.stderr.strip() or "Hacktron CLI failed with no error message"
        raise RuntimeError(f"Hacktron failed (exit code {result.returncode}): {error_msg}")

    return (result.stdout or "").strip()
