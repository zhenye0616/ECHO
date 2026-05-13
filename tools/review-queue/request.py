#!/usr/bin/env python3
"""request.py — write a new backlog/reviews/<item_id>/r<N>/request.md.

Usage:
    request.py <item_id> <round> [--class={narrow,structural-reform}]
               [--reviewers=codex,cursor] [--focus-hints=<str>]
               [--spec-sha=<sha>]            # override HEAD; for tests
               [--repo-root=<path>]          # override REPO_ROOT; for tests
               [--artifact-path=<path>]      # override discovered location

Race-loser semantics (§AC2):
    If r<N>/request.md already exists, read it and compare spec_commit_sha.
        - Same SHA → idempotent no-op; exit 0.
        - Different SHA → "round already exists at different SHA"; exit 2.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402
import _reviewers  # noqa: E402

VALID_CLASSES = ("narrow", "structural-reform")


def _valid_reviewers() -> tuple[str, ...]:
    """043 AC2: sourced from reviewers.json via _reviewers.py (no longer a module
    constant). reviewer.schema.json's enum is the schema-side gate; this is the
    request-time gate."""
    return tuple(r.name for r in _reviewers.load_reviewers())


def find_artifact(item_id: str, repo_root: Path) -> Path:
    for stage in ("ready", "claimed", "pending_review", "complete"):
        candidate = repo_root / "backlog" / stage / f"{item_id}.md"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"no backlog item file for {item_id}")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("item_id")
    ap.add_argument("round", type=int)
    ap.add_argument("--class", dest="cls", default="narrow", choices=VALID_CLASSES)
    ap.add_argument("--reviewers", default="codex,cursor")
    ap.add_argument("--focus-hints", default=None)
    ap.add_argument("--spec-sha", default=None)
    ap.add_argument("--repo-root", default=None)
    ap.add_argument("--artifact-path", default=None)
    args = ap.parse_args(argv[1:])

    repo_root = Path(args.repo_root).resolve() if args.repo_root else _lib.REPO_ROOT
    reviewers = [r.strip() for r in args.reviewers.split(",") if r.strip()]
    valid = _valid_reviewers()
    for rev in reviewers:
        if rev not in valid:
            print(
                f"reviewer `{rev}` not in current reviewers.json roster "
                f"({', '.join(valid)}); add it to reviewers.json + extend the "
                f"reviewer.schema.json + request.schema.json enums first.",
                file=sys.stderr,
            )
            return 2
    if not reviewers:
        print("--reviewers must be non-empty", file=sys.stderr)
        return 2

    try:
        artifact = (
            Path(args.artifact_path)
            if args.artifact_path
            else find_artifact(args.item_id, repo_root)
        )
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    artifact_rel = (
        Path(args.artifact_path)
        if args.artifact_path
        else artifact.relative_to(repo_root)
    )

    sha = args.spec_sha if args.spec_sha else _lib.head_sha(repo_root)

    review_dir = repo_root / "backlog" / "reviews" / args.item_id / f"r{args.round}"
    review_dir.mkdir(parents=True, exist_ok=True)
    final = review_dir / "request.md"

    fm: dict[str, object] = {
        "item_id": args.item_id,
        "round": args.round,
        "spec_commit_sha": sha,
        "artifact_path": str(artifact_rel),
        "class": args.cls,
        "requested_at": _lib.iso_utc_now(),
        "requested_reviewers": reviewers,
    }
    if args.focus_hints:
        fm["focus_hints"] = args.focus_hints

    body = (
        "\n# What to review\n\n"
        f"Read `{artifact_rel}` at commit `{sha}`. Apply the canonical reviewer\n"
        "loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any\n"
        "prior-round context inline below; do not rely on out-of-band atom\n"
        "lookups for the review itself.\n"
    )
    content = _lib.serialize_frontmatter(fm, body)

    result = _lib.atomic_link_write(final, content)
    if result == "ok":
        _lib.validate_frontmatter(fm, "request")
        print(str(final))
        return 0

    # race_lost: read existing file and compare spec_commit_sha
    try:
        existing_fm, _ = _lib.parse_frontmatter(final)
    except ValueError as exc:
        print(f"race-loser: cannot parse existing {final}: {exc}", file=sys.stderr)
        return 2

    existing_sha = existing_fm.get("spec_commit_sha")
    if existing_sha == sha:
        # Same-SHA idempotency — genuine no-op.
        print(str(final))
        return 0

    print(
        f"round {args.round} already exists at different SHA "
        f"(existing={existing_sha}, requested={sha}) — "
        f"bump round number or fix history",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
