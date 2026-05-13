#!/usr/bin/env python3
"""validate_response_yaml.py — pre-link reviewer-response YAML gate (045 AC1).

Reviewer slash commands (`review-queue-codex`, `review-queue-cursor`,
`review-queue-codex-ops`) invoke this helper BEFORE `os.link`-ing a freshly
written `<reviewer>.md` into its canonical path. On parse or schema failure the
helper exits non-zero with a clear stderr diagnostic so the prompt can drop the
temp file and regenerate the response IN-SESSION (codex CLI's existing retry
pattern, just shifted earlier in the flow).

Wraps `validate.py reviewer <path>` rather than re-implementing schema
validation — single source of truth for the contract.

Per spec disposition:
  * Stderr-only on the in-session retry path. The helper does NOT touch
    `raw/internal/queue-errors.md` for in-session retries (that would
    re-introduce the dirty-tree race the post-link quarantine path was meant
    to absorb).
  * Only on terminal failure (after the prompt has exhausted in-session
    retries and is about to exit non-zero without writing a response) does
    the prompt itself append a single `PRE-LINK-INVALID:` row to
    `queue-errors.md`. That terminal-side bookkeeping is the prompt's
    responsibility, not this helper's.

Usage:
    validate_response_yaml.py <path>

Exit codes:
    0 — frontmatter parses + matches `reviewer.schema.json`
    1 — parse failure, schema violation, or missing-file (diagnostic on stderr)
    2 — usage error (diagnostic on stderr)
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: validate_response_yaml.py <reviewer-response.md>", file=sys.stderr)
        return 2
    path = Path(argv[1])
    if not path.is_file():
        print(f"validate_response_yaml: file not found: {path}", file=sys.stderr)
        return 1

    tools_dir = Path(__file__).resolve().parent
    validator = tools_dir / "validate.py"
    if not validator.is_file():
        print(f"validate_response_yaml: validate.py not found at {validator}", file=sys.stderr)
        return 1

    # Resolve python3 — prefer arch -arm64 on Apple Silicon when the default
    # python3 lacks the jsonschema/yaml imports (matches the dance in
    # commit-reviewer-response.sh).
    py_cmd: list[str]
    probe = subprocess.run(
        ["python3", "-c", "import jsonschema, yaml"],
        capture_output=True,
    )
    if probe.returncode == 0:
        py_cmd = ["python3"]
    elif sys.platform == "darwin" and shutil.which("arch"):
        probe2 = subprocess.run(
            ["arch", "-arm64", "python3", "-c", "import jsonschema, yaml"],
            capture_output=True,
        )
        if probe2.returncode == 0:
            py_cmd = ["arch", "-arm64", "python3"]
        else:
            print(
                "validate_response_yaml: python3 with jsonschema + yaml not available",
                file=sys.stderr,
            )
            return 1
    else:
        print(
            "validate_response_yaml: python3 with jsonschema + yaml not available",
            file=sys.stderr,
        )
        return 1

    result = subprocess.run(
        [*py_cmd, str(validator), "reviewer", str(path)],
        capture_output=True,
        text=True,
        env={"PYTHONDONTWRITEBYTECODE": "1", **__import__("os").environ},
    )
    if result.returncode != 0:
        # Forward the validator's diagnostic verbatim — its messages already
        # name the offending field / line / column.
        if result.stderr:
            sys.stderr.write(result.stderr)
            if not result.stderr.endswith("\n"):
                sys.stderr.write("\n")
        else:
            print(
                f"validate_response_yaml: {path}: validator exited {result.returncode} "
                f"with no diagnostic",
                file=sys.stderr,
            )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
