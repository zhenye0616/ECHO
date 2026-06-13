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
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402
import _reviewers  # noqa: E402

VALID_CLASSES = ("narrow", "structural-reform")
DEFAULT_PROJECT_CONFIG = {
    "coord_ref": "main",
    "reviews_root": "backlog/reviews",
    "reviewers": ["codex", "cursor"],
    "spec_dir": "backlog",
}


def _valid_reviewers() -> tuple[str, ...]:
    """043 AC2: sourced from reviewers.json via _reviewers.py (no longer a module
    constant). reviewer.schema.json's enum is the schema-side gate; this is the
    request-time gate."""
    return tuple(r.name for r in _reviewers.load_reviewers())


def load_project_config(repo_root: Path) -> dict[str, object]:
    cfg_path = repo_root / ".echo" / "project.json"
    if not cfg_path.is_file():
        return dict(DEFAULT_PROJECT_CONFIG)
    try:
        raw = json.loads(cfg_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"{cfg_path}: invalid JSON: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError(f"{cfg_path}: top-level object required")
    cfg = dict(DEFAULT_PROJECT_CONFIG)
    cfg.update(raw)
    for key in ("coord_ref", "reviews_root", "spec_dir"):
        if not isinstance(cfg.get(key), str) or not str(cfg[key]).strip():
            raise ValueError(f"{cfg_path}: {key} must be a non-empty string")
    reviewers = cfg.get("reviewers")
    if (
        not isinstance(reviewers, list)
        or not reviewers
        or not all(isinstance(r, str) and r for r in reviewers)
    ):
        raise ValueError(f"{cfg_path}: reviewers must be a non-empty string array")
    return cfg


def _safe_rel(value: str, label: str) -> Path:
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"{label} must be a project-relative path")
    return path


def find_artifact(item_id: str, repo_root: Path, spec_dir: str = "backlog") -> Path:
    spec_root = repo_root / _safe_rel(spec_dir, "spec_dir")
    for stage in ("proposed", "ready", "claimed", "pending_review", "complete"):
        candidate = spec_root / stage / f"{item_id}.md"
        if candidate.is_file():
            return candidate
    direct = spec_root / f"{item_id}.md"
    if direct.is_file():
        return direct
    raise FileNotFoundError(f"no backlog item file for {item_id}")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("item_id")
    ap.add_argument("round", type=int)
    ap.add_argument("--class", dest="cls", default="narrow", choices=VALID_CLASSES)
    ap.add_argument("--reviewers", default=None)
    ap.add_argument("--focus-hints", default=None)
    ap.add_argument("--spec-sha", default=None)
    ap.add_argument("--repo-root", default=None)
    ap.add_argument("--artifact-path", default=None)
    ap.add_argument("--reviews-root", default=None)
    args = ap.parse_args(argv[1:])

    repo_root = Path(args.repo_root).resolve() if args.repo_root else _lib.REPO_ROOT
    try:
        project_config = load_project_config(repo_root)
        reviews_root = _safe_rel(
            args.reviews_root
            if args.reviews_root is not None
            else str(project_config["reviews_root"]),
            "--reviews-root",
        )
        default_reviewers = ",".join(str(r) for r in project_config["reviewers"])
        reviewers_arg = args.reviewers if args.reviewers is not None else default_reviewers
        reviewers = [r.strip() for r in reviewers_arg.split(",") if r.strip()]
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    valid = _valid_reviewers()
    for rev in reviewers:
        if rev not in valid:
            print(
                f"reviewer `{rev}` not in current enum {{{', '.join(valid)}}}; "
                f"extend the schema first (reviewers.json + reviewer.schema.json "
                f"+ request.schema.json enums).",
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
            else find_artifact(args.item_id, repo_root, str(project_config["spec_dir"]))
        )
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    artifact_rel = (
        Path(args.artifact_path).resolve().relative_to(repo_root)
        if args.artifact_path and Path(args.artifact_path).is_absolute()
        else Path(args.artifact_path)
        if args.artifact_path
        else artifact.relative_to(repo_root)
    )

    sha = args.spec_sha if args.spec_sha else _lib.head_sha(repo_root)

    review_dir = repo_root / reviews_root / args.item_id / f"r{args.round}"
    review_dir.mkdir(parents=True, exist_ok=True)
    final = review_dir / "request.md"

    # 057b AC7 — canonical uuid4. str(uuid.uuid4()) renders as 36 chars with
    # dashes and version-4 nibble + [89ab] variant byte by construction, so
    # it matches both request.schema.json's `correlation_id` pattern and the
    # `coord_invoke` validator regex with no further normalization.
    # request.py has zero MCP responsibility — it only writes the field; the
    # watcher reads it for coord_invoke, and the launchd-fallback wrapper
    # reads it for Phase 2 tick_start emission.
    correlation_id = str(uuid.uuid4())

    fm: dict[str, object] = {
        "item_id": args.item_id,
        "round": args.round,
        "spec_commit_sha": sha,
        "artifact_path": str(artifact_rel),
        "class": args.cls,
        "requested_at": _lib.iso_utc_now(),
        "requested_reviewers": reviewers,
        "correlation_id": correlation_id,
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
