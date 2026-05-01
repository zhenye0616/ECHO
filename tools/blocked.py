#!/usr/bin/env python3
"""
blocked.py — deterministic selector and validator for the ECHO backlog.

Enforces the blocked_by mechanism in code rather than in agent discretion.
The slash commands (/process-backlog, /process-backlog-batch) call this
script to pick the next claimable item; the agent does NOT filter manually.

Usage:
    tools/blocked.py                 # print next unblocked candidate path; exit 0; or exit 1 if none
    tools/blocked.py --list-all      # print all ready/ items with status (READY / BLOCKED reasons)
    tools/blocked.py --list-blocked  # print only items that are blocked (with reason)
    tools/blocked.py --validate      # check whole backlog for cycles, dangling refs, malformed; exit 0 or 2

Exit codes:
    0  success — printed a candidate path (or validation passed in --validate mode)
    1  no unblocked candidates
    2  validation error (malformed frontmatter, dangling ref, cycle, schema violation)

Input shape (parsed from each item's YAML frontmatter):
    id:          string, must equal filename without .md
    status:      ready | claimed | pending_review | complete
    priority:    HIGH | MED | LOW
    created:     YYYY-MM-DD
    blocked_by:  list of item IDs (may be empty list `[]` or omitted)

Selection rule:
    UNBLOCKED candidates are items in backlog/ready/ where every entry of
    blocked_by has a corresponding file in backlog/complete/. Items in
    pending_review/ or claimed/ do NOT satisfy a blocked_by dependency —
    only complete/ does. This is the safety gate: founder review must
    promote an item to complete/ before its dependents become claimable.

    Among UNBLOCKED candidates: HIGH > MED > LOW priority; ties broken by
    oldest creation date; further ties broken by lexicographic id.
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any, Optional

PRIORITY_ORDER = {"HIGH": 0, "MED": 1, "LOW": 2}
STAGES = ("ready", "claimed", "pending_review", "complete")
STATUS_VALUES = set(STAGES)
ID_FILENAME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-\d{3}-[a-z][a-z0-9-]*$")


class ValidationError(Exception):
    pass


def parse_frontmatter(text: str) -> dict[str, Any]:
    """Minimal YAML-frontmatter parser sufficient for our schema.

    Supports:
      key: scalar
      key: "scalar with quotes"
      key: []
      key:
        - item1
        - item2

    Does NOT support nested objects, multi-line strings, anchors, or any
    other YAML feature. The schema is small and stable; we don't need a
    yaml dependency.
    """
    if not text.startswith("---\n"):
        raise ValidationError("no frontmatter (must start with '---')")
    end = text.find("\n---\n", 4)
    if end == -1:
        raise ValidationError("frontmatter not terminated with '---'")
    body = text[4:end]

    fm: dict[str, Any] = {}
    lines = body.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$", line)
        if not m:
            i += 1
            continue
        key, val = m.group(1), m.group(2)
        if val == "[]":
            fm[key] = []
            i += 1
            continue
        if val == "":
            # multi-line list (or empty)
            items: list[str] = []
            i += 1
            while i < len(lines):
                nxt = lines[i]
                lm = re.match(r"^\s+-\s+(.*?)\s*$", nxt)
                if lm:
                    item = lm.group(1).strip().strip('"').strip("'")
                    items.append(item)
                    i += 1
                elif re.match(r"^[A-Za-z_]", nxt) or not nxt.strip():
                    break
                else:
                    i += 1
            fm[key] = items
            continue
        # scalar
        fm[key] = val.strip().strip('"').strip("'")
        i += 1
    return fm


def load_items(repo_root: Path) -> dict[str, dict[str, Any]]:
    """Walk all four backlog stages and collect every item by id."""
    items: dict[str, dict[str, Any]] = {}
    for stage in STAGES:
        d = repo_root / "backlog" / stage
        if not d.exists():
            continue
        for f in sorted(d.glob("*.md")):
            # Skip /review-pending sidecars; they're metadata, not items.
            if f.name.endswith(".review.md"):
                continue
            text = f.read_text(encoding="utf-8")
            try:
                fm = parse_frontmatter(text)
            except ValidationError as e:
                raise ValidationError(f"{f}: {e}") from None

            iid = fm.get("id")
            if not iid:
                raise ValidationError(f"{f}: missing 'id' field")
            if iid != f.stem:
                raise ValidationError(
                    f"{f}: id '{iid}' does not match filename '{f.stem}'"
                )
            if not ID_FILENAME_RE.match(iid):
                raise ValidationError(
                    f"{f}: id '{iid}' violates naming pattern "
                    "YYYY-MM-DD-NNN-kebab-slug"
                )
            if iid in items:
                raise ValidationError(
                    f"{f}: duplicate id '{iid}' (also at {items[iid]['path']})"
                )

            blocked_by = fm.get("blocked_by", [])
            if not isinstance(blocked_by, list):
                raise ValidationError(
                    f"{f}: blocked_by must be a list, got {type(blocked_by).__name__}"
                )

            priority = fm.get("priority", "MED")
            if priority not in PRIORITY_ORDER:
                raise ValidationError(
                    f"{f}: priority '{priority}' must be HIGH/MED/LOW"
                )

            # Note: the `status:` field in frontmatter is informational only.
            # The folder location is the authoritative source of truth.
            # We deliberately do NOT validate status == folder, because
            # nothing in the agent lifecycle maintains that field, and
            # treating it as authoritative would create a maintenance burden
            # for zero benefit.

            items[iid] = {
                "path": f,
                "stage": stage,
                "id": iid,
                "priority": priority,
                "created": fm.get("created", "9999-99-99"),
                "blocked_by": blocked_by,
            }
    return items


def validate(items: dict[str, dict[str, Any]]) -> list[str]:
    """Cross-item validation: dangling refs, cycles, stage/status mismatch.

    Returns a list of error strings (empty if clean).
    """
    errors: list[str] = []

    # Dangling references
    all_ids = set(items.keys())
    for iid, it in items.items():
        for dep in it["blocked_by"]:
            if dep not in all_ids:
                errors.append(
                    f"{it['path']}: blocked_by '{dep}' is not a known item id"
                )

    # Cycle detection (only over non-complete items; complete items can't cycle)
    UNVISITED, VISITING, DONE = 0, 1, 2
    color: dict[str, int] = {iid: UNVISITED for iid in items}

    def dfs(node: str, path: list[str]) -> None:
        if color[node] == VISITING:
            i = path.index(node)
            cycle = " -> ".join(path[i:] + [node])
            errors.append(f"cycle in blocked_by: {cycle}")
            return
        if color[node] == DONE:
            return
        color[node] = VISITING
        for dep in items[node]["blocked_by"]:
            if dep in items:
                dfs(dep, path + [node])
        color[node] = DONE

    for iid in items:
        if items[iid]["stage"] != "complete" and color[iid] == UNVISITED:
            dfs(iid, [])

    return errors


def candidates(items: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Return ready/ items sorted by selection precedence (best first).

    Each entry includes 'unblocked' (bool) and 'unsatisfied' (list of dep ids
    not in complete/).
    """
    complete_ids = {iid for iid, it in items.items() if it["stage"] == "complete"}
    out: list[dict[str, Any]] = []
    for iid, it in items.items():
        if it["stage"] != "ready":
            continue
        unsatisfied = [d for d in it["blocked_by"] if d not in complete_ids]
        out.append(
            {
                **it,
                "unblocked": len(unsatisfied) == 0,
                "unsatisfied": unsatisfied,
            }
        )
    out.sort(
        key=lambda c: (
            PRIORITY_ORDER.get(c["priority"], 99),
            c["created"],
            c["id"],
        )
    )
    return out


def find_repo_root(start: Path) -> Path:
    """Walk up to find the repo root (the directory containing backlog/ and .git)."""
    cur = start.resolve()
    while cur != cur.parent:
        if (cur / "backlog").is_dir() and (cur / ".git").exists():
            return cur
        cur = cur.parent
    raise ValidationError(
        "could not locate repo root (no parent contains both backlog/ and .git)"
    )


def main(argv: list[str]) -> int:
    flags = set(argv[1:])
    valid_flags = {"--list-all", "--list-blocked", "--validate", "--help", "-h"}
    unknown = flags - valid_flags
    if unknown:
        print(f"unknown flag(s): {' '.join(sorted(unknown))}", file=sys.stderr)
        print(__doc__, file=sys.stderr)
        return 2
    if "--help" in flags or "-h" in flags:
        print(__doc__)
        return 0

    try:
        repo = find_repo_root(Path.cwd())
        items = load_items(repo)
    except ValidationError as e:
        print(f"VALIDATION ERROR: {e}", file=sys.stderr)
        return 2

    errors = validate(items)
    if errors:
        print("VALIDATION ERRORS:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 2

    if "--validate" in flags:
        print(f"OK: {len(items)} items across all stages, no errors")
        return 0

    cs = candidates(items)

    if "--list-all" in flags:
        for c in cs:
            tag = "READY    " if c["unblocked"] else "BLOCKED  "
            extra = (
                ""
                if c["unblocked"]
                else f"  (waiting on: {', '.join(c['unsatisfied'])})"
            )
            print(f"{tag}{c['priority']:5} {c['id']}{extra}")
        return 0

    if "--list-blocked" in flags:
        any_blocked = False
        for c in cs:
            if not c["unblocked"]:
                print(f"BLOCKED {c['id']}: waiting on {', '.join(c['unsatisfied'])}")
                any_blocked = True
        if not any_blocked:
            print("(none)")
        return 0

    # Default: print path of next unblocked candidate
    unblocked = [c for c in cs if c["unblocked"]]
    if not unblocked:
        return 1
    pick = unblocked[0]
    print(pick["path"])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
