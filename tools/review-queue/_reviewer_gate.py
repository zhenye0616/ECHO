#!/usr/bin/env python3
"""_reviewer_gate.py — validate REVIEWER_NAME for the shared headless wrapper
(043 AC3). Used by `_run_reviewer.sh` and `_install_reviewer_launchd.sh` to
fail fast with a clear stderr diagnostic when REVIEWER_NAME is unknown or
points at an IDE-mode reviewer.

Reads REVIEWER_NAME from the environment. Optionally takes a `--require-mode
<mode>` flag (default: `headless`) so install-side callers can reuse the same
gate. On success prints the slash_command to stdout and exits 0; on failure
emits a one-line diagnostic to stderr and exits 1.

056 AC5 part 1b extension — `--print <field>`:
    --print slash_command   (default; back-compat shape)
    --print invoke_command  (resolved template with {{WT}} / {{PROMPT}}
                             substituted via shlex.quote — shell-safe)

When `--print invoke_command` is invoked for an IDE-mode reviewer, the gate
exits non-zero with stderr containing the documented diagnostic
`IDE-mode reviewer <slug> has no invoke_command`. The default `--print
slash_command` mode continues to accept IDE reviewers as long as
`--require-mode` is overridden to `ide` (otherwise the existing mode check
rejects them with the unchanged diagnostic).
"""

from __future__ import annotations

import argparse
import os
import shlex
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reviewers import load_reviewers  # noqa: E402


def _resolve_invoke_command(template: str, wt: str | None, prompt: str | None) -> str:
    """Substitute {{WT}} / {{PROMPT}} tokens with shell-safe quoted values.

    056 AC5 part 3 Option A: shlex.quote each substituted value BEFORE
    assembling the final shell string. The caller (_run_reviewer.sh) feeds
    the resulting string to `bash -c`, so the redirect `< {{PROMPT}}` and
    other shell metacharacters in the template are intentionally interpreted
    by the shell, but the SUBSTITUTED paths are quoted so paths with spaces
    or special characters survive.
    """
    out = template
    if "{{WT}}" in out:
        if wt is None:
            raise ValueError(
                f"invoke_command references {{{{WT}}}} but no $WT was provided"
            )
        out = out.replace("{{WT}}", shlex.quote(wt))
    if "{{PROMPT}}" in out:
        if prompt is None:
            raise ValueError(
                f"invoke_command references {{{{PROMPT}}}} but no $PROMPT was provided"
            )
        out = out.replace("{{PROMPT}}", shlex.quote(prompt))
    return out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--require-mode", default="headless",
                    help="Required reviewers.json mode (default: headless)")
    ap.add_argument(
        "--print",
        dest="print_field",
        default="slash_command",
        choices=("slash_command", "invoke_command"),
        help="Which field to resolve and print on success (default: slash_command).",
    )
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

    if args.print_field == "invoke_command":
        # Resolve template against $WT / $PROMPT from environment. IDE-mode
        # reviewers explicitly have no invoke_command per the schema if/then;
        # surface the documented diagnostic and exit non-zero.
        if r.mode != "headless" or r.invoke_command is None:
            sys.stderr.write(
                f"IDE-mode reviewer {name} has no invoke_command\n"
            )
            sys.stderr.flush()
            return 1
        wt = os.environ.get("WT")
        prompt = os.environ.get("PROMPT")
        try:
            resolved = _resolve_invoke_command(r.invoke_command, wt, prompt)
        except ValueError as e:
            sys.stderr.write(f"invoke_command substitution failed: {e}\n")
            sys.stderr.flush()
            return 1
        print(resolved)
        return 0

    # Default: slash_command mode (back-compat). Still applies the
    # --require-mode gate so install + run wrappers reject the wrong mode.
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
