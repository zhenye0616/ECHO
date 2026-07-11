#!/usr/bin/env python3
"""backlog_index.py - generate docs/BACKLOG.md from backlog folder state.

Usage:
    tools/backlog_index.py              # write docs/BACKLOG.md
    tools/backlog_index.py --print      # print rendered markdown
    tools/backlog_index.py --check      # fixture-only drift check; does not read docs/BACKLOG.md
    tools/backlog_index.py --repo-root <path> --print

The live docs/BACKLOG.md file is a generated view. Builders ship this generator
and tests; the strategist regenerates the tracked document after merge.
"""

from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import blocked  # noqa: E402

STAGE_ORDER = (
    ("proposed", "Proposed"),
    ("ready", "Ready"),
    ("claimed", "Claimed"),
    ("pending_review", "Pending Review"),
    ("complete", "Complete"),
)

GENERATED_PREAMBLE = """# BACKLOG

Auto-generated from `backlog/*/*.md` by `tools/backlog_index.py`.
Do not edit by hand.
"""


def esc(value: Any) -> str:
    text = "" if value is None else str(value)
    return text.replace("|", "\\|").replace("\n", " ").strip() or "-"


def item_title(path: Path) -> str:
    try:
        fm = blocked.parse_frontmatter(path.read_text(encoding="utf-8"))
    except Exception:
        return path.stem
    return str(fm.get("title") or path.stem).strip('"')


def item_estimate(path: Path) -> str:
    try:
        fm = blocked.parse_frontmatter(path.read_text(encoding="utf-8"))
    except Exception:
        return "-"
    return str(fm.get("estimate") or "-")


def stage_status(item: dict[str, Any], ready_by_id: dict[str, dict[str, Any]]) -> str:
    stage = item["stage"]
    if stage == "ready":
        ready = ready_by_id.get(item["id"], item)
        if ready.get("unblocked"):
            return "READY"
        return f"BLOCKED: {blocked.format_block_reasons(ready)}"
    return stage.upper()


def sort_key(item: dict[str, Any]) -> tuple[int, str, str]:
    return (
        blocked.PRIORITY_ORDER.get(item.get("priority"), 99),
        str(item.get("created", "9999-99-99")),
        str(item.get("id")),
    )


def render(repo_root: Path) -> str:
    items = blocked.load_items(repo_root)
    ready_by_id = {c["id"]: c for c in blocked.candidates(items)}
    by_stage: dict[str, list[dict[str, Any]]] = {stage: [] for stage, _ in STAGE_ORDER}
    for item in items.values():
        by_stage.setdefault(item["stage"], []).append(item)

    lines: list[str] = [GENERATED_PREAMBLE.rstrip(), ""]
    for stage, title in STAGE_ORDER:
        stage_items = sorted(by_stage.get(stage, []), key=sort_key)
        lines.append(f"## {title}")
        lines.append("")
        lines.append("| Status | Priority | Created | ID | Title | Estimate | Blocked By |")
        lines.append("|---|---|---|---|---|---|---|")
        if not stage_items:
            lines.append("| - | - | - | _(empty)_ | - | - | - |")
        else:
            for item in stage_items:
                path = Path(item["path"])
                path_rel = path.relative_to(repo_root)
                link = f"[{item['id']}](../{path_rel})"
                blocked_by = ", ".join(item.get("blocked_by", [])) or "-"
                lines.append(
                    "| "
                    + " | ".join(
                        [
                            esc(stage_status(item, ready_by_id)),
                            esc(item.get("priority", "MED")),
                            esc(item.get("created", "")),
                            link,
                            esc(item_title(path)),
                            esc(item_estimate(path)),
                            esc(blocked_by),
                        ]
                    )
                    + " |"
                )
        lines.append("")
    lines.extend(render_inbox(repo_root))
    return "\n".join(lines).rstrip() + "\n"


def render_inbox(repo_root: Path) -> list[str]:
    """Inbox is parked, non-kanban state: invisible to blocked.py selection by
    design, but the index must still show it so parked specs cannot rot unseen."""
    lines = [
        "## Inbox (parked)",
        "",
        "Parked specs gated on a non-item condition; not claimable, invisible to"
        " `tools/blocked.py`. Promotion is a manual `git mv` to `ready/` when the"
        " gate fires.",
        "",
        "| Status | Priority | Created | ID | Title | Estimate | Blocked By |",
        "|---|---|---|---|---|---|---|",
    ]
    inbox_dir = repo_root / "backlog" / "inbox"
    inbox_files = sorted(inbox_dir.glob("*.md")) if inbox_dir.is_dir() else []
    if not inbox_files:
        lines.append("| - | - | - | _(empty)_ | - | - | - |")
    else:
        for path in inbox_files:
            try:
                fm = blocked.parse_frontmatter(path.read_text(encoding="utf-8"))
            except Exception:
                fm = {}
            path_rel = path.relative_to(repo_root)
            item_id = str(fm.get("id") or path.stem)
            blocked_by = fm.get("blocked_by") or []
            if isinstance(blocked_by, list):
                blocked_by = ", ".join(str(b) for b in blocked_by)
            lines.append(
                "| "
                + " | ".join(
                    [
                        "PARKED",
                        esc(fm.get("priority", "MED")),
                        esc(fm.get("created", "")),
                        f"[{item_id}](../{path_rel})",
                        esc(item_title(path)),
                        esc(item_estimate(path)),
                        esc(blocked_by or "-"),
                    ]
                )
                + " |"
            )
    lines.append("")
    return lines


def write_item(repo: Path, stage: str, item_id: str, title: str, extra: str = "") -> Path:
    path = repo / "backlog" / stage / f"{item_id}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "\n".join(
            [
                "---",
                f"id: {item_id}",
                f'title: "{title}"',
                "priority: HIGH",
                "estimate: 1d",
                "created: 2026-06-03",
                "blocked_by: []",
                extra.rstrip(),
                "---",
                "",
                "# Fixture",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return path


def seal_ready(path: Path) -> None:
    digest = blocked.normalized_content_sha(path.read_text(encoding="utf-8"))
    text = path.read_text(encoding="utf-8")
    path.write_text(
        text.replace("---\n\n# Fixture", f"ready_content_sha: {digest}\n---\n\n# Fixture", 1),
        encoding="utf-8",
    )


def fixture_expected() -> str:
    return """# BACKLOG

Auto-generated from `backlog/*/*.md` by `tools/backlog_index.py`.
Do not edit by hand.

## Proposed

| Status | Priority | Created | ID | Title | Estimate | Blocked By |
|---|---|---|---|---|---|---|
| PROPOSED | HIGH | 2026-06-03 | [2026-06-03-001-proposed-item](../backlog/proposed/2026-06-03-001-proposed-item.md) | Proposed item | 1d | - |

## Ready

| Status | Priority | Created | ID | Title | Estimate | Blocked By |
|---|---|---|---|---|---|---|
| READY | HIGH | 2026-06-03 | [2026-06-03-002-ready-item](../backlog/ready/2026-06-03-002-ready-item.md) | Ready item | 1d | - |
| BLOCKED: missing-ready-content-sha | HIGH | 2026-06-03 | [2026-06-03-003-stale-ready](../backlog/ready/2026-06-03-003-stale-ready.md) | Stale ready | 1d | - |

## Claimed

| Status | Priority | Created | ID | Title | Estimate | Blocked By |
|---|---|---|---|---|---|---|
| - | - | - | _(empty)_ | - | - | - |

## Pending Review

| Status | Priority | Created | ID | Title | Estimate | Blocked By |
|---|---|---|---|---|---|---|
| - | - | - | _(empty)_ | - | - | - |

## Complete

| Status | Priority | Created | ID | Title | Estimate | Blocked By |
|---|---|---|---|---|---|---|
| - | - | - | _(empty)_ | - | - | - |

## Inbox (parked)

Parked specs gated on a non-item condition; not claimable, invisible to `tools/blocked.py`. Promotion is a manual `git mv` to `ready/` when the gate fires.

| Status | Priority | Created | ID | Title | Estimate | Blocked By |
|---|---|---|---|---|---|---|
| PARKED | HIGH | 2026-06-03 | [2026-06-03-004-parked-item](../backlog/inbox/2026-06-03-004-parked-item.md) | Parked item | 1d | - |
"""


def run_fixture_check() -> int:
    root = Path(tempfile.mkdtemp(prefix="backlog-index-check-"))
    try:
        (root / ".git").mkdir()
        for stage, _ in STAGE_ORDER:
            (root / "backlog" / stage).mkdir(parents=True, exist_ok=True)
        write_item(root, "proposed", "2026-06-03-001-proposed-item", "Proposed item")
        ready = write_item(root, "ready", "2026-06-03-002-ready-item", "Ready item")
        seal_ready(ready)
        write_item(root, "ready", "2026-06-03-003-stale-ready", "Stale ready")
        write_item(root, "inbox", "2026-06-03-004-parked-item", "Parked item")
        rendered = render(root)
        expected = fixture_expected()
        if rendered != expected:
            print("backlog_index.py fixture drift", file=sys.stderr)
            print("--- expected", file=sys.stderr)
            print(expected, file=sys.stderr)
            print("--- rendered", file=sys.stderr)
            print(rendered, file=sys.stderr)
            return 1
        print("backlog_index.py fixture check passed.")
        return 0
    finally:
        shutil.rmtree(root, ignore_errors=True)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=None)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--print", action="store_true", dest="print_only")
    args = ap.parse_args(argv[1:])

    if args.check:
        return run_fixture_check()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else Path(__file__).resolve().parent.parent
    rendered = render(repo_root)
    if args.print_only:
        print(rendered, end="")
        return 0
    out = repo_root / "docs" / "BACKLOG.md"
    out.write_text(rendered, encoding="utf-8")
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
