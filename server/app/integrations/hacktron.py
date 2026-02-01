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

    use_wsl = command.lower() == "wsl"

    for task_id, code in tasks:
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / f"{task_id}{extension}"
            file_path.write_text(code, encoding="utf-8")

            target_path = _to_wsl_path(file_path) if use_wsl else str(file_path)
            cmd = [command] + _expand_args(args, target_path)
            output = _run_command(cmd)
            results.append((task_id, output))
            
    return results


def _expand_args(args: List[str], file_path: str) -> List[str]:
    if not args:
        return [file_path]
    if any("{file}" in arg for arg in args):
        return [arg.replace("{file}", file_path) for arg in args]
    return args + [file_path]


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


def _to_wsl_path(path: Path) -> str:
    cmd = ["wsl", "wslpath", "-a", str(path)]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False, timeout=10)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Failed to convert Windows path for WSL (timeout).") from exc
    except FileNotFoundError as exc:
        raise RuntimeError("WSL not found. Ensure WSL is installed and available.") from exc

    if result.returncode != 0:
        error_msg = result.stderr.strip() or "WSL path conversion failed."
        raise RuntimeError(error_msg)

    return result.stdout.strip()
