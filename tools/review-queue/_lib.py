"""Shared helpers for the review-queue scripts.

Kept intentionally small: frontmatter parse + atomic os.link write + schema
validation. Used by request.py, combine.py, and the validator entry point.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import uuid
from pathlib import Path
from typing import Any

try:
    import jsonschema
    import yaml
except ImportError:
    import sys as _sys

    if _sys.platform == "darwin" and os.environ.get("ECHO_RQ_ARCH_RETRIED") != "1":
        os.environ["ECHO_RQ_ARCH_RETRIED"] = "1"
        os.execvp("arch", ["arch", "-arm64", _sys.executable, *_sys.argv])
    raise

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
REVIEWS_DIR = REPO_ROOT / "backlog" / "reviews"
ERROR_LOG = REPO_ROOT / "raw" / "internal" / "queue-errors.md"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def parse_frontmatter(path: Path) -> tuple[dict[str, Any], str]:
    text = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        raise ValueError(f"{path}: no frontmatter block found")
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        problem = getattr(exc, "problem", None) or str(exc)
        if mark is not None:
            loc = f"line {mark.line + 1} column {mark.column + 1}"
        else:
            loc = "unknown location"
        raise ValueError(
            f"{path}: malformed YAML at {loc}: {problem}. "
            f"Regenerate response with valid YAML; do not hand-edit committed reviewer files."
        ) from exc
    if not isinstance(fm, dict):
        raise ValueError(f"{path}: frontmatter is not a mapping")
    return fm, m.group(2)


def serialize_frontmatter(fm: dict[str, Any], body: str) -> str:
    head = yaml.safe_dump(fm, sort_keys=False, default_flow_style=False).rstrip() + "\n"
    return f"---\n{head}---\n{body}"


def load_schema(name: str) -> dict[str, Any]:
    """name ∈ {request, reviewer, combined}."""
    path = SCHEMA_DIR / f"{name}.schema.json"
    return json.loads(path.read_text(encoding="utf-8"))


def validate_frontmatter(fm: dict[str, Any], schema_name: str) -> None:
    """Raises jsonschema.ValidationError on schema violation."""
    jsonschema.validate(instance=fm, schema=load_schema(schema_name))


def atomic_link_write(final: Path, content: str) -> str:
    """Write content to a unique temp file, then os.link it into place.

    Returns one of:
      "ok"          — file written successfully (we won the race).
      "race_lost"   — final already exists at our temp-write time; our temp is cleaned up.

    Callers handle "race_lost" by reading the existing file or skipping.
    """
    final.parent.mkdir(parents=True, exist_ok=True)
    tmp = final.with_name(f"{final.name}.{uuid.uuid4().hex}.tmp")
    tmp.write_text(content, encoding="utf-8")
    try:
        os.link(tmp, final)
        tmp.unlink()
        return "ok"
    except FileExistsError:
        tmp.unlink()
        return "race_lost"


def head_sha(repo_root: Path | None = None) -> str:
    root = repo_root or REPO_ROOT
    out = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return out.stdout.strip()


def iso_utc_now() -> str:
    import datetime as _dt

    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def append_error(context: str, detail: str = "") -> None:
    """Append a one-line entry to raw/internal/queue-errors.md."""
    ERROR_LOG.parent.mkdir(parents=True, exist_ok=True)
    line = f"{iso_utc_now()} {context}"
    if detail:
        line += f": {detail}"
    line += "\n"
    with ERROR_LOG.open("a", encoding="utf-8") as fh:
        fh.write(line)
