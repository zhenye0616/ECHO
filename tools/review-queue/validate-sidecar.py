#!/usr/bin/env python3
"""Validate committed /review-pending sidecar artifacts.

Usage:
    validate-sidecar.py <path>

Validates frontmatter against schemas/review-sidecar.schema.json and checks
the committed sidecar body headings that merge-and-cleanup consumes.
"""

from __future__ import annotations

import datetime
import json
import re
import sys
from pathlib import Path
from typing import Any

import jsonschema

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402

REQUIRED_HEADINGS = (
    "Verdict",
    "Pre-merge fixups",
    "Expected merge conflicts",
    "Follow-up items (defer, do not block merge)",
)
BLOCK_ONLY_HEADING = "Open questions for founder"


def _coerce_reviewed_at(value: datetime.datetime) -> str:
    if value.tzinfo is not None:
        value = value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def _load_schema() -> dict[str, Any]:
    path = Path(__file__).resolve().parent / "schemas" / "review-sidecar.schema.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _headings(body: str) -> set[str]:
    return set(re.findall(r"^##\s+(.+?)\s*$", body, flags=re.MULTILINE))


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: validate-sidecar.py <path>", file=sys.stderr)
        return 2
    path = Path(argv[1])
    if not path.is_file():
        print(f"file not found: {path}", file=sys.stderr)
        return 1
    try:
        fm, body = _lib.parse_frontmatter(path)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if isinstance(fm.get("reviewed_at"), datetime.datetime):
        fm["reviewed_at"] = _coerce_reviewed_at(fm["reviewed_at"])

    try:
        jsonschema.validate(
            instance=fm,
            schema=_load_schema(),
            format_checker=jsonschema.FormatChecker(),
        )
    except jsonschema.ValidationError as exc:
        field = ".".join(str(p) for p in exc.absolute_path) or "<root>"
        if exc.validator == "required":
            missing = exc.message.split("'")[1] if "'" in exc.message else exc.message
            print(f"{path}: missing required field '{missing}'", file=sys.stderr)
        else:
            print(f"{path}: schema violation at {field}: {exc.message}", file=sys.stderr)
        return 1

    present = _headings(body)
    for heading in REQUIRED_HEADINGS:
        if heading not in present:
            print(f"{path}: missing required heading '## {heading}'", file=sys.stderr)
            return 1
    if fm.get("verdict") == "block" and BLOCK_ONLY_HEADING not in present:
        print(f"{path}: missing required heading '## {BLOCK_ONLY_HEADING}' for verdict block", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
