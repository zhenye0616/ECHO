#!/usr/bin/env python3
"""validate.py — validate a review-queue frontmatter file against its schema.

Usage:
    validate.py <schema-name> <path>

schema-name ∈ {request, reviewer, combined}

Exit 0 on success; exit 1 with a clear error to stderr on schema violation
or missing-required-field. The reported error names the offending field
when the failure is `required` or `enum`.
"""

from __future__ import annotations

import sys
from pathlib import Path

import jsonschema

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402


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
        fm, _body = _lib.parse_frontmatter(path)
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
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
