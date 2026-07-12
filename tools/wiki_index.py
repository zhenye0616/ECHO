#!/usr/bin/env python3
"""
wiki_index.py — generates wiki/index.md from wiki/.manifest.json.

Eliminates the prior hand-edited index that drifted from the manifest. The
manifest is the single source of truth; the index is a derived view.

Usage:
    tools/wiki_index.py            # write wiki/index.md (idempotent)
    tools/wiki_index.py --check    # exit 1 if wiki/index.md is stale; do not write

Exit codes:
    0  success (wrote index, or --check passed)
    1  --check found a difference between expected and on-disk index
    2  malformed manifest

The script groups entries by folder, then by topic within folder. Pages are
sorted alphabetically by title within each topic. Pages with status: planned
are tagged "(planned)" inline; shipped pages are unadorned.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
MANIFEST = REPO_ROOT / "wiki" / ".manifest.json"
INDEX = REPO_ROOT / "wiki" / "index.md"

FOLDER_ORDER = [
    "product",
    "principles",
    "architecture",
    "capture",
    "capture/per-app",
    "surfaces",
    "research",
    "operating-model",
]

FOLDER_TITLES = {
    "product": "Product — Strategic Decisions & Locked Scope",
    "principles": "Principles — Active Commitments & Disciplines",
    "architecture": "Architecture — The Durable Middle",
    "capture": "Capture — Layer 1 Surfaces (Substrate's Left Edge)",
    "capture/per-app": "Capture / Per-App — Field-Level Data References",
    "surfaces": "Surfaces — Layer 3 & Layer 5 (Substrate's Right Edge)",
    "research": "Research — Validation Work",
    "operating-model": "Operating Model — Process Meta",
}


def load_manifest() -> dict:
    try:
        with open(MANIFEST) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"manifest read failed: {e}", file=sys.stderr)
        sys.exit(2)


def render_index(manifest: dict) -> tuple[str, int]:
    entries = {
        k: v for k, v in manifest.items() if not k.startswith("_") and k != "$schema"
    }

    by_folder: dict[str, list[tuple[str, dict]]] = {f: [] for f in FOLDER_ORDER}
    for path, entry in entries.items():
        folder = "/".join(path.split("/")[:-1])
        if folder not in by_folder:
            print(f"manifest entry under unknown folder: {path}", file=sys.stderr)
            sys.exit(2)
        by_folder[folder].append((path, entry))

    for path, entry in entries.items():
        status = entry.get("status", "shipped")
        if status not in ("shipped", "planned"):
            print(
                f"invalid status '{status}' for {path}: expected shipped|planned"
                " (lifecycle is the separate axis)",
                file=sys.stderr,
            )
            sys.exit(2)
        lifecycle = entry.get("lifecycle", "active")
        if lifecycle not in ("active", "deferred", "retired"):
            print(
                f"invalid lifecycle '{lifecycle}' for {path}:"
                " expected active|deferred|retired",
                file=sys.stderr,
            )
            sys.exit(2)
        if lifecycle == "retired" and not entry.get("superseded_by"):
            print(
                f"lifecycle: retired without superseded_by for {path}",
                file=sys.stderr,
            )
            sys.exit(2)
        if lifecycle == "deferred" and not (
            entry.get("deferred_owner") and entry.get("deferred_trigger")
        ):
            print(
                f"lifecycle: deferred without both deferred_owner and"
                f" deferred_trigger for {path}",
                file=sys.stderr,
            )
            sys.exit(2)

    total = len(entries)
    shipped = sum(1 for _, e in entries.items() if e.get("status") == "shipped")
    planned = sum(1 for _, e in entries.items() if e.get("status") == "planned")
    retired = sum(
        1 for _, e in entries.items() if e.get("lifecycle") == "retired"
    )
    deferred = sum(
        1 for _, e in entries.items() if e.get("lifecycle") == "deferred"
    )

    lines: list[str] = []
    lines.append("# ECHO Wiki — Index")
    lines.append("")
    lines.append(
        "Auto-generated from `.manifest.json` by `tools/wiki_index.py`. "
        "Do not edit by hand."
    )
    lines.append("")
    status_line = f"**Status:** {total} pages · {shipped} shipped · {planned} planned"
    if deferred:
        status_line += f" · {deferred} deferred (parked commitments)"
    if retired:
        status_line += (
            f" · {retired} retired (historical; superseded, not current direction)"
        )
    lines.append(status_line)
    lines.append("")
    lines.append("---")
    lines.append("")

    for folder in FOLDER_ORDER:
        items = by_folder.get(folder, [])
        if not items:
            continue
        lines.append(f"## {FOLDER_TITLES[folder]}")
        lines.append("")

        by_topic: dict[str, list[tuple[str, dict]]] = {}
        for path, entry in items:
            topic = entry.get("topic", "Uncategorized")
            by_topic.setdefault(topic, []).append((path, entry))

        for topic in sorted(by_topic.keys()):
            lines.append(f"### {topic}")
            lines.append("")
            for path, entry in sorted(
                by_topic[topic], key=lambda pe: pe[1].get("title", pe[0])
            ):
                title = entry.get("title", path)
                link = entry.get(
                    "link", path.split("/")[-1].rsplit(".", 1)[0]
                )
                summary = entry.get("summary", "")
                status = entry.get("status", "shipped")
                tag = " *(planned)*" if status == "planned" else ""
                lifecycle = entry.get("lifecycle")
                if lifecycle == "retired":
                    tag = " *(retired — historical)*"
                elif lifecycle == "deferred":
                    tag = " *(deferred)*"
                lines.append(f"- [[{link}|{title}]]{tag} — {summary}")
            lines.append("")
        lines.append("---")
        lines.append("")

    while lines and lines[-1] in ("---", ""):
        lines.pop()
    lines.append("")

    return "\n".join(lines), total


def main() -> int:
    check_only = "--check" in sys.argv

    manifest = load_manifest()
    rendered, total = render_index(manifest)

    if check_only:
        on_disk = INDEX.read_text() if INDEX.exists() else ""
        if on_disk != rendered:
            print("wiki/index.md is stale relative to .manifest.json", file=sys.stderr)
            return 1
        print("wiki/index.md is up to date.")
        return 0

    INDEX.write_text(rendered)
    print(f"Wrote {INDEX} ({total} entries).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
