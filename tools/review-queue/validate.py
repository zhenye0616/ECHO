#!/usr/bin/env python3
"""validate.py — validate a review-queue frontmatter file against its schema.

Usage:
    validate.py <schema-name> <path>

schema-name ∈ {request, reviewer, combined}

Exit 0 on success; exit 1 with a clear error to stderr on schema violation
or missing-required-field. The reported error names the offending field
when the failure is `required` or `enum`.

Reviewer fresh-eyes enforcement (046 AC3):
    For `reviewer` schema validations, the validator additionally rejects:
      - frontmatter with `consumed_task_state: true`, and
      - response bodies that contain three or more of the role-typed
        task-state required-block headings (statistical evidence of
        verbatim quotation from a task-state pointer).
    Either condition prints REVIEWER_FRESH_EYES_VIOLATION to stderr and
    exits 1; commit-reviewer-response.sh quarantines the file per 041 AC4.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import jsonschema

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402


# Role-typed task-state required-block headings. Three-or-more is the
# threshold for the field-aware content detection (codex R2 F2 + codex-ops
# R2 F7). Single or double mentions are permitted (the marker names are
# legitimate critique targets — e.g. a reviewer flagging that an earlier
# round's `## current_thesis` block leaked into the spec body).
_TASK_STATE_HEADING_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"##\s+current_thesis\b"),
    re.compile(r"##\s+locked_decisions\b"),
    re.compile(r"##\s+open_questions\b"),
    re.compile(r"##\s+dont_touch\b"),
    re.compile(r"##\s+canonical_anchors\b"),
    re.compile(r"\bcurrent_round:\b"),
)

_FRESH_EYES_THRESHOLD = 3


def _detect_task_state_quotation(body: str) -> tuple[bool, list[str]]:
    """Return (violation, matched_patterns). Violation fires when at least
    _FRESH_EYES_THRESHOLD distinct patterns match anywhere in the body."""
    matched: list[str] = []
    for pat in _TASK_STATE_HEADING_PATTERNS:
        if pat.search(body):
            matched.append(pat.pattern)
    return len(matched) >= _FRESH_EYES_THRESHOLD, matched


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("usage: validate.py <request|reviewer|combined> <path>", file=sys.stderr)
        return 2
    schema_name, path_str = argv[1], argv[2]
    if schema_name not in ("request", "reviewer", "combined"):
        print(f"unknown schema: {schema_name}", file=sys.stderr)
        return 2
    path = Path(path_str)
    if not path.is_file():
        print(f"file not found: {path}", file=sys.stderr)
        return 1
    try:
        fm, body = _lib.parse_frontmatter(path)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    try:
        _lib.validate_frontmatter(fm, schema_name)
    except jsonschema.ValidationError as exc:
        field = ".".join(str(p) for p in exc.absolute_path) or "<root>"
        if exc.validator == "required":
            missing = exc.message.split("'")[1] if "'" in exc.message else exc.message
            print(f"{path}: missing required field '{missing}'", file=sys.stderr)
        else:
            print(f"{path}: schema violation at {field}: {exc.message}", file=sys.stderr)
        return 1

    if schema_name == "reviewer":
        # Frontmatter signal.
        if fm.get("consumed_task_state") is True:
            print(
                f"{path}: REVIEWER_FRESH_EYES_VIOLATION: consumed_task_state: true "
                f"declares a fresh-eyes-at-SHA breach. Reviewer ticks MUST NOT read "
                f"backlog/task-state/<id>/*.md or task_state_ref from request.md.",
                file=sys.stderr,
            )
            return 1
        # Field-aware content detection — three-or-more required-block
        # headings is statistical evidence of verbatim quotation.
        violation, matched = _detect_task_state_quotation(body)
        if violation:
            print(
                f"{path}: REVIEWER_FRESH_EYES_VIOLATION: body contains "
                f"{len(matched)} task-state required-block heading patterns "
                f"({', '.join(matched)}) — three-or-more is statistical evidence "
                f"of reading a backlog/task-state/<id>/*.md pointer. Fresh-eyes-at-SHA "
                f"invariant breached.",
                file=sys.stderr,
            )
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
