#!/usr/bin/env python3
"""_reviewer_gate.py — validate REVIEWER_NAME for the shared headless wrapper
(043 AC3). Used by `_run_reviewer.sh` and `_install_reviewer_launchd.sh` to
fail fast with a clear stderr diagnostic when REVIEWER_NAME is unknown or
points at an IDE-mode reviewer.

Reads REVIEWER_NAME from the environment. Optionally takes a `--require-mode
<mode>` flag (default: `headless`) so install-side callers can reuse the same
gate. On success prints the slash_command to stdout and exits 0; on failure
emits a one-line diagnostic to stderr and exits 1.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reviewers import load_reviewers  # noqa: E402


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--require-mode", default="headless",
                    help="Required reviewers.json mode (default: headless)")
    args = ap.parse_args(argv[1:])

    name = os.environ.get("REVIEWER_NAME")
    if not name:
        sys.stderr.write("REVIEWER_NAME env var required\n")
        sys.stderr.flush()
        return 1
    r = next((r for r in load_reviewers() if r.name == name), None)
    if r is None:
        sys.stderr.write(f"{name} not found in reviewers.json\n")
        sys.stderr.flush()
        return 1
    if r.mode != args.require_mode:
        sys.stderr.write(
            f"{name} has mode={r.mode}, not {args.require_mode}\n"
        )
        sys.stderr.flush()
        return 1
    print(r.slash_command)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
