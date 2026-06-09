"""Shared validation for committed review sidecars.

The hyphenated validate-sidecar.py CLI is not importable, so the pure
validation contract lives here and both CLIs call it.
"""

from __future__ import annotations

import datetime
import re
from typing import Any

import _lib

REQUIRED_HEADINGS = (
    "Verdict",
    "Pre-merge fixups",
    "Expected merge conflicts",
    "Follow-up items (defer, do not block merge)",
)
BLOCK_ONLY_HEADING = "Open questions for founder"
PRODUCER = "review-pending-orchestrator"


def _coerce_reviewed_at(value: datetime.datetime) -> str:
    if value.tzinfo is not None:
        value = value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def _headings(body: str) -> set[str]:
    return set(re.findall(r"^##\s+(.+?)\s*$", body, flags=re.MULTILINE))


def validate(fm: dict[str, Any], body: str) -> str | None:
    """Return an error string for invalid sidecars, otherwise None."""
    normalized = dict(fm)
    if isinstance(normalized.get("reviewed_at"), datetime.datetime):
        normalized["reviewed_at"] = _coerce_reviewed_at(normalized["reviewed_at"])

    try:
        _lib.jsonschema.validate(
            instance=normalized,
            schema=_lib.load_schema("review-sidecar"),
            format_checker=_lib.jsonschema.FormatChecker(),
        )
    except _lib.jsonschema.ValidationError as exc:
        field = ".".join(str(p) for p in exc.absolute_path) or "<root>"
        if exc.validator == "required":
            missing = exc.message.split("'")[1] if "'" in exc.message else exc.message
            return f"missing required field '{missing}'"
        return f"schema violation at {field}: {exc.message}"

    present = _headings(body)
    for heading in REQUIRED_HEADINGS:
        if heading not in present:
            return f"missing required heading '## {heading}'"
    if normalized.get("verdict") == "block" and BLOCK_ONLY_HEADING not in present:
        return f"missing required heading '## {BLOCK_ONLY_HEADING}' for verdict block"
    return None
