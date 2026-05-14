#!/usr/bin/env python3
"""lint.py — enforce the role-typed task-state pointer contract.

Walks ``backlog/task-state/**/*.md``. For each file, validates:

  1. body line count <= 120 (hard fail above 120; soft warning at 81-120).
     "Body" excludes the optional YAML frontmatter block (the lines from the
     opening ``---`` through the closing ``---`` inclusive). If there is no
     frontmatter, body = full file.

  2. The five required level-2 headings appear in this exact order:
        ## current_thesis
        ## locked_decisions
        ## open_questions
        ## dont_touch
        ## canonical_anchors

  3. For files named ``round-state.md``: ``current_round:`` is the first
     non-blank line after any frontmatter and before the first ``## `` line.

Frontmatter-only files (no body content beyond an empty frontmatter or
whitespace-only body) FAIL with ``missing-required-block: current_thesis``.
The required-blocks contract has no exception for empty bodies — empty
placeholders must still include the skeleton blocks.

Exits 0 on clean (warnings still print to stderr but do not fail the run);
exits 1 with a per-file ``<path>:<line>: <reason>`` diagnostic to stderr on
any hard failure.

Stdlib only — no PyYAML / jsonschema dependency, matching the lightweight
scope of this lint vs. the heavier ``tools/review-queue/validate.py``.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

REQUIRED_BLOCKS: tuple[str, ...] = (
    "current_thesis",
    "locked_decisions",
    "open_questions",
    "dont_touch",
    "canonical_anchors",
)

HARD_CAP = 120
SOFT_WARN_AT = 81

# Match ``## <name>`` at line start with exactly one space after the hashes.
# We pin the exact level (``## ``) and ignore higher levels (``### ``) so a
# subsection ``### locked_decisions detail`` is NOT treated as a block.
_HEADING_RE = re.compile(r"^##\s+([a-z_]+)\s*$")


def split_frontmatter(text: str) -> tuple[int, str]:
    """Return (body_offset_line_1indexed, body_text).

    ``body_offset_line_1indexed`` is the 1-indexed line number where the body
    starts in the original file (so diagnostics that index into ``body_text``
    can be reported with an accurate original line number).

    If the file has no frontmatter, body offset is 1 and body_text is the
    full content. If the file starts with ``---`` but never closes, treat
    the entire file as body (be lenient — the lint's job is not YAML
    validation).
    """
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return 1, text

    # find the closing ``---`` on its own line
    lines = text.splitlines(keepends=True)
    # lines[0] is the opening ``---``; scan from line index 1.
    for idx in range(1, len(lines)):
        stripped = lines[idx].rstrip("\r\n")
        if stripped == "---":
            # body starts at idx+1 (0-indexed) → 1-indexed line idx+2
            body_lines = lines[idx + 1 :]
            return idx + 2, "".join(body_lines)
    # never closed — treat whole file as body
    return 1, text


def count_body_lines(body_text: str) -> int:
    """Count newline-delimited lines in body. Trailing-newline handling:
    a file ending in ``\\n`` is counted as N lines, not N+1 (the trailing
    newline is part of line N's terminator)."""
    if not body_text:
        return 0
    # ``splitlines()`` drops a single trailing newline (gives N) but a final
    # un-newlined line still counts. Both desired behaviors → use
    # ``splitlines()`` directly.
    return len(body_text.splitlines())


def check_blocks(body_text: str, body_offset: int) -> list[tuple[int, str]]:
    """Return a list of (1-indexed-line-in-file, error-message) diagnostics
    for block presence + order violations. Empty list = pass."""
    diagnostics: list[tuple[int, str]] = []
    seen: list[tuple[str, int]] = []  # (block_name, 1-indexed file line)
    for body_idx, raw_line in enumerate(body_text.splitlines()):
        m = _HEADING_RE.match(raw_line)
        if m is None:
            continue
        name = m.group(1)
        if name in REQUIRED_BLOCKS:
            seen.append((name, body_offset + body_idx))

    seen_names = [n for n, _ in seen]
    seen_set = set(seen_names)
    # Required-block presence: missing block fires a single diagnostic at
    # body_offset (start of body) so an empty file gives a clean diagnostic.
    for required in REQUIRED_BLOCKS:
        if required not in seen_set:
            diagnostics.append(
                (body_offset, f"missing-required-block: {required}")
            )
    # Required-block order: only check among the blocks that ARE present.
    expected_order = [n for n in REQUIRED_BLOCKS if n in seen_set]
    actual_order = [n for n in seen_names if n in seen_set]
    if expected_order != actual_order:
        # report at the first mis-ordered block
        for (name, line_no) in seen:
            if name in seen_set:
                idx_actual = actual_order.index(name)
                if idx_actual < len(expected_order) and expected_order[idx_actual] != name:
                    diagnostics.append(
                        (line_no, f"required-block-out-of-order: {name}")
                    )
                    break
    return diagnostics


def check_round_state(body_text: str, body_offset: int) -> list[tuple[int, str]]:
    """``round-state.md`` files must have ``current_round: r<N>`` as the
    first non-blank line of body, preceding the first ``## `` heading."""
    diagnostics: list[tuple[int, str]] = []
    for body_idx, raw_line in enumerate(body_text.splitlines()):
        stripped = raw_line.strip()
        if not stripped:
            continue
        # First non-blank body line. Must match the current_round pattern.
        if not re.match(r"^current_round:\s*r\d+\s*$", stripped):
            diagnostics.append(
                (
                    body_offset + body_idx,
                    "round-state.md: first non-blank body line must be "
                    "'current_round: r<N>' (got: " + repr(stripped) + ")",
                )
            )
        return diagnostics
    # All-blank body — fall through; required-blocks check will flag it.
    diagnostics.append(
        (body_offset, "round-state.md: missing 'current_round: r<N>' header")
    )
    return diagnostics


def lint_file(path: Path) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    """Lint one file. Returns (errors, warnings)."""
    errors: list[tuple[int, str]] = []
    warnings: list[tuple[int, str]] = []
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append((1, f"unreadable: {exc}"))
        return errors, warnings

    body_offset, body_text = split_frontmatter(text)
    body_lines = count_body_lines(body_text)

    if body_lines > HARD_CAP:
        errors.append(
            (
                body_offset + body_lines - 1 if body_lines else body_offset,
                f"body line count {body_lines} exceeds hard cap of {HARD_CAP}",
            )
        )
    elif body_lines >= SOFT_WARN_AT:
        warnings.append(
            (
                body_offset,
                f"body line count {body_lines} >= soft-warn threshold "
                f"{SOFT_WARN_AT} (target 40-60)",
            )
        )

    errors.extend(check_blocks(body_text, body_offset))

    if path.name == "round-state.md":
        errors.extend(check_round_state(body_text, body_offset))

    return errors, warnings


def find_pointers(root: Path) -> list[Path]:
    base = root / "backlog" / "task-state"
    if not base.is_dir():
        return []
    return sorted(p for p in base.rglob("*.md") if p.is_file())


def main(argv: list[str]) -> int:
    repo_root = Path(
        os.environ.get(
            "ECHO_TASK_STATE_REPO_ROOT",
            Path(__file__).resolve().parents[2],
        )
    )
    files: list[Path]
    if len(argv) > 1:
        files = [Path(a) for a in argv[1:]]
    else:
        files = find_pointers(repo_root)

    rc = 0
    for path in files:
        errors, warnings = lint_file(path)
        rel = path
        try:
            rel = path.relative_to(repo_root)
        except ValueError:
            pass
        for line_no, msg in warnings:
            print(f"warning: {rel}:{line_no}: {msg}", file=sys.stderr)
        for line_no, msg in errors:
            print(f"{rel}:{line_no}: {msg}", file=sys.stderr)
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv))
