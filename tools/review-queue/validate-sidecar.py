#!/usr/bin/env python3
"""Validate committed /review-pending sidecar artifacts.

Usage:
    validate-sidecar.py <path>

Validates frontmatter against schemas/review-sidecar.schema.json and checks
the committed sidecar body headings that merge-and-cleanup consumes.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402
import _sidecar_validate  # noqa: E402


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

    error = _sidecar_validate.validate(fm, body)
    if error is not None:
        print(f"{path}: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
