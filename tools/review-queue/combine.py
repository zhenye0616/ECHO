#!/usr/bin/env python3
"""combine.py — strategist watcher combine helper.

Polls backlog/reviews/<item_id>/r<N>/ directories for rounds eligible to
combine, then writes combined.md per the verdict roll-up + convergent-on-
primary-where-section logic specced in
backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md AC4,
generalized for the per-round reviewer roster by
backlog/ready/2026-05-13-043-per-round-reviewer-roster.md AC6.

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
import _reviewers  # noqa: E402

ORPHAN_TMP_AGE_SEC = 30 * 60  # 30 min
# Per-reviewer timeouts are sourced from reviewers.json's `timeout_hours`
# field (043 schema). Headless reviewers must have `timeout_hours: null`
# per `_reviewers.py:94`; null entries fall back to the value below at
# combine time. The legacy global `DEFAULT_TIMEOUT_HOURS = 2.0` (044 AC3)
# was removed in favor of the per-reviewer policy; the `--timeout-hours`
# CLI flag still works as a uniform override for ad-hoc / fixture cases.
FALLBACK_TIMEOUT_HOURS = 0.5

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


def cross_refs_match(
    a: dict[str, Any], a_round: int, a_reviewer: str, a_index: int,
    b: dict[str, Any], b_round: int, b_reviewer: str, b_index: int,
) -> bool:
    """Return True iff either finding explicitly cross-refs the other.

    A.cross_ref pointing to B counts when round/reviewer/finding_index all
    match. cross_ref is the canonical override per §AC4 combine logic.
    a_index / b_index are 1-based per the reviewer.schema.json contract.

    043 AC6 R6 MED #2: finding_index is now part of the match — earlier
    versions ignored it which produced false matches in lists of findings.
    """
    a_cr = a.get("cross_ref")
    if (
        isinstance(a_cr, dict)
        and a_cr.get("reviewer") == b_reviewer
        and a_cr.get("round") == b_round
        and a_cr.get("finding_index") == b_index
    ):
        return True
    b_cr = b.get("cross_ref")
    if (
        isinstance(b_cr, dict)
        and b_cr.get("reviewer") == a_reviewer
        and b_cr.get("round") == a_round
        and b_cr.get("finding_index") == a_index
    ):
        return True
    return False


def compute_combined_verdict(
    verdicts: dict[str, str | None],
    requested: set[str],
    required_set: set[str],
) -> tuple[str, bool]:
    """Apply the §AC4 verdict roll-up table, generalized for N reviewers.

    Args:
        verdicts: {reviewer_name: per_reviewer_verdict_string | None}.
                  `None` means "expected (requested) but missing".
        requested: set of reviewer names requested for this round.
        required_set: subset of `requested` with reviewers.json `required: true`.

    Returns: (combined_verdict, escalated_to_founder).

    Verdict table (043 AC6, refined by 044 AC4):
      - No responses at all (all requested are missing) → ("no_responses", True)
      - Some required missing (and at least one present):
          - 044 AC4: exactly ONE required missing AND every present
            reviewer's verdict is in PROCEED_STAR → ("partial_responses", False)
            (auto-disposition: strategist watcher dispositions through the
            normal path-(a)/(b)/(c) flow as if all reviewers had responded;
            the missing reviewer is surfaced as a divergent row.)
          - Otherwise (multi-missing OR any-pushback-with-missing) →
            ("partial_responses", True)   # 043 AC6 founder-escalation path
            (the legacy `single_reviewer_timeout` enum value stays in
            combined.schema.json for back-compat with rounds in complete/)
      - All required present + all-same verdict → (that_verdict, False)
      - All required present + mix of proceed* only → ("proceed_after_patches", False)
      - All required present + mix of proceed*+pushback → ("divergent", True)
      - All required present + all pushback → ("pushback", False)
    """
    PROCEED_STAR = {"proceed", "proceed_after_patches"}

    present = {k: v for k, v in verdicts.items() if v is not None and k in requested}
    missing_required = required_set - present.keys()

    if not present:
        return "no_responses", True

    if missing_required:
        # 044 AC4 auto-disposition: single-required-missing AND every present
        # reviewer is in PROCEED_STAR → strategist watcher autonomously
        # dispositions (escalated_to_founder: false). Multi-missing OR any
        # present pushback still escalates to founder.
        if (
            len(missing_required) == 1
            and all(v in PROCEED_STAR for v in present.values())
        ):
            return "partial_responses", False
        return "partial_responses", True

    # All required present (optional missing don't block).
    verdict_set = set(present.values())
    if len(verdict_set) == 1:
        return next(iter(verdict_set)), False

    has_proceed = bool(verdict_set & PROCEED_STAR)
    has_pushback = "pushback" in verdict_set
    if has_proceed and has_pushback:
        return "divergent", True
    if verdict_set <= PROCEED_STAR:
        # mix of proceed + proceed_after_patches → take the stricter
        return "proceed_after_patches", False
    # safety net (shouldn't reach here)
    return "divergent", True


def cleanup_orphans(round_dir: Path, now_ts: float, reviewer_slugs: tuple[str, ...]) -> list[str]:
    """Remove `.tmp.*` orphans older than ORPHAN_TMP_AGE_SEC. Return removed paths.

    043 AC6: orphan-tmp regex is now derived from the active reviewer slugs
    plus the known infrastructure names (combined, request). The earlier
    hardcoded `(codex|cursor|combined|request)` alternation forfeited any
    new-reviewer's orphan-tmp cleanup, leaking temp files indefinitely.
    """
    # Build the regex alternation from reviewer slugs (escaped) + infra names.
    infra_names = ("combined", "request")
    name_alternation = "|".join(
        re.escape(s) for s in (*reviewer_slugs, *infra_names)
    )
    tmp_re = re.compile(rf"^({name_alternation})\.md\.[0-9a-f]+\.tmp$")
    removed: list[str] = []
    for tmp in round_dir.iterdir():
        if not tmp.is_file():
            continue
        if not tmp_re.match(tmp.name):
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


def _read_requested_reviewers(request_path: Path) -> list[str]:
    """Parse request.md and return its `requested_reviewers` list.

    Returns [] if the file is missing or the field is absent/malformed.
    Callers treat empty as "skip this round (cannot determine roster)".
    """
    try:
        fm, _ = _lib.parse_frontmatter(request_path)
    except ValueError:
        return []
    val = fm.get("requested_reviewers")
    if isinstance(val, list):
        return [str(v) for v in val if isinstance(v, str)]
    return []


def find_eligible_rounds(
    repo_root: Path,
    timeout_hours_override: float | None,
    now: _dt.datetime,
) -> list[Path]:
    """Return a list of round dirs eligible to combine.

    043 AC1: per-round roster honored — the active reviewer set for a round
    is the round's request.requested_reviewers (intersected with the current
    reviewers.json roster). 044 AC3: per-reviewer timeouts from
    reviewers.json (with `FALLBACK_TIMEOUT_HOURS` for null entries), gated
    by the `not_yet_due` rule: every required-requested reviewer that is
    missing must INDIVIDUALLY have exceeded its per-reviewer timeout for
    the round to be eligible. A single still-pending slow reviewer keeps
    the round in `not_yet_due` state.

    A round is eligible iff combined.md does NOT exist AND either:
      (a) every REQUIRED requested reviewer has its <slug>.md present, OR
      (b) at least one required reviewer is missing AND every missing
          required reviewer has individually exceeded its per-reviewer
          timeout. Reviewers whose own timeout has not yet elapsed gate
          the round.

    `timeout_hours_override`: when non-None, applies uniformly to every
    reviewer (current `--timeout-hours` CLI semantics). When None,
    per-reviewer values from reviewers.json are used (null → fallback).
    """
    out: list[Path] = []
    reviews = repo_root / "backlog" / "reviews"
    if not reviews.is_dir():
        return out
    roster = _reviewers.load_reviewers()
    required_by_name = {r.name: r.required for r in roster}
    timeout_by_name = {r.name: r.timeout_hours for r in roster}
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
            requested = _read_requested_reviewers(request)
            if not requested:
                continue
            # Intersect with known roster (silently drop unknown reviewers).
            requested = [r for r in requested if r in required_by_name]
            if not requested:
                continue
            required_requested = [r for r in requested if required_by_name[r]]

            # (a) all required-and-requested reviewers have responses
            all_required_present = all(
                (round_dir / f"{r}.md").exists() for r in required_requested
            )
            if all_required_present:
                out.append(round_dir)
                continue

            # (b) per-reviewer timeout gate. A round is eligible only when
            # EVERY missing required reviewer has individually exceeded its
            # per-reviewer timeout. If any missing required reviewer is
            # `not_yet_due`, the round stays gated.
            try:
                fm, _ = _lib.parse_frontmatter(request)
                requested_at = parse_iso_utc(fm["requested_at"])
            except (ValueError, KeyError):
                continue
            elapsed = (now - requested_at).total_seconds()
            all_missing_timed_out = True
            any_missing = False
            for name in required_requested:
                if (round_dir / f"{name}.md").exists():
                    continue
                any_missing = True
                if timeout_hours_override is not None:
                    per_reviewer_hours = timeout_hours_override
                else:
                    per_reviewer_hours = timeout_by_name.get(name)
                    if per_reviewer_hours is None:
                        per_reviewer_hours = FALLBACK_TIMEOUT_HOURS
                if elapsed < per_reviewer_hours * 3600:
                    all_missing_timed_out = False
                    break
            if any_missing and all_missing_timed_out:
                out.append(round_dir)
    return out


# ---------------- combine ----------------


def read_response(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    fm, _body = _lib.parse_frontmatter(path)
    findings = fm.get("findings", []) or []
    return fm, findings


def _one_line(s: str) -> str:
    return " ".join(s.split())


_NON_REVIEWER_RESPONSE_FIELDS = {"offending_response"}


def _schema_response_fields() -> list[str]:
    """Return the schema-declared <slug>_response field names.

    Derived from the combined.schema.json properties (single source of truth)
    so that adding a new reviewer = adding `<slug>_response` to the schema +
    a row in reviewers.json. combine.py reads the schema, not the reviewers
    config, for this list — the schema is the validator's enforcement layer.

    Excludes schema fields ending in `_response` that are not per-reviewer
    response pointers (e.g. `offending_response` which encodes a malformed-
    response path).
    """
    schema = _lib.load_schema("combined")
    return [
        k for k in schema.get("properties", {}).keys()
        if k.endswith("_response") and k not in _NON_REVIEWER_RESPONSE_FIELDS
    ]


def build_malformed_combined(
    round_dir: Path,
    repo_root: Path,
    now: _dt.datetime,
    requested: list[str],
    malformed: list[tuple[Path, str]],
) -> dict[str, Any]:
    """Emit the malformed-reviewer-response escalation combined.md (042 AC2,
    generalized for N reviewers per 043 AC6 R7 HIGH #2).

    `malformed` is a list of (path, parse_error_str) tuples in stable
    iteration order. Repo-root-relative paths are surfaced in frontmatter +
    body. ALL schema-declared `<slug>_response` fields are emitted (null for
    unrequested/missing/malformed); this preserves combined.schema.json's
    `required: [..., codex_response, cursor_response]` contract.
    """
    request_fm, _ = _lib.parse_frontmatter(round_dir / "request.md")
    item_id = request_fm["item_id"]
    rnd = request_fm["round"]

    rel_paths: list[str] = []
    for p, _err in malformed:
        rel_paths.append(str(p.resolve().relative_to(repo_root.resolve()).as_posix()))
    errors: list[str] = [_one_line(e) for _p, e in malformed]

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
    }
    # Emit ALL schema-declared <slug>_response fields. Per 042 convention:
    # the `<slug>_response` field points at the on-disk filename if it
    # exists (even when malformed — the offending_response field surfaces
    # the parse failure separately). Null only when the file is absent
    # from disk or the slug is not in this round's requested set.
    for field in _schema_response_fields():
        slug = field[: -len("_response")]
        path = round_dir / f"{slug}.md"
        if path.exists() and slug in requested:
            fm_out[field] = f"{slug}.md"
        else:
            fm_out[field] = None
    fm_out.update({
        "patch_commit_sha": None,
        "next_round": None,
        "combined_verdict": "malformed_reviewer_response",
        "escalated_to_founder": True,
        "offending_response": offending,
        "parse_error": parse_err,
    })

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


class _UnionFind:
    """043 AC6 R4 MED #2: union-find for cross_ref-bridged convergence.

    A pairwise merge can split chains (if A∼B is merged then C→A is evaluated
    after A was renamed, C might form its own bucket instead of joining
    {A,B}). Union-find with path compression guarantees transitive closure
    regardless of iteration order.
    """

    def __init__(self, keys: list[str]) -> None:
        self.parent: dict[str, str] = {k: k for k in keys}

    def find(self, k: str) -> str:
        while self.parent[k] != k:
            self.parent[k] = self.parent[self.parent[k]]
            k = self.parent[k]
        return k

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def build_combined(
    round_dir: Path,
    now: _dt.datetime,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Compute frontmatter + body for combined.md for this round.

    Body is a single markdown document with: convergent table, divergent
    table, and a placeholder "Disposition" column. Default 2-reviewer
    behavior is byte-identical to pre-043 output (verified by AC7 fixture).
    """
    request_fm, _ = _lib.parse_frontmatter(round_dir / "request.md")
    item_id = request_fm["item_id"]
    rnd = request_fm["round"]
    requested_raw = request_fm.get("requested_reviewers", []) or []
    if not isinstance(requested_raw, list):
        requested_raw = []
    roster = _reviewers.load_reviewers()
    known = {r.name: r for r in roster}
    requested = [str(r) for r in requested_raw if str(r) in known]

    # Phase 1: collect parse failures across all REQUESTED reviewers (stable order).
    malformed: list[tuple[Path, str]] = []
    responses: dict[str, tuple[dict[str, Any] | None, list[dict[str, Any]]]] = {}
    for slug in requested:
        path = round_dir / f"{slug}.md"
        if path.exists():
            try:
                fm, findings = read_response(path)
                responses[slug] = (fm, findings)
            except ValueError as exc:
                malformed.append((path, str(exc)))
                responses[slug] = (None, [])
        else:
            responses[slug] = (None, [])

    # Phase 2 (escalation branch): any malformed → terminal combined.md.
    if malformed:
        root = repo_root if repo_root is not None else _lib.REPO_ROOT
        return build_malformed_combined(round_dir, root, now, requested, malformed)

    # Verdict roll-up — 043 AC6 generalized.
    requested_set = set(requested)
    required_set = {r.name for r in roster if r.required and r.name in requested_set}
    verdict_map: dict[str, str | None] = {
        slug: (responses[slug][0]["verdict"] if responses[slug][0] else None)
        for slug in requested
    }
    combined_verdict, escalated = compute_combined_verdict(
        verdict_map, requested_set, required_set,
    )

    # Convergent / divergent matching, generalized via union-find.
    # findings_by_anchor[primary_anchor][slug] = list[finding]
    findings_by_anchor: dict[str, dict[str, list[dict[str, Any]]]] = {}
    # finding_index[id(finding)] = (reviewer_slug, 1-based_index)
    finding_index: dict[int, tuple[str, int]] = {}
    for slug in requested:
        fm, findings = responses[slug]
        if not fm:
            continue
        for i, f in enumerate(findings, start=1):
            finding_index[id(f)] = (slug, i)
            primary, _ = normalize_where(f["where"])
            findings_by_anchor.setdefault(primary, {}).setdefault(slug, []).append(f)

    # Union-find over anchors. Apply cross_ref edges to union buckets.
    anchors = list(findings_by_anchor.keys())
    uf = _UnionFind(anchors)
    for a_anchor, a_by_slug in findings_by_anchor.items():
        for a_slug, a_list in a_by_slug.items():
            for a_finding in a_list:
                a_idx = finding_index[id(a_finding)][1]
                a_cr = a_finding.get("cross_ref")
                if not isinstance(a_cr, dict):
                    continue
                target_slug = a_cr.get("reviewer")
                target_round = a_cr.get("round")
                target_index = a_cr.get("finding_index")
                if target_round != rnd:
                    continue
                # Find target finding in our pool.
                for b_anchor, b_by_slug in findings_by_anchor.items():
                    if target_slug not in b_by_slug:
                        continue
                    for b_finding in b_by_slug[target_slug]:
                        b_idx = finding_index[id(b_finding)][1]
                        if cross_refs_match(
                            a_finding, rnd, a_slug, a_idx,
                            b_finding, rnd, target_slug, b_idx,
                        ):
                            uf.union(a_anchor, b_anchor)

    # Group anchors by root.
    bucket_anchors: dict[str, list[str]] = {}
    for a in anchors:
        bucket_anchors.setdefault(uf.find(a), []).append(a)

    # Build convergent + divergent rows, preserving ordering from the
    # default 2-reviewer algorithm: codex findings first (in their original
    # order), then unmatched cursor findings. Generalized: iterate the
    # requested reviewer slugs in spec order; convergent bucket = one whose
    # findings come from ≥2 distinct reviewer slugs.
    convergent_rows: list[dict[str, Any]] = []
    divergent_rows: list[dict[str, Any]] = []
    consumed_findings: set[int] = set()

    # Process in primary-reviewer-first order. For 2-reviewer default the
    # primary is `codex` (first in roster). This preserves byte-identity
    # with pre-043 output for the AC7 happy-path fixture.
    primary_slug = requested[0] if requested else None
    for slug in requested:
        fm, findings = responses[slug]
        if not fm:
            continue
        for f in findings:
            if id(f) in consumed_findings:
                continue
            primary_anchor, _ = normalize_where(f["where"])
            bucket_root = uf.find(primary_anchor)
            bucket = bucket_anchors.get(bucket_root, [primary_anchor])
            # Collect ALL findings in this bucket from all reviewers.
            bucket_findings_by_slug: dict[str, list[dict[str, Any]]] = {}
            for anchor in bucket:
                for s2, fs in findings_by_anchor.get(anchor, {}).items():
                    for ff in fs:
                        if id(ff) in consumed_findings:
                            continue
                        bucket_findings_by_slug.setdefault(s2, []).append(ff)
            participating_slugs = [s for s in requested if s in bucket_findings_by_slug]
            if len(participating_slugs) >= 2:
                # Convergent — one row per anchor-bucket. Pair codex+cursor
                # for default 2-reviewer compat; for N-reviewer, emit one
                # row with source listing all participants.
                if slug != primary_slug and primary_slug in bucket_findings_by_slug:
                    # Skip — the primary reviewer's row already covered this
                    # bucket on its own iteration.
                    continue
                # Severity = max across all participating findings.
                sev_order = {"high": 3, "medium": 2, "low": 1, "nit": 0}
                all_findings = [
                    ff for fs in bucket_findings_by_slug.values() for ff in fs
                ]
                sev = max((ff["severity"] for ff in all_findings),
                          key=lambda s: sev_order[s])
                convergent_rows.append({
                    "anchor": primary_anchor,
                    "severity": sev,
                    "participants": participating_slugs,
                    "findings": bucket_findings_by_slug,
                })
                for ff in all_findings:
                    consumed_findings.add(id(ff))
            else:
                # Divergent — emit this single finding.
                divergent_rows.append({"slug": slug, "finding": f})
                consumed_findings.add(id(f))

    # Frontmatter — emit ALL schema-declared <slug>_response fields (null for
    # unrequested or missing). Preserves combined.schema.json's `required`
    # contract for any roster configuration (043 AC6 R3 HIGH #1).
    fm_out: dict[str, Any] = {
        "item_id": item_id,
        "round": rnd,
        "combined_at": (
            _lib.iso_utc_now() if not now
            else now.strftime("%Y-%m-%dT%H:%M:%SZ")
        ),
    }
    for field in _schema_response_fields():
        slug = field[: -len("_response")]
        fm, _ = responses.get(slug, (None, []))
        fm_out[field] = f"{slug}.md" if fm and slug in requested_set else None
    fm_out.update({
        "patch_commit_sha": None,
        "next_round": None,
        "combined_verdict": combined_verdict,
        "escalated_to_founder": escalated,
    })

    # Body.
    body_lines: list[str] = ["\n# Combined findings\n"]
    if combined_verdict == "partial_responses":
        present_slugs = [s for s in requested if verdict_map.get(s) is not None]
        missing_slugs_required = [
            s for s in requested
            if verdict_map.get(s) is None and s in required_set
        ]
        if escalated:
            body_lines.append(
                "**Partial responses** — at least one required reviewer is missing past "
                "the timeout. Strategist must escalate to founder per §AC4 verdict roll-up.\n"
            )
        else:
            # 044 AC4 — exactly one required reviewer missing AND every present
            # reviewer is in {proceed, proceed_after_patches}. The watcher
            # dispositions through path-(a)/(b)/(c) as if all reviewers had
            # responded; the missing reviewer is surfaced as a divergent row.
            body_lines.append(
                "**Partial responses (auto-disposition)** — exactly one required reviewer "
                "is missing past its timeout AND every present reviewer is in "
                "{proceed, proceed_after_patches}. Per 044 AC4, the strategist watcher "
                "dispositions through path-(a)/(b)/(c) as if all reviewers had responded. "
                "The missing reviewer is surfaced as a divergent row below.\n"
            )
        body_lines.append("Present reviewers (and their verdicts):")
        for s in present_slugs:
            body_lines.append(f"- {s}: {verdict_map[s]}")
        body_lines.append("")
        body_lines.append("Missing required reviewers:")
        for s in missing_slugs_required:
            body_lines.append(f"- {s}")
        body_lines.append("")
        # 044 AC4 — auto-disposition path appends a synthetic divergent row
        # per missing required reviewer so the watcher's table-walking
        # disposition logic still sees the missing-reviewer signal.
        if not escalated:
            for slug in missing_slugs_required:
                divergent_rows.append({
                    "slug": slug,
                    "finding": {
                        "severity": "low",
                        # `where` carries the human-readable note because the
                        # body's divergent table renders only severity / slug /
                        # where / disposition columns — the literal "finding"
                        # text is not in the row template.
                        "where": (
                            "did not respond; per 044 AC4 single-reviewer "
                            "auto-disposition"
                        ),
                        "finding": (
                            "did not respond; per 044 AC4 single-reviewer "
                            "auto-disposition"
                        ),
                    },
                })
    if combined_verdict == "no_responses":
        body_lines.append(
            f"**No-responses timeout** — all {len(requested_set)} requested reviewers "
            f"silent past the timeout. Strategist must escalate to founder per §AC4 "
            f"verdict roll-up.\n"
        )
    if combined_verdict == "divergent":
        verdict_summary = ", ".join(
            f"{s}={verdict_map[s]!r}" for s in requested if verdict_map.get(s) is not None
        )
        body_lines.append(
            f"**Divergent verdicts** — {verdict_summary} cross the "
            f"`{{proceed*, pushback}}` boundary; founder escalation per §Out of Scope #7.\n"
        )

    body_lines.append("\n## Convergent findings\n")
    body_lines.append("| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |")
    body_lines.append("|---|---|---|---|---|---|")
    for i, row in enumerate(convergent_rows, start=1):
        participants = row["participants"]
        if set(participants) == set(requested) and len(requested) == 2:
            # Preserve the legacy "both" wording for the default 2-reviewer
            # AC7 byte-identity fixture.
            source = f"both (convergent on `{row['anchor']}`)"
        else:
            source = f"{'+'.join(participants)} (convergent on `{row['anchor']}`)"
        body_lines.append(
            f"| {i} | {row['severity'].upper()} | {source} | "
            f"{row['anchor']} | _strategist fills_ | _strategist fills_ |"
        )

    body_lines.append("\n## Divergent findings (single-reviewer or non-overlapping primary `where`)\n")
    body_lines.append("| # | Severity | Source | Where | Disposition | Patch SHA / rationale |")
    body_lines.append("|---|---|---|---|---|---|")
    for n, row in enumerate(divergent_rows, start=1):
        primary, _ = normalize_where(row["finding"]["where"])
        body_lines.append(
            f"| {n} | {row['finding']['severity'].upper()} | {row['slug']} | "
            f"{primary} | _strategist fills_ | _strategist fills_ |"
        )

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
    ap.add_argument(
        "--timeout-hours",
        type=float,
        default=None,
        help=(
            "uniform per-reviewer timeout override (hours). When omitted, "
            "per-reviewer values from reviewers.json apply, with "
            f"FALLBACK_TIMEOUT_HOURS={FALLBACK_TIMEOUT_HOURS} for null entries "
            "(headless reviewers). 044 AC3."
        ),
    )
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

        subprocess.run(
            ["git", "-c", "rebase.autoStash=true", "pull", "--rebase", "origin", "main"],
            cwd=repo_root,
            check=False,
        )

    reviewer_slugs = tuple(r.name for r in _reviewers.load_reviewers())

    for round_dir in eligible:
        cleanup_orphans(round_dir, now_ts, reviewer_slugs)
        result = build_combined(round_dir, now, repo_root=repo_root)
        write_status = write_combined(round_dir, result["frontmatter"], result["body"])
        if write_status == "race_lost":
            print(f"[combine] race-lost on {round_dir}/combined.md; skipping", file=sys.stderr)
            continue
        _lib.validate_frontmatter(result["frontmatter"], "combined")
        print(str(round_dir / "combined.md"))

        is_malformed = result["frontmatter"]["combined_verdict"] == "malformed_reviewer_response"

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
