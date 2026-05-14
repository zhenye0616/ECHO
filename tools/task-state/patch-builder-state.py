#!/usr/bin/env python3
"""patch-builder-state.py — refresh the lifecycle + anchor portion of an
existing ``backlog/task-state/<task-id>/builder.md`` pointer at
``/process-backlog`` handoff time.

The patcher is intentionally limited. It NEVER:

  * renders a fresh pointer body from CLI arguments (would erase
    builder-authored ``locked_decisions``);
  * creates a generic placeholder pointer when ``builder.md`` is absent
    (compatibility with items that set ``task_state_ref`` before the builder
    adopted ``builder.md``);
  * replaces a malformed existing pointer (escalation, not silent rewrite).

It touches only the staleness-prone fields:

  * frontmatter ``last_updated`` (current UTC) plus the three handoff metadata
    keys ``handoff_branch`` / ``handoff_head_sha`` / ``handoff_run_log``;
  * ``## current_thesis`` patcher-owned marker block;
  * ``## open_questions`` (empty → canonical line; non-empty + escalated →
    patcher-owned marker block; non-empty + complete → byte-for-byte preserved);
  * ``## canonical_anchors`` (schema-compliant ``spec`` + optional preserved
    ``reviews``; legacy keys ``branch`` / ``run_log`` / ``head_sha`` /
    ``worktree`` are dropped because the shipped anchor parser rejects unknown
    keys).

``## locked_decisions`` and ``## dont_touch`` are preserved byte-for-byte —
they carry builder-authored design choices and spec-specific drift boundaries
that CLI args cannot reconstruct.

Single-writer state. No CAS / blob-lease. The caller (``/process-backlog``)
commits + pushes the patched file through its own atomic-claim flow.

Stdlib only — matches the lightweight scope of ``tools/task-state/lint.py``.
"""

from __future__ import annotations

import argparse
import datetime
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

MARKER_THESIS_START = "<!-- builder-state-handoff:start -->"
MARKER_THESIS_END = "<!-- builder-state-handoff:end -->"
MARKER_OPENQ_START = "<!-- builder-state-handoff-open-questions:start -->"
MARKER_OPENQ_END = "<!-- builder-state-handoff-open-questions:end -->"

_FRONTMATTER_LINE_RE = re.compile(r"^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$")
_HEADING_RE = re.compile(r"^##\s+([a-z_]+)\s*$")
_ANCHOR_LINE_RE = re.compile(r"^\s*-\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$")


class MalformedPointer(Exception):
    """Raised when an existing ``builder.md`` fails the structural contract.

    Per AC1 the helper must exit non-zero rather than silently rewrite the
    pointer; replacing builder-authored content with generic boilerplate
    would erase load-bearing design choices.
    """


def utc_now_iso() -> str:
    return (
        datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .strftime("%Y-%m-%dT%H:%M:%SZ")
    )


def parse_frontmatter(text: str):
    """Return ``(items, body)``.

    * ``items`` is ``None`` when no frontmatter is present, otherwise a list
      of dicts with ``raw`` (verbatim original line, no terminator) and an
      optional ``key`` / ``value`` pair. Blank lines round-trip as
      ``{"raw": ""}``.
    * ``body`` is the text after the closing ``---\\n``.

    Raises ``MalformedPointer`` when frontmatter is opened but never closed,
    or when a non-blank frontmatter line is not a flat ``key: value`` shape.
    """
    if not text.startswith("---\n"):
        return None, text
    rest = text[4:]
    end_idx = rest.find("\n---\n")
    if end_idx == -1:
        # tolerate an EOF-only ``---`` close (no trailing newline)
        if rest.endswith("\n---"):
            end_idx = len(rest) - 4
            after = ""
        else:
            raise MalformedPointer("frontmatter missing closing '---'")
    else:
        after = rest[end_idx + len("\n---\n"):]
    fm_text = rest[:end_idx]
    items: list[dict] = []
    for line in fm_text.split("\n"):
        if not line.strip():
            items.append({"raw": line})
            continue
        m = _FRONTMATTER_LINE_RE.match(line)
        if m is None:
            raise MalformedPointer(f"invalid frontmatter line: {line!r}")
        items.append({"raw": line, "key": m.group(1), "value": m.group(2)})
    return items, after


def update_frontmatter(items: list[dict], updates: dict[str, str]) -> None:
    """Apply ``updates`` in place: rewrite existing keys, append missing ones
    after the last non-blank line. Existing key order is preserved.
    """
    seen: set[str] = set()
    for item in items:
        key = item.get("key")
        if key in updates:
            item["value"] = updates[key]
            item["raw"] = f"{key}: {updates[key]}"
            seen.add(key)
    missing = [k for k in updates if k not in seen]
    if not missing:
        return
    last_keyed = -1
    for i, item in enumerate(items):
        if item.get("key") is not None:
            last_keyed = i
    insert_at = last_keyed + 1 if last_keyed >= 0 else len(items)
    for k in missing:
        items.insert(
            insert_at, {"raw": f"{k}: {updates[k]}", "key": k, "value": updates[k]}
        )
        insert_at += 1


def emit_frontmatter(items: list[dict]) -> str:
    return "---\n" + "\n".join(item["raw"] for item in items) + "\n---\n"


def parse_sections(body: str) -> tuple[str, bool, list[tuple[str, str]]]:
    """Split ``body`` into pre-heading lead + named sections.

    Returns ``(lead_text, lead_had_content, sections)``:

    * ``lead_text`` is the text before the first ``## `` heading (may be
      empty when the body starts at the first heading);
    * ``lead_had_content`` is True iff there was at least one line before
      the first heading (even an empty one — preserves the conventional
      blank line between the closing ``---`` and ``## current_thesis``);
    * ``sections`` is a list of ``(name, raw_section_text)``;
      ``raw_section_text`` includes the heading line and all lines up to
      (but not including) the next heading.
    """
    sections: list[tuple[str, str]] = []
    lead_lines: list[str] = []
    seen_first_heading = False
    cur_name: str | None = None
    cur_lines: list[str] = []
    for line in body.split("\n"):
        m = _HEADING_RE.match(line)
        if m is not None:
            if not seen_first_heading:
                lead_lines = cur_lines
                seen_first_heading = True
            else:
                assert cur_name is not None
                sections.append((cur_name, "\n".join(cur_lines)))
            cur_name = m.group(1)
            cur_lines = [line]
        else:
            cur_lines.append(line)
    if not seen_first_heading:
        lead_lines = cur_lines
    elif cur_name is not None:
        sections.append((cur_name, "\n".join(cur_lines)))
    lead_text = "\n".join(lead_lines)
    return lead_text, bool(lead_lines), sections


def validate_required(sections: list[tuple[str, str]]) -> None:
    names = [n for n, _ in sections]
    seen_set = set(names)
    missing = [b for b in REQUIRED_BLOCKS if b not in seen_set]
    if missing:
        raise MalformedPointer(
            "missing required block(s): " + ", ".join(missing)
        )
    seen_order: list[str] = []
    for n in names:
        if n in REQUIRED_BLOCKS and n not in seen_order:
            seen_order.append(n)
    if seen_order != list(REQUIRED_BLOCKS):
        raise MalformedPointer(
            "required blocks out of order: " + ", ".join(seen_order)
        )


def _replace_marker_block(
    section_text: str, start_marker: str, end_marker: str, replacement: str
) -> str | None:
    """If ``start_marker`` and ``end_marker`` both appear in ``section_text``
    (start before end), replace from the start-marker line through the
    end-marker line with ``replacement``. Returns the new text, or ``None``
    if the markers are not present.
    """
    s = section_text.find(start_marker)
    if s == -1:
        return None
    e = section_text.find(end_marker, s + len(start_marker))
    if e == -1:
        return None
    line_start = section_text.rfind("\n", 0, s) + 1
    line_end = section_text.find("\n", e)
    if line_end == -1:
        line_end = len(section_text)
    return section_text[:line_start] + replacement + section_text[line_end:]


def _append_marker_block(section_text: str, marker_block: str) -> str:
    """Append ``marker_block`` after existing section content. Ensures a
    blank line precedes the marker block for readable rendering and one
    trailing newline so the next ``## `` heading begins on its own line.
    """
    stripped = section_text.rstrip("\n")
    return stripped + "\n\n" + marker_block + "\n"


def patch_current_thesis(
    section_text: str, outcome: str, head_sha: str, run_log: str
) -> str:
    if outcome == "complete":
        body_line = (
            f"- Lifecycle: COMPLETE — ready for review at {head_sha or 'none'}."
        )
    else:
        body_line = (
            f"- Lifecycle: ESCALATED — see agent_notes and "
            f"{run_log or 'run log'} for blocker."
        )
    marker_block = (
        f"{MARKER_THESIS_START}\n{body_line}\n{MARKER_THESIS_END}"
    )
    replaced = _replace_marker_block(
        section_text, MARKER_THESIS_START, MARKER_THESIS_END, marker_block
    )
    if replaced is not None:
        return replaced
    return _append_marker_block(section_text, marker_block)


def _section_body_is_empty(section_text: str) -> bool:
    parts = section_text.split("\n", 1)
    body = parts[1] if len(parts) > 1 else ""
    return body.strip() == ""


def patch_open_questions(section_text: str, outcome: str) -> str:
    if _section_body_is_empty(section_text):
        if outcome == "complete":
            line = "- None blocking; handed off for review."
        else:
            line = "- See agent_notes and run log for the escalation question."
        heading = section_text.split("\n", 1)[0]
        return f"{heading}\n\n{line}\n"
    if outcome == "complete":
        # Non-empty + complete: preserve byte-for-byte.
        return section_text
    # Non-empty + escalated: patcher-owned marker block.
    body_line = "- See agent_notes and run log for the escalation question."
    marker_block = (
        f"{MARKER_OPENQ_START}\n{body_line}\n{MARKER_OPENQ_END}"
    )
    replaced = _replace_marker_block(
        section_text, MARKER_OPENQ_START, MARKER_OPENQ_END, marker_block
    )
    if replaced is not None:
        return replaced
    return _append_marker_block(section_text, marker_block)


def patch_canonical_anchors(section_text: str, spec_path: str) -> str:
    """Rewrite the anchor block to be schema-compliant.

    The shipped anchor parser (``src/mcp/parse-anchors.ts``) accepts only
    ``spec`` (required) and ``reviews`` (optional). Legacy keys
    (``branch`` / ``run_log`` / ``head_sha`` / ``worktree``) are dropped —
    that handoff metadata now lives in frontmatter (``handoff_*``).
    """
    lines = section_text.split("\n")
    heading_line = lines[0]
    reviews_line: str | None = None
    for line in lines[1:]:
        m = _ANCHOR_LINE_RE.match(line)
        if m is None:
            continue
        if m.group(1) == "reviews":
            reviews_line = line
            break
    new_lines = [heading_line, "", f"- spec: {spec_path}"]
    if reviews_line is not None:
        new_lines.append(reviews_line)
    return "\n".join(new_lines) + "\n"


def patch_text(
    text: str,
    *,
    outcome: str,
    spec_path: str,
    branch: str,
    head_sha: str,
    run_log: str,
) -> str:
    items, body = parse_frontmatter(text)
    lead_text, lead_had_content, sections = parse_sections(body)
    validate_required(sections)

    updates = {
        "last_updated": utc_now_iso(),
        "handoff_branch": branch,
        "handoff_head_sha": head_sha,
        "handoff_run_log": run_log,
    }
    if items is None:
        items = [
            {"raw": f"{k}: {v}", "key": k, "value": v} for k, v in updates.items()
        ]
    else:
        update_frontmatter(items, updates)
    new_fm = emit_frontmatter(items)

    new_sections: list[tuple[str, str]] = []
    for name, sec_text in sections:
        if name == "current_thesis":
            sec_text = patch_current_thesis(sec_text, outcome, head_sha, run_log)
        elif name == "open_questions":
            sec_text = patch_open_questions(sec_text, outcome)
        elif name == "canonical_anchors":
            sec_text = patch_canonical_anchors(sec_text, spec_path)
        new_sections.append((name, sec_text))

    sections_joined = "\n".join(sec for _, sec in new_sections)
    if lead_had_content:
        new_body = lead_text + "\n" + sections_joined
    else:
        new_body = sections_joined
    if not new_body.endswith("\n"):
        new_body += "\n"
    return new_fm + new_body


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Refresh the lifecycle + anchors of an existing builder.md "
        "at process-backlog handoff."
    )
    parser.add_argument("--task-id", required=True)
    parser.add_argument(
        "--outcome", required=True, choices=("complete", "escalated")
    )
    parser.add_argument("--spec-path", required=True)
    parser.add_argument("--branch", default="")
    parser.add_argument("--head-sha", default="")
    parser.add_argument("--run-log", default="")
    parser.add_argument(
        "--repo-root",
        default=None,
        help="Override repo root (defaults to $ECHO_TASK_STATE_REPO_ROOT or CWD).",
    )
    args = parser.parse_args(argv)

    if args.repo_root is not None:
        repo_root = Path(args.repo_root)
    else:
        import os

        env_root = os.environ.get("ECHO_TASK_STATE_REPO_ROOT")
        repo_root = Path(env_root) if env_root else Path.cwd()

    pointer = repo_root / "backlog" / "task-state" / args.task_id / "builder.md"
    if not pointer.is_file():
        print(
            f"patch-builder-state: no builder.md at {pointer}; skipping (no-op).",
            file=sys.stderr,
        )
        return 0

    try:
        original = pointer.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"patch-builder-state: unreadable {pointer}: {exc}", file=sys.stderr)
        return 2

    try:
        updated = patch_text(
            original,
            outcome=args.outcome,
            spec_path=args.spec_path,
            branch=args.branch,
            head_sha=args.head_sha,
            run_log=args.run_log,
        )
    except MalformedPointer as exc:
        print(
            f"patch-builder-state: malformed builder.md at {pointer}: {exc}",
            file=sys.stderr,
        )
        return 2

    pointer.write_text(updated, encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
