#!/usr/bin/env python3
"""dispatch-next-round.py — strategist watcher's post-disposition state-machine helper.

Executes one of the three AC3.5 branches documented in
`.claude/commands/review-queue-watch.md` Step 3:

    (a) verdict ∈ {proceed, pushback} AND --patches-applied=false
        No-op success. Asserts r<N>/combined.md still has next_round=null.

    (b) --patches-applied=true (any verdict)
        Invokes request.py to write r<N+1>/request.md, then atomically
        in-place-updates r<N>/combined.md to set next_round=<N+1>.

    (c) verdict=proceed_after_patches AND --patches-applied=false (explicit waiver)
        Appends `verification waived; rationale: <--focus-hints>` line into
        r<N>/combined.md body; leaves next_round=null.

File mutations only — does NOT run git add/commit/push. The watcher
slash-command owns the single per-branch git block that follows.

Usage:
    dispatch-next-round.py <item_id> <current_round> \\
      --verdict={proceed, proceed_after_patches, pushback} \\
      --patches-applied={true, false} \\
      --class={narrow, structural-reform} \\
      --focus-hints=<str> \\
      [--repo-root=<path>] [--spec-sha=<sha>]

Exit codes:
    0  success (including idempotent re-invocation)
    2  unrecoverable: r<N+1>/request.md exists at a different spec_commit_sha,
       or argument-shape error
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402

VALID_VERDICTS = ("proceed", "proceed_after_patches", "pushback")
VALID_CLASSES = ("narrow", "structural-reform")
WAIVER_PREFIX = "verification waived; rationale:"


def _bool_arg(s: str) -> bool:
    if s.lower() == "true":
        return True
    if s.lower() == "false":
        return False
    raise argparse.ArgumentTypeError(
        f"expected 'true' or 'false', got {s!r}"
    )


def _atomic_replace(final: Path, content: str) -> None:
    """Overwrite-allowed atomic write: temp file in same dir + os.replace().

    Distinct from _lib.atomic_link_write() which uses os.link (create-only).
    combined.md already exists at helper invocation time, so a create-only
    write would raise FileExistsError on every call.
    """
    final.parent.mkdir(parents=True, exist_ok=True)
    tmp = final.with_name(f"{final.name}.{uuid.uuid4().hex}.tmp")
    tmp.write_text(content, encoding="utf-8")
    os.replace(tmp, final)


def _update_combined_next_round(combined_path: Path, next_round: int) -> None:
    """Set frontmatter `next_round` and write atomically. Idempotent if already set."""
    fm, body = _lib.parse_frontmatter(combined_path)
    if fm.get("next_round") == next_round:
        return
    fm["next_round"] = next_round
    content = _lib.serialize_frontmatter(fm, body)
    _lib.validate_frontmatter(fm, "combined")
    _atomic_replace(combined_path, content)


def _append_waiver_line(combined_path: Path, rationale: str) -> None:
    """Append the waiver line into the body. Idempotent if the same line is present."""
    fm, body = _lib.parse_frontmatter(combined_path)
    line = f"{WAIVER_PREFIX} {rationale}".rstrip()
    if line in body:
        return
    if body and not body.endswith("\n"):
        body += "\n"
    body += f"{line}\n"
    content = _lib.serialize_frontmatter(fm, body)
    _lib.validate_frontmatter(fm, "combined")
    _atomic_replace(combined_path, content)


def _resolve_request_py() -> list[str]:
    """Return the argv prefix to invoke request.py, matching _helpers.pythonInvocation."""
    here = Path(__file__).resolve().parent
    return [sys.executable, str(here / "request.py")]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("item_id")
    ap.add_argument("current_round", type=int)
    ap.add_argument("--verdict", required=True, choices=VALID_VERDICTS)
    ap.add_argument("--patches-applied", required=True, type=_bool_arg,
                    dest="patches_applied")
    ap.add_argument("--class", dest="cls", required=True, choices=VALID_CLASSES)
    ap.add_argument("--focus-hints", default="", dest="focus_hints")
    ap.add_argument("--repo-root", default=None, dest="repo_root")
    ap.add_argument("--spec-sha", default=None, dest="spec_sha")
    args = ap.parse_args(argv[1:])

    repo_root = (
        Path(args.repo_root).resolve() if args.repo_root else _lib.REPO_ROOT
    )
    n = args.current_round
    combined_path = (
        repo_root / "backlog" / "reviews" / args.item_id / f"r{n}" / "combined.md"
    )
    if not combined_path.is_file():
        print(
            f"no combined.md at {combined_path} — combine.py must run before dispatch",
            file=sys.stderr,
        )
        return 2

    # Branch selection. (b) is keyed on patches_applied=true (any verdict);
    # (c) is the explicit-waiver path; (a) is the terminal no-op.
    if args.patches_applied:
        return _branch_b(args, repo_root, combined_path, n)
    if args.verdict == "proceed_after_patches":
        return _branch_c(args, combined_path)
    # verdict ∈ {proceed, pushback} AND patches_applied=false → (a)
    return _branch_a(combined_path)


def _branch_a(combined_path: Path) -> int:
    """(a) Terminal no-op. Assert next_round is null."""
    fm, _ = _lib.parse_frontmatter(combined_path)
    nr = fm.get("next_round")
    if nr not in (None, ):
        print(
            f"(a) branch: combined.md has next_round={nr!r}; expected null. "
            f"Refusing to overwrite a previously-dispatched round.",
            file=sys.stderr,
        )
        return 2
    return 0


def _branch_b(args: argparse.Namespace, repo_root: Path, combined_path: Path, n: int) -> int:
    """(b) Run request.py for r<N+1>, then set next_round=<N+1>."""
    next_n = n + 1
    cmd = _resolve_request_py() + [
        args.item_id,
        str(next_n),
        f"--class={args.cls}",
        f"--repo-root={repo_root}",
    ]
    if args.focus_hints:
        cmd.append(f"--focus-hints={args.focus_hints}")
    if args.spec_sha:
        cmd.append(f"--spec-sha={args.spec_sha}")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.stdout:
        sys.stdout.write(proc.stdout)
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        # request.py's exit-2 race-loser (different-SHA) propagates through.
        return proc.returncode

    _update_combined_next_round(combined_path, next_n)
    return 0


def _branch_c(args: argparse.Namespace, combined_path: Path) -> int:
    """(c) Append explicit-waiver line; leave next_round=null."""
    rationale = args.focus_hints.strip() if args.focus_hints else ""
    _append_waiver_line(combined_path, rationale)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
