#!/usr/bin/env python3
"""combine.py — strategist watcher combine helper.

Polls backlog/reviews/<item_id>/r<N>/ directories for rounds eligible to
combine, then writes combined.md per the verdict roll-up + convergent-on-
primary-where-section logic specced in
backlog/ready/2026-05-11-039-cross-tool-review-dispatch-queue.md AC4.

Usage:
    combine.py [--repo-root=<path>] [--timeout-hours=<float>] [--all]
               [--no-git] [--now=<iso>]                # test hooks

Default mode: process at most one newly-eligible round per invocation
(watcher-driven one-round-per-tick). `--all` processes every eligible
round in one pass (out-of-band batch mode).

Exit codes:
    0  success — combined.md(s) written, or no rounds to combine
    1  unexpected error
"""

from __future__ import annotations

import argparse
import datetime as _dt
import re
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _lib  # noqa: E402

ORPHAN_TMP_AGE_SEC = 30 * 60  # 30 min
DEFAULT_TIMEOUT_HOURS = 2.0

REVIEWERS = ("codex", "cursor")
SECTION_RE = re.compile(r"§[^,;+]+")


# ---------------- helpers ----------------


def parse_iso_utc(s: str) -> _dt.datetime:
    return _dt.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=_dt.timezone.utc)


def normalize_where(where: str) -> tuple[str, list[str]]:
    """Split a finding's `where` into (primary_where_section, related_where_sections).

    The primary is the first `§...` substring; the rest are related. Each
    section token is the literal `§...` text up to the next `,`, `;`, or
    `+` separator, stripped of surrounding whitespace. If there is no `§`
    in the string, the entire string becomes the primary (no §-prefix
    quoting; useful for cross-tool free-form citations).
    """
    matches = [m.strip() for m in SECTION_RE.findall(where)]
    if not matches:
        primary = where.strip()
        return primary, []
    primary = matches[0]
    related = [m for m in matches[1:]]
    return primary, related


def cross_refs_match(a: dict[str, Any], a_round: int, a_reviewer: str,
                     b: dict[str, Any], b_round: int, b_reviewer: str) -> bool:
    """Return True iff either finding explicitly cross-refs the other.

    A.cross_ref pointing to B counts even when round/reviewer disagree —
    cross_ref is the canonical override per §AC4 combine logic.
    """
    a_cr = a.get("cross_ref")
    if isinstance(a_cr, dict) and a_cr.get("reviewer") == b_reviewer and a_cr.get("round") == b_round:
        # finding_index is 1-indexed in cross_ref; we don't have indexes here
        # but the reviewer+round match is the strong signal.
        return True
    b_cr = b.get("cross_ref")
    if isinstance(b_cr, dict) and b_cr.get("reviewer") == a_reviewer and b_cr.get("round") == a_round:
        return True
    return False


def compute_combined_verdict(codex_v: str | None, cursor_v: str | None) -> tuple[str, bool]:
    """Apply the §AC4 verdict roll-up table.

    Returns (combined_verdict, escalated_to_founder).
    """
    PROCEED_STAR = {"proceed", "proceed_after_patches"}
    if codex_v is None and cursor_v is None:
        return "no_responses", True
    if codex_v is None or cursor_v is None:
        return "single_reviewer_timeout", True
    if codex_v == cursor_v:
        return codex_v, False
    pair = {codex_v, cursor_v}
    if pair <= PROCEED_STAR:
        # proceed + proceed_after_patches → proceed_after_patches
        return "proceed_after_patches", False
    if pair == {"pushback", "pushback"}:
        return "pushback", False
    # one in PROCEED_STAR, the other pushback → divergent
    if "pushback" in pair and pair & PROCEED_STAR:
        return "divergent", True
    return "divergent", True  # safety net


def cleanup_orphans(round_dir: Path, now_ts: float) -> list[str]:
    """Remove `.tmp.*` orphans older than ORPHAN_TMP_AGE_SEC. Return removed paths."""
    removed: list[str] = []
    for tmp in round_dir.iterdir():
        if not tmp.is_file():
            continue
        name = tmp.name
        # match <reviewer>.md.<uuid>.tmp shape
        if not re.match(r"^(codex|cursor|combined|request)\.md\.[0-9a-f]+\.tmp$", name):
            continue
        try:
            age = now_ts - tmp.stat().st_mtime
        except FileNotFoundError:
            continue
        if age >= ORPHAN_TMP_AGE_SEC:
            try:
                tmp.unlink()
                removed.append(str(tmp))
            except FileNotFoundError:
                pass
    return removed


# ---------------- round eligibility ----------------


def find_eligible_rounds(repo_root: Path, timeout_hours: float, now: _dt.datetime) -> list[Path]:
    """Return a list of round dirs eligible to combine.

    A round is eligible iff combined.md does NOT exist AND either:
      (a) both codex.md and cursor.md exist, OR
      (b) request.requested_at is older than timeout_hours (timeout path).
    """
    out: list[Path] = []
    reviews = repo_root / "backlog" / "reviews"
    if not reviews.is_dir():
        return out
    for item_dir in sorted(reviews.iterdir()):
        if not item_dir.is_dir():
            continue
        for round_dir in sorted(item_dir.iterdir()):
            if not round_dir.is_dir() or not re.match(r"^r\d+$", round_dir.name):
                continue
            combined = round_dir / "combined.md"
            if combined.exists():
                continue
            request = round_dir / "request.md"
            if not request.exists():
                continue
            codex = round_dir / "codex.md"
            cursor = round_dir / "cursor.md"
            if codex.exists() and cursor.exists():
                out.append(round_dir)
                continue
            # timeout path
            try:
                fm, _ = _lib.parse_frontmatter(request)
                requested_at = parse_iso_utc(fm["requested_at"])
            except (ValueError, KeyError):
                continue
            elapsed = (now - requested_at).total_seconds()
            if elapsed >= timeout_hours * 3600:
                out.append(round_dir)
    return out


# ---------------- combine ----------------


def read_response(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    fm, _body = _lib.parse_frontmatter(path)
    findings = fm.get("findings", []) or []
    return fm, findings


def _one_line(s: str) -> str:
    return " ".join(s.split())


def build_malformed_combined(
    round_dir: Path,
    repo_root: Path,
    now: _dt.datetime,
    malformed: list[tuple[Path, str]],
) -> dict[str, Any]:
    """Emit the malformed-reviewer-response escalation combined.md (AC2).

    `malformed` is a list of (path, parse_error_str) tuples in stable
    iteration order (codex first per the reviewers enum order).
    Repo-root-relative paths are surfaced in frontmatter + body.
    """
    request_fm, _ = _lib.parse_frontmatter(round_dir / "request.md")
    item_id = request_fm["item_id"]
    rnd = request_fm["round"]

    # Repo-root-relative paths per AC2 builder note.
    rel_paths: list[str] = []
    for p, _err in malformed:
        rel_paths.append(str(p.resolve().relative_to(repo_root.resolve()).as_posix()))
    errors: list[str] = [_one_line(e) for _p, e in malformed]

    codex_path = round_dir / "codex.md"
    cursor_path = round_dir / "cursor.md"

    if len(malformed) == 1:
        offending: Any = rel_paths[0]
        parse_err: Any = errors[0]
    else:
        offending = rel_paths
        parse_err = errors

    fm_out: dict[str, Any] = {
        "item_id": item_id,
        "round": rnd,
        "combined_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "codex_response": "codex.md" if codex_path.exists() else None,
        "cursor_response": "cursor.md" if cursor_path.exists() else None,
        "patch_commit_sha": None,
        "next_round": None,
        "combined_verdict": "malformed_reviewer_response",
        "escalated_to_founder": True,
        "offending_response": offending,
        "parse_error": parse_err,
    }

    body_lines: list[str] = [
        "\n# Combined findings\n",
        "**Malformed reviewer response** — one or more reviewer-response files "
        "failed YAML parse and could not be combined this round. Reviewer must "
        "regenerate. Strategist + founder: see `raw/internal/queue-errors.md` "
        "for the full incident log and the regeneration handshake.\n",
    ]
    for rel, err in zip(rel_paths, errors):
        body_lines.append(f"- `{rel}` failed YAML parse with: `{err}`")
    body_lines.append("")
    body = "\n".join(body_lines) + "\n"

    return {
        "frontmatter": fm_out,
        "body": body,
        "malformed_responses": list(zip(rel_paths, errors)),
        "item_id": item_id,
        "round": rnd,
    }


def build_combined(
    round_dir: Path,
    now: _dt.datetime,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Compute frontmatter + body for combined.md for this round.

    Body is a single markdown document with: convergent table, divergent
    table, and a placeholder "Disposition" column (strategist fills in
    inline per AC3.5 step 3).

    If any reviewer-response file is unparseable (YAML error → typed
    ValueError after AC1's _lib wrap), emit a malformed-reviewer-response
    escalation combined.md per AC2 instead. Both codex.md and cursor.md are
    attempted before emission so a doubly-malformed round produces one
    combined.md naming both offenders.
    """
    request_fm, _ = _lib.parse_frontmatter(round_dir / "request.md")
    item_id = request_fm["item_id"]
    rnd = request_fm["round"]

    codex_path = round_dir / "codex.md"
    cursor_path = round_dir / "cursor.md"

    # Phase 1: collect parse failures across both reviewers (stable order).
    malformed: list[tuple[Path, str]] = []
    codex_fm: dict[str, Any] | None = None
    cursor_fm: dict[str, Any] | None = None
    codex_findings: list[dict[str, Any]] = []
    cursor_findings: list[dict[str, Any]] = []

    if codex_path.exists():
        try:
            codex_fm, codex_findings = read_response(codex_path)
        except ValueError as exc:
            malformed.append((codex_path, str(exc)))
    if cursor_path.exists():
        try:
            cursor_fm, cursor_findings = read_response(cursor_path)
        except ValueError as exc:
            malformed.append((cursor_path, str(exc)))

    # Phase 2 (escalation branch): any malformed → terminal combined.md.
    if malformed:
        root = repo_root if repo_root is not None else _lib.REPO_ROOT
        return build_malformed_combined(round_dir, root, now, malformed)

    codex_verdict = codex_fm["verdict"] if codex_fm else None
    cursor_verdict = cursor_fm["verdict"] if cursor_fm else None
    combined_verdict, escalated = compute_combined_verdict(codex_verdict, cursor_verdict)

    # Build match table: convergent vs. divergent.
    convergent: list[tuple[dict[str, Any], dict[str, Any]]] = []
    consumed_cursor: set[int] = set()
    divergent_codex: list[dict[str, Any]] = []
    for cf in codex_findings:
        cp, _ = normalize_where(cf["where"])
        matched_idx: int | None = None
        for j, uf in enumerate(cursor_findings):
            if j in consumed_cursor:
                continue
            up, _ = normalize_where(uf["where"])
            if cp == up:
                matched_idx = j
                break
            if cross_refs_match(cf, rnd, "codex", uf, rnd, "cursor"):
                matched_idx = j
                break
        if matched_idx is not None:
            convergent.append((cf, cursor_findings[matched_idx]))
            consumed_cursor.add(matched_idx)
        else:
            divergent_codex.append(cf)
    divergent_cursor = [
        uf for j, uf in enumerate(cursor_findings) if j not in consumed_cursor
    ]

    fm_out: dict[str, Any] = {
        "item_id": item_id,
        "round": rnd,
        "combined_at": _lib.iso_utc_now() if not now else now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "codex_response": "codex.md" if codex_fm else None,
        "cursor_response": "cursor.md" if cursor_fm else None,
        "patch_commit_sha": None,
        "next_round": None,
        "combined_verdict": combined_verdict,
        "escalated_to_founder": escalated,
    }

    body_lines: list[str] = ["\n# Combined findings\n"]
    if escalated and combined_verdict == "single_reviewer_timeout":
        missing = "codex" if codex_fm is None else "cursor"
        body_lines.append(
            f"**Single-reviewer timeout** — `{missing}.md` is missing past the "
            f"timeout. Strategist must escalate to founder per §AC4 verdict roll-up.\n"
        )
    if escalated and combined_verdict == "no_responses":
        body_lines.append(
            "**No-responses timeout** — both reviewers silent past the timeout. "
            "Strategist must escalate to founder per §AC4 verdict roll-up.\n"
        )
    if escalated and combined_verdict == "divergent":
        body_lines.append(
            f"**Divergent verdicts** — codex={codex_verdict!r} cursor={cursor_verdict!r} "
            f"cross the `{{proceed*, pushback}}` boundary; founder escalation per §Out of Scope #7.\n"
        )

    body_lines.append("\n## Convergent findings\n")
    body_lines.append("| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |")
    body_lines.append("|---|---|---|---|---|---|")
    for i, (cf, uf) in enumerate(convergent, start=1):
        primary, _ = normalize_where(cf["where"])
        sev = max(cf["severity"], uf["severity"], key=lambda s: {"high": 3, "medium": 2, "low": 1, "nit": 0}[s])
        body_lines.append(
            f"| {i} | {sev.upper()} | both (convergent on `{primary}`) | "
            f"{primary} | _strategist fills_ | _strategist fills_ |"
        )

    body_lines.append("\n## Divergent findings (single-reviewer or non-overlapping primary `where`)\n")
    body_lines.append("| # | Severity | Source | Where | Disposition | Patch SHA / rationale |")
    body_lines.append("|---|---|---|---|---|---|")
    n = 1
    for cf in divergent_codex:
        primary, _ = normalize_where(cf["where"])
        body_lines.append(
            f"| {n} | {cf['severity'].upper()} | codex | {primary} | "
            f"_strategist fills_ | _strategist fills_ |"
        )
        n += 1
    for uf in divergent_cursor:
        primary, _ = normalize_where(uf["where"])
        body_lines.append(
            f"| {n} | {uf['severity'].upper()} | cursor | {primary} | "
            f"_strategist fills_ | _strategist fills_ |"
        )
        n += 1

    body_lines.append("\n## Convergence call\n")
    body_lines.append(
        "_Strategist writes after dispositioning (AC3.5 step 3): "
        "`claim-ready after R<N>` OR `needs R<N+1> — focus_hints: ...`._\n"
    )

    body = "\n".join(body_lines) + "\n"
    return {"frontmatter": fm_out, "body": body}


def write_combined(round_dir: Path, fm: dict[str, Any], body: str) -> str:
    final = round_dir / "combined.md"
    content = _lib.serialize_frontmatter(fm, body)
    return _lib.atomic_link_write(final, content)


# ---------------- entry ----------------


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=None)
    ap.add_argument("--timeout-hours", type=float, default=DEFAULT_TIMEOUT_HOURS)
    ap.add_argument("--all", dest="all_rounds", action="store_true")
    ap.add_argument("--no-git", action="store_true", help="skip git pull/push (test hook)")
    ap.add_argument("--now", default=None, help="override 'now' (ISO-8601 UTC; test hook)")
    args = ap.parse_args(argv[1:])

    repo_root = Path(args.repo_root).resolve() if args.repo_root else _lib.REPO_ROOT
    now = parse_iso_utc(args.now) if args.now else _dt.datetime.now(_dt.timezone.utc)
    now_ts = now.timestamp()

    eligible = find_eligible_rounds(repo_root, args.timeout_hours, now)
    if not eligible:
        print("[combine] no rounds to combine")
        return 0

    if not args.all_rounds:
        eligible = eligible[:1]

    if not args.no_git:
        import subprocess

        subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=repo_root, check=False)

    for round_dir in eligible:
        # clean orphans first
        cleanup_orphans(round_dir, now_ts)
        result = build_combined(round_dir, now, repo_root=repo_root)
        write_status = write_combined(round_dir, result["frontmatter"], result["body"])
        if write_status == "race_lost":
            print(f"[combine] race-lost on {round_dir}/combined.md; skipping", file=sys.stderr)
            continue
        _lib.validate_frontmatter(result["frontmatter"], "combined")
        print(str(round_dir / "combined.md"))

        is_malformed = result["frontmatter"]["combined_verdict"] == "malformed_reviewer_response"

        # AC4: on malformed-reviewer-response escalation, append one row to
        # raw/internal/queue-errors.md per offender. Row format matches the
        # existing `<UTC>Z EVENT-TOKEN: ...` shape used by push-with-retry.sh.
        if is_malformed:
            queue_errors = repo_root / "raw" / "internal" / "queue-errors.md"
            queue_errors.parent.mkdir(parents=True, exist_ok=True)
            with queue_errors.open("a", encoding="utf-8") as fh:
                for rel_path, err in result["malformed_responses"]:
                    excerpt = err.split("\n", 1)[0]
                    fh.write(
                        f"{_lib.iso_utc_now()} MALFORMED-REVIEWER-RESPONSE: "
                        f"combine.py round {result['item_id']}/r{result['round']} "
                        f"offending_response={rel_path} parse_error=\"{excerpt}\"\n"
                    )

        if not args.no_git:
            import subprocess

            add_paths = [str(round_dir / "combined.md")]
            if is_malformed:
                add_paths.append(str(repo_root / "raw" / "internal" / "queue-errors.md"))
            subprocess.run(["git", "add", *add_paths], cwd=repo_root, check=False)
            subprocess.run(
                [
                    "git",
                    "commit",
                    "-m",
                    f"review-r{result['frontmatter']['round']}: combined "
                    f"on {result['frontmatter']['item_id']}",
                ],
                cwd=repo_root,
                check=False,
            )
            subprocess.run(
                [str(repo_root / "tools/review-queue/push-with-retry.sh"),
                 f"combine: r{result['frontmatter']['round']} on {result['frontmatter']['item_id']}"],
                cwd=repo_root,
                check=False,
            )

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
