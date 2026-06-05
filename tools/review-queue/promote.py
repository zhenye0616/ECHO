#!/usr/bin/env python3
"""promote.py - proposed/ to ready/ promotion and stale-ready bounce helper.

The helper has two explicit effect boundaries:

  stage-only   verify + mutate the worktree/index; caller commits the result
  commit-push  verify + mutate + commit + push + remote-boundary check

Promotion is only valid for terminal-promotable review rounds: no unresolved
disposition placeholders, no founder escalation, next_round is null, the body
contains a claim-ready convergence call, and no next request exists.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import blocked  # noqa: E402

VALID_MODES = ("stage-only", "commit-push")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")


class Refusal(Exception):
    pass


def repo_root_from_args(value: str | None) -> Path:
    if value:
        return Path(value).resolve()
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        check=True,
        capture_output=True,
        text=True,
    )
    return Path(out.stdout.strip()).resolve()


def run_git(repo_root: Path, args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=repo_root,
        check=check,
        capture_output=True,
        text=True,
    )


def split_frontmatter_text(text: str) -> tuple[str, str]:
    if not text.startswith("---\n"):
        raise Refusal("artifact has no frontmatter")
    end = text.find("\n---\n", 4)
    if end == -1:
        raise Refusal("artifact frontmatter is not terminated")
    return text[4:end], text[end + len("\n---\n") :]


def set_frontmatter_scalar(text: str, key: str, value: str) -> str:
    head, body = split_frontmatter_text(text)
    lines = head.split("\n")
    replacement = f"{key}: {value}"
    for idx, line in enumerate(lines):
        if re.match(rf"^{re.escape(key)}:\s*", line):
            lines[idx] = replacement
            break
    else:
        insert_at = len(lines)
        for idx, line in enumerate(lines):
            if re.match(r"^(spec_review_sha|requested_reviewers):\s*", line):
                insert_at = idx + 1
        lines.insert(insert_at, replacement)
    return "---\n" + "\n".join(lines).rstrip() + "\n---\n" + body


def remove_frontmatter_key(text: str, key: str) -> str:
    head, body = split_frontmatter_text(text)
    lines = [line for line in head.split("\n") if not re.match(rf"^{re.escape(key)}:\s*", line)]
    return "---\n" + "\n".join(lines).rstrip() + "\n---\n" + body


def rel(path: Path, repo_root: Path) -> str:
    return str(path.relative_to(repo_root))


def append_queue_error(repo_root: Path, context: str, detail: str = "") -> None:
    path = repo_root / "raw" / "internal" / "queue-errors.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    line = f"{_lib.iso_utc_now()} {context}"
    if detail:
        line += f": {detail}"
    path.open("a", encoding="utf-8").write(line + "\n")


def git_show(repo_root: Path, ref: str, artifact_path: str) -> str:
    proc = run_git(repo_root, ["show", f"{ref}:{artifact_path}"], check=False)
    if proc.returncode != 0:
        raise Refusal(f"cannot read reviewed artifact {artifact_path} at {ref}: {proc.stderr.strip()}")
    return proc.stdout


def request_for_round(repo_root: Path, item_id: str, round_n: int) -> tuple[dict[str, Any], str]:
    path = repo_root / "backlog" / "reviews" / item_id / f"r{round_n}" / "request.md"
    if not path.is_file():
        raise Refusal(f"missing request: {path}")
    fm, _ = _lib.parse_frontmatter(path)
    artifact_path = fm.get("artifact_path")
    spec_commit_sha = fm.get("spec_commit_sha")
    if not isinstance(artifact_path, str) or not artifact_path:
        raise Refusal(f"{path}: missing artifact_path")
    if not isinstance(spec_commit_sha, str) or not spec_commit_sha:
        raise Refusal(f"{path}: missing spec_commit_sha")
    return fm, artifact_path


def terminal_promotable(repo_root: Path, item_id: str, round_n: int) -> tuple[bool, str | None]:
    combined = repo_root / "backlog" / "reviews" / item_id / f"r{round_n}" / "combined.md"
    if not combined.is_file():
        return False, f"missing combined.md for r{round_n}"
    fm, body = _lib.parse_frontmatter(combined)
    if fm.get("escalated_to_founder") is not False:
        return False, "combined.md escalated_to_founder is not false"
    if fm.get("next_round") is not None:
        return False, f"combined.md next_round is {fm.get('next_round')!r}"
    if "_strategist fills_" in body:
        return False, "combined.md still has unresolved strategist placeholders"
    if not re.search(rf"\bclaim-ready after R{round_n}\b", body, re.IGNORECASE):
        return False, f"combined.md lacks claim-ready after R{round_n} convergence marker"
    next_request = repo_root / "backlog" / "reviews" / item_id / f"r{round_n + 1}" / "request.md"
    if next_request.exists():
        return False, f"r{round_n + 1}/request.md already exists"
    return True, None


def ready_seal_status(path: Path) -> tuple[bool, str | None]:
    text = path.read_text(encoding="utf-8")
    fm = blocked.parse_frontmatter(text)
    ready_sha = fm.get("ready_content_sha")
    if ready_sha is None:
        return False, "missing-ready-content-sha"
    if not isinstance(ready_sha, str) or not SHA_RE.match(ready_sha):
        return False, "malformed-ready-content-sha"
    actual = blocked.normalized_content_sha(text)
    if ready_sha != actual:
        return False, "ready-content-sha-mismatch"
    return True, None


def remote_has(repo_root: Path, path_rel: str) -> bool:
    run_git(repo_root, ["fetch", "--quiet", "origin", "main"], check=False)
    proc = run_git(repo_root, ["cat-file", "-e", f"origin/main:{path_rel}"], check=False)
    return proc.returncode == 0


def commit_push(repo_root: Path, message: str, boundary_rel: str) -> None:
    if run_git(repo_root, ["diff", "--cached", "--quiet"], check=False).returncode == 0:
        print("no staged changes to commit")
        return
    run_git(repo_root, ["commit", "-m", message])
    helper = Path(__file__).resolve().parent / "push-with-retry.sh"
    proc = subprocess.run(
        [str(helper), message],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if proc.stdout:
        sys.stdout.write(proc.stdout)
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    if proc.returncode != 0:
        raise Refusal(f"push-with-retry.sh failed with exit {proc.returncode}")
    if not remote_has(repo_root, boundary_rel):
        raise Refusal(f"push reported success but origin/main:{boundary_rel} is not visible")


def promote_item(repo_root: Path, item_id: str, round_n: int, mode: str) -> str:
    proposed = repo_root / "backlog" / "proposed" / f"{item_id}.md"
    ready = repo_root / "backlog" / "ready" / f"{item_id}.md"
    ready.parent.mkdir(parents=True, exist_ok=True)

    if ready.is_file() and not proposed.exists():
        ok, reason = ready_seal_status(ready)
        if ok:
            return f"already ready: {rel(ready, repo_root)}"
        raise Refusal(f"ready item exists but seal is invalid: {reason}")
    if not proposed.is_file():
        raise Refusal(f"missing proposed item: {rel(proposed, repo_root)}")

    ok, reason = terminal_promotable(repo_root, item_id, round_n)
    if not ok:
        raise Refusal(f"not terminal-promotable: {reason}")

    req_fm, artifact_path = request_for_round(repo_root, item_id, round_n)
    if Path(artifact_path).parts[:2] != ("backlog", "proposed"):
        raise Refusal(f"request artifact is not proposed-stage: {artifact_path}")
    if artifact_path != rel(proposed, repo_root):
        raise Refusal(f"request artifact {artifact_path} does not match current proposed path")

    reviewed = git_show(repo_root, str(req_fm["spec_commit_sha"]), artifact_path)
    current = proposed.read_text(encoding="utf-8")
    reviewed_sha = blocked.normalized_content_sha(reviewed)
    current_sha = blocked.normalized_content_sha(current)
    if reviewed_sha != current_sha:
        append_queue_error(
            repo_root,
            "PROMOTE_CONTENT_IDENTITY_MISMATCH",
            f"{item_id} r{round_n} reviewed={reviewed_sha} current={current_sha}",
        )
        raise Refusal("current proposed content differs from terminal request.spec_commit_sha")

    stamped = set_frontmatter_scalar(current, "ready_content_sha", current_sha)
    proposed.write_text(stamped, encoding="utf-8")
    run_git(repo_root, ["mv", rel(proposed, repo_root), rel(ready, repo_root)])

    if mode == "commit-push":
        run_git(repo_root, ["add", rel(ready, repo_root)])
        commit_push(repo_root, f"promote: {item_id}", rel(ready, repo_root))
    return f"promoted: {rel(ready, repo_root)}"


def bounce_item(repo_root: Path, item_id: str, mode: str) -> str:
    ready = repo_root / "backlog" / "ready" / f"{item_id}.md"
    proposed = repo_root / "backlog" / "proposed" / f"{item_id}.md"
    proposed.parent.mkdir(parents=True, exist_ok=True)

    if proposed.is_file() and not ready.exists():
        return f"already proposed: {rel(proposed, repo_root)}"
    if not ready.is_file():
        raise Refusal(f"missing ready item: {rel(ready, repo_root)}")

    ok, reason = ready_seal_status(ready)
    if ok:
        return f"ready seal valid: {rel(ready, repo_root)}"

    text = remove_frontmatter_key(ready.read_text(encoding="utf-8"), "ready_content_sha")
    ready.write_text(text, encoding="utf-8")
    run_git(repo_root, ["mv", rel(ready, repo_root), rel(proposed, repo_root)])
    append_queue_error(repo_root, "STALE_READY_BOUNCED", f"{item_id} reason={reason}")

    if mode == "commit-push":
        run_git(repo_root, ["add", rel(proposed, repo_root), "raw/internal/queue-errors.md"])
        commit_push(repo_root, f"bounce: {item_id}", rel(proposed, repo_root))
    return f"bounced: {rel(proposed, repo_root)} reason={reason}"


def recover_promotions(repo_root: Path, mode: str) -> str:
    reviews = repo_root / "backlog" / "reviews"
    if not reviews.exists():
        return "no reviews directory"
    for combined in sorted(reviews.glob("*/r*/combined.md")):
        item_id = combined.parents[1].name
        round_name = combined.parent.name
        if not re.match(r"^r\d+$", round_name):
            continue
        round_n = int(round_name[1:])
        proposed = repo_root / "backlog" / "proposed" / f"{item_id}.md"
        if not proposed.is_file():
            continue
        ok, _ = terminal_promotable(repo_root, item_id, round_n)
        if ok:
            return promote_item(repo_root, item_id, round_n, mode)
    return "no terminal-promotable proposed items"


def bounce_stale_ready(repo_root: Path, mode: str) -> str:
    ready_dir = repo_root / "backlog" / "ready"
    if not ready_dir.exists():
        return "no ready directory"
    for path in sorted(ready_dir.glob("*.md")):
        ok, _ = ready_seal_status(path)
        if not ok:
            return bounce_item(repo_root, path.stem, mode)
    return "no stale ready items"


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=None)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add_repo_arg(parser: argparse.ArgumentParser) -> None:
        parser.add_argument("--repo-root", default=argparse.SUPPRESS)

    promote = sub.add_parser("promote")
    add_repo_arg(promote)
    promote.add_argument("item_id")
    promote.add_argument("--round", type=int, required=True)
    promote.add_argument("--mode", choices=VALID_MODES, required=True)

    recover = sub.add_parser("recover")
    add_repo_arg(recover)
    recover.add_argument("--mode", choices=VALID_MODES, default="commit-push")

    bounce = sub.add_parser("bounce")
    add_repo_arg(bounce)
    bounce.add_argument("item_id")
    bounce.add_argument("--mode", choices=VALID_MODES, required=True)

    bounce_all = sub.add_parser("bounce-stale-ready")
    add_repo_arg(bounce_all)
    bounce_all.add_argument("--mode", choices=VALID_MODES, default="commit-push")

    args = ap.parse_args(argv[1:])
    repo_root = repo_root_from_args(args.repo_root)
    try:
        if args.cmd == "promote":
            print(promote_item(repo_root, args.item_id, args.round, args.mode))
        elif args.cmd == "recover":
            print(recover_promotions(repo_root, args.mode))
        elif args.cmd == "bounce":
            print(bounce_item(repo_root, args.item_id, args.mode))
        elif args.cmd == "bounce-stale-ready":
            print(bounce_stale_ready(repo_root, args.mode))
        else:
            raise Refusal(f"unknown command: {args.cmd}")
    except (OSError, subprocess.CalledProcessError, Refusal, ValueError) as exc:
        print(f"PROMOTE REFUSED: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
