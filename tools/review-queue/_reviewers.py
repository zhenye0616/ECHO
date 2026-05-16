"""_reviewers.py — load + validate reviewers.json. Single import point.

Spec: 2026-05-13-043-per-round-reviewer-roster AC2 (initial five-field shape).
Extended by 2026-05-15-056 AC5 part 1 with `invoke_command` — conditionally
required for mode:headless, MAY be omitted for mode:ide. Loaded by
request.py, combine.py, _run_reviewer.sh (via _reviewer_gate.py), and
(transitively) by the reviewer prompts via the shared helpers. The cache is
process-local; tests that need to swap in a different config pass
`config_path` explicitly to bypass the cache.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

# REVIEWERS_CONFIG is resolved lazily inside load_reviewers() so that tests
# which set ECHO_REVIEWERS_CONFIG after _lib import still pick it up. Avoid
# capturing the path at module-import time.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402

_SLUG_RE = re.compile(r"^[a-z][a-z0-9-]*$")
_VALID_MODES = ("headless", "ide")
# Always-required fields. `invoke_command` is conditionally required for
# mode=headless entries (056 AC5 part 1) and is checked separately below so
# the Reviewer(**r) construction can accept its absence on mode=ide rows.
_REQUIRED_FIELDS = ("name", "mode", "required", "timeout_hours", "slash_command")
_OPTIONAL_FIELDS = ("invoke_command",)
_ALL_KNOWN_FIELDS = _REQUIRED_FIELDS + _OPTIONAL_FIELDS


class Reviewer(NamedTuple):
    name: str
    mode: str  # "headless" | "ide"
    required: bool
    timeout_hours: float | None
    slash_command: str
    invoke_command: str | None = None


_CACHED: tuple[Reviewer, ...] | None = None


def load_reviewers(config_path: Path | None = None) -> tuple[Reviewer, ...]:
    """Read + validate reviewers.json.

    config_path: explicit path override. When None, reads `_lib.REVIEWERS_CONFIG`
    (which honors `ECHO_REVIEWERS_CONFIG` env var). Cached only when config_path
    is None — explicit-path calls bypass the cache and do not populate it.
    """
    global _CACHED
    if _CACHED is not None and config_path is None:
        return _CACHED
    path = config_path or _lib.REVIEWERS_CONFIG
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"reviewers.json: invalid JSON: {e}") from e
    if "reviewers" not in raw or not isinstance(raw["reviewers"], list):
        raise ValueError("reviewers.json: top-level 'reviewers' array is required")

    reviewers: list[Reviewer] = []
    for i, r in enumerate(raw["reviewers"]):
        if not isinstance(r, dict):
            raise ValueError(f"reviewers.json[{i}]: entry must be an object")
        try:
            rev = Reviewer(**r)
        except TypeError as e:
            missing = set(_REQUIRED_FIELDS) - set(r.keys())
            extra = set(r.keys()) - set(_ALL_KNOWN_FIELDS)
            msg = f"reviewers.json[{i}] (name={r.get('name', '<unknown>')!r}): {e}"
            if missing:
                msg += f"; missing required fields: {sorted(missing)}"
            if extra:
                msg += f"; unknown fields: {sorted(extra)}"
            raise ValueError(msg) from e
        reviewers.append(rev)

    seen: set[str] = set()
    for r in reviewers:
        if not _SLUG_RE.match(r.name):
            raise ValueError(
                f"reviewers.json: invalid slug {r.name!r} — must match {_SLUG_RE.pattern}"
            )
        if r.name in seen:
            raise ValueError(f"reviewers.json: duplicate slug {r.name!r}")
        seen.add(r.name)
        if r.mode not in _VALID_MODES:
            raise ValueError(
                f"reviewers.json: invalid mode {r.mode!r} for {r.name!r} — must be one of {_VALID_MODES}"
            )
        if not isinstance(r.required, bool):
            raise ValueError(
                f"reviewers.json: {r.name!r} 'required' must be a bool, got {type(r.required).__name__}"
            )
        # mode↔timeout_hours contract (043 R1 HIGH #1).
        if r.mode == "headless" and r.timeout_hours is not None:
            raise ValueError(
                f"reviewers.json: {r.name!r} has mode=headless but timeout_hours={r.timeout_hours!r}; "
                f"headless reviewers must have timeout_hours=null"
            )
        if r.mode == "ide":
            if r.timeout_hours is None:
                raise ValueError(
                    f"reviewers.json: {r.name!r} has mode=ide but timeout_hours=null; "
                    f"ide reviewers must have a positive numeric timeout_hours"
                )
            if isinstance(r.timeout_hours, bool) or not isinstance(r.timeout_hours, (int, float)) or r.timeout_hours <= 0:
                raise ValueError(
                    f"reviewers.json: {r.name!r} has invalid timeout_hours {r.timeout_hours!r}; "
                    f"must be a positive number"
                )
        # mode↔invoke_command contract (056 AC5 part 1). Headless reviewers
        # MUST carry a non-empty string containing the {{PROMPT}} token; the
        # {{WT}} token is RECOMMENDED but not required (some CLIs like
        # `claude -p` operate relative to cwd and have no -C analog — the
        # wrapper already `cd`'s to $WT before substitution).
        if r.mode == "headless":
            if r.invoke_command is None:
                raise ValueError(
                    f"reviewers.json: {r.name!r} has mode=headless but no invoke_command; "
                    f"headless reviewers must declare an invoke_command template"
                )
            if not isinstance(r.invoke_command, str) or not r.invoke_command.strip():
                raise ValueError(
                    f"reviewers.json: {r.name!r} has invalid invoke_command {r.invoke_command!r}; "
                    f"must be a non-empty string"
                )
            if "{{PROMPT}}" not in r.invoke_command:
                raise ValueError(
                    f"reviewers.json: {r.name!r} invoke_command must contain the "
                    f"'{{{{PROMPT}}}}' token (got: {r.invoke_command!r})"
                )

    reviewers_tuple = tuple(reviewers)
    if config_path is None:
        _CACHED = reviewers_tuple
    return reviewers_tuple


def reset_cache() -> None:
    """Test hook: clear the module-level cache."""
    global _CACHED
    _CACHED = None
