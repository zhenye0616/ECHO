---
id: 2026-05-13-043-per-round-reviewer-roster
title: Per-round reviewer roster — make `request.requested_reviewers` the per-round active set; add `reviewers.json` as runtime metadata; defer non-Codex headless runner abstraction
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-13
spec_commit_sha: ""
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
agent_notes: ""
spec_refs:
  - backlog/complete/2026-05-12-042-reviewer-emission-yaml-validation.md   # Immediate parent; AC5 measurement (0 founder activations) closed 041's AC8 gate; this item targets the speed-and-scale dimension next
  - backlog/complete/2026-05-12-041-reviewer-background-execution.md       # Parent operating-model item; launched the Codex-headless wrapper + slash-command convention. AC4's commit-reviewer-response.sh is touched here too (AC4 race fix)
  - backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md    # Grandparent operating-model item; `requested_reviewers` field already specced in request.schema.json but ignored downstream. This spec closes that gap.
  - backlog/_followups.md                                                  # "From 042 dogfooding cycle (2026-05-12)" — 6 structural findings; this item targets the reviewer-name-generalization subset (~items 1, 3, 5). Items 2 (dirty tree), 4 (single-reviewer-escalate), 6 (watcher session-only) are out of scope for 043.
  - tools/review-queue/request.py                                          # VALID_REVIEWERS = ("codex", "cursor") at line 27 — to be sourced from reviewers.json via _reviewers.py
  - tools/review-queue/combine.py                                          # REVIEWERS = ("codex", "cursor") at line 38; compute_combined_verdict signature at line 85 takes positional codex_v + cursor_v; orphan-tmp regex at line 117; find_eligible_rounds at line 135 — all need per-round-roster awareness
  - tools/review-queue/commit-reviewer-response.sh                         # Already accepts <slug> arg; AC4 adds a final pre-os.link combined.md existence re-check
  - tools/review-queue/run-codex-reviewer.sh                               # Codex-specific wrapper; AC3 factors the codex-specific bits into a 5-line driver of a new tools/review-queue/_run_reviewer.sh shared helper
  - tools/review-queue/install-codex-reviewer-launchd.sh                   # Same pattern as run-codex-reviewer.sh — factor into _install_reviewer_launchd.sh <slug>
  - tools/review-queue/schemas/request.schema.json                         # `requested_reviewers` array + reviewer enum at line ~48 — single source of truth for which reviewers a round expects
  - tools/review-queue/schemas/reviewer.schema.json                        # `reviewer` enum at line ~67 — kept explicit (NOT pattern-based per Codex pushback HIGH #5); adding a new reviewer adds one enum value + one row in reviewers.json
  - tools/review-queue/schemas/combined.schema.json                        # `codex_response` + `cursor_response` stay explicit per-reviewer fields; `offending_response` regex widened to support hyphenated slugs
  - .claude/commands/review-queue-codex.md                                 # Step 2 must read request.requested_reviewers; Step 7 exit no-op if MY_REVIEWER not requested
  - .claude/commands/review-queue-cursor.md                                # Same as codex prompt
  - .claude/commands/review-queue-watch.md                                 # Step 3 verdict roll-up prose update for N-way semantics
  - docs/review-queue-setup.md                                             # Update reviewer-add recipe to "edit reviewers.json + add slash-command + invoke _install_reviewer_launchd.sh"
  - CLAUDE.md                                                              # Founder-gate semantics unchanged
blocked_by: []
suggested_builder: any  # Pure Python + bash + schema work. ~6 code files modified, ~4 new files, ~4 new test cases. No new dependencies, no UI, no MCP/storage churn.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
review_notes: ""
---

## Summary

The cross-tool review queue (item 039, generalized by 041 to background-execute, hardened by 042 against malformed YAML) hardcodes the reviewer roster `(codex, cursor)` in 11+ places. Adding a 3rd reviewer — even a second Codex with a different prompt for architectural review — currently requires editing every one of those places, plus writing a per-reviewer launchd plist, wrapper, install script, status script, uninstall script, and smoke test.

The point of 043 is to make adding a 3rd reviewer cost **~1 config row + 1 slash-command file + (if headless) one invocation of a shared install helper.** Future reviewers (perspective-specialized Codex variants, a Claude API cron, a hypothetical headless Cursor when it ships, etc.) plug into the same framework without spec changes.

The load-bearing observation (caught by Codex pushback during 043's brainstorm — see `raw/internal/decisions/2026-05-13-043-pushback-findings.md`): **`request.requested_reviewers` already exists in `request.schema.json`** and the schema already allows arbitrary subsets. But reviewer prompts ignore it. They scan `backlog/reviews/*/r*/request.md` for any round whose `<my-slug>.md` is missing, regardless of whether they were actually requested. Result: in N-reviewer-world, every reviewer would write to every round.

The single most-load-bearing fix is making `request.requested_reviewers` the per-round source of truth — both on the emission side (reviewer prompts exit no-op when not requested) and on the combine side (combine.py waits for the round's requested set, not a global tuple).

Everything else in this spec is in service of that property: reviewer metadata (`mode`, `required`, `timeout_hours`, `slash_command`) gets externalized into `reviewers.json`; shared shell helpers parameterize on the reviewer slug; the late-response race that becomes more likely with optional reviewers (Codex pushback HIGH #6) gets a deterministic guard.

**Non-Codex headless runner abstraction is explicitly out of scope.** Per Codex pushback HIGH #3: `{name, mode, required, timeout_hours, slash_command}` is enough for a *second-Codex with a different prompt* but not for a Python-cron Claude-API reviewer or a hypothetical headless Cursor. The launchd wrapper's `executable + argv + sandbox-flags` generalization waits for a real non-Codex use case. YAGNI.

## Acceptance Criteria

### AC1 — Per-round reviewer roster honored end-to-end

**Implementation — reviewer side.** Update `.claude/commands/review-queue-{codex,cursor}.md` Step 2 to:

```bash
# Bind MY_REVIEWER for this prompt body (codex.md prompt sets MY_REVIEWER=codex; cursor.md prompt sets MY_REVIEWER=cursor)
MY_REVIEWER=codex  # or cursor

for req in backlog/reviews/*/r*/request.md; do
  dir=$(dirname "$req")
  if [ -f "$dir/$MY_REVIEWER.md" ]; then continue; fi
  if [ -f "$dir/combined.md" ]; then continue; fi
  # NEW: skip rounds where MY_REVIEWER is not in requested_reviewers
  if ! python3 -c "
import sys, yaml
fm = yaml.safe_load(open('$req').read().split('---')[1])
sys.exit(0 if '$MY_REVIEWER' in fm.get('requested_reviewers', []) else 1)
"; then
    continue
  fi
  CANDIDATE="$req"
  break
done

if [ -z "$CANDIDATE" ]; then
  echo "tick: no $MY_REVIEWER reviews to write" >&2
  exit 0
fi
```

The new gate (the `python3 -c "..."` check) is the load-bearing addition. Without it, an unrequested reviewer would write a response and pollute the round.

**Implementation — combine side.** Update `tools/review-queue/combine.py:find_eligible_rounds()` so:
1. For each candidate round directory, read `request.md`'s `requested_reviewers` field.
2. The active reviewer set for THIS round is `requested_reviewers`, not a global `REVIEWERS` tuple.
3. The "all required present" check uses `request.requested_reviewers ∩ {r for r in load_reviewers() if r.required}`.
4. The "missing past timeout" check uses the same per-round set.
5. Remove the module-level `REVIEWERS = ("codex", "cursor")` constant entirely.

**Test (`tests/review-queue/n-reviewer-framework.test.ts`):**
- **AC1a — Cursor exits no-op when not requested.** Fixture: a round with `requested_reviewers: [codex]` only. Invoke `.claude/commands/review-queue-cursor.md`'s Step 2 logic (extract into a testable shell function or invoke directly via env-var-driven harness). Assert: exits 0 with stderr "tick: no cursor reviews to write" and `r1/cursor.md` does NOT exist.
- **AC1b — Codex-only round becomes eligible immediately.** Same fixture; after `r1/codex.md` is written, invoke `combine.py` immediately (no timeout flag); assert: combined.md is written, `combined_verdict` reflects codex's verdict, `cursor_response: null`, `escalated_to_founder: false`.

### AC2 — `reviewers.json` as single source of truth (runtime metadata only)

**Implementation.**

New file `tools/review-queue/reviewers.json`:
```json
{
  "$schema": "./schemas/reviewers-config.schema.json",
  "reviewers": [
    {
      "name": "codex",
      "mode": "headless",
      "required": true,
      "timeout_hours": null,
      "slash_command": "review-queue-codex"
    },
    {
      "name": "cursor",
      "mode": "ide",
      "required": false,
      "timeout_hours": 2,
      "slash_command": "review-queue-cursor"
    }
  ]
}
```

Field semantics:
- `name` (required, string): the slug. MUST match `^[a-z][a-z0-9-]*$` and be unique across the list.
- `mode` (required, enum `headless | ide`): determines launchd-plumbing applicability. `headless` reviewers ARE installed as launchd jobs; `ide` reviewers are user-triggered inside the IDE and never installed as launchd jobs.
- `required` (required, bool): whether `combine.py` waits for this reviewer to land before computing a non-`partial_responses` verdict. Default deploy: codex=required, cursor=optional.
- `timeout_hours` (required, number | null): for `mode: ide` reviewers, the wait time before `combine.py` declares `partial_responses` for an absent reviewer. `null` for `mode: headless` (launchd ticks every 10 min; effective timeout is the missing-reviewer-timeout convention).
- `slash_command` (required, string): the `.claude/commands/<slash_command>.md` file this reviewer reads. Convention is `review-queue-<name>` but explicit reference allows future variants.

New file `tools/review-queue/_reviewers.py`:
```python
"""_reviewers.py — load + validate reviewers.json. Single import point."""
from __future__ import annotations
import json
from pathlib import Path
from typing import NamedTuple

class Reviewer(NamedTuple):
    name: str
    mode: str  # "headless" | "ide"
    required: bool
    timeout_hours: float | None
    slash_command: str

_CACHED: tuple[Reviewer, ...] | None = None

def load_reviewers(config_path: Path | None = None) -> tuple[Reviewer, ...]:
    global _CACHED
    if _CACHED is not None and config_path is None:
        return _CACHED
    path = config_path or Path(__file__).parent / "reviewers.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    reviewers = tuple(Reviewer(**r) for r in raw["reviewers"])
    # Validation: unique slugs; slug pattern; required fields
    seen = set()
    for r in reviewers:
        if not _SLUG_RE.match(r.name):
            raise ValueError(f"reviewers.json: invalid slug '{r.name}'")
        if r.name in seen:
            raise ValueError(f"reviewers.json: duplicate slug '{r.name}'")
        seen.add(r.name)
        if r.mode not in ("headless", "ide"):
            raise ValueError(f"reviewers.json: invalid mode '{r.mode}' for '{r.name}'")
    if config_path is None:
        _CACHED = reviewers
    return reviewers
```

New schema `tools/review-queue/schemas/reviewers-config.schema.json` validates the JSON file shape.

**`request.py` change.** Replace line 27:
```python
# OLD
VALID_REVIEWERS = ("codex", "cursor")
# NEW
from _reviewers import load_reviewers
def _valid_reviewers() -> tuple[str, ...]:
    return tuple(r.name for r in load_reviewers())
# usage at line 53: `if rev not in _valid_reviewers():`
```

**`combine.py` change.** Replace line 38:
```python
# OLD
REVIEWERS = ("codex", "cursor")
# NEW (no module-level constant; compute per-round inside find_eligible_rounds)
```

**`reviewer.schema.json` enum.** Stays explicit `["codex", "cursor"]`. Adding a new reviewer adds one enum value (one-line schema change) + one row in `reviewers.json`. Both edits land in the same PR. The schema explicitness is deliberate per Codex pushback HIGH #5.

**Test (`n-reviewer-framework.test.ts`):**
- **AC2a — Invalid reviewers.json rejected.** Fixtures with: duplicate slug, missing required field, invalid mode value, invalid slug pattern (uppercase, leading digit). Each fixture: `_reviewers.py` raises `ValueError` with a clear message; calling tool exits 1 with the message on stderr.
- **AC2b — Cached load is idempotent.** Call `load_reviewers()` twice without `config_path`; assert returns the same tuple object (cache hit; not re-read).
- **AC2c — Explicit config_path bypasses cache.** Call `load_reviewers(config_path=<fixture>)`; assert returns fixture contents AND module cache untouched.

### AC3 — Helper scripts accept reviewer slug; codex-specific scripts become 5-line drivers

**Implementation.**

New shared helper `tools/review-queue/_run_reviewer.sh`:
```bash
#!/usr/bin/env bash
# _run_reviewer.sh — generic headless reviewer tick wrapper.
# Reads REVIEWER_NAME env var; expects matching reviewers.json entry with mode:headless.
set -euo pipefail
: "${REVIEWER_NAME:?REVIEWER_NAME env var required}"
REPO_ROOT="${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"
# ...same body as current run-codex-reviewer.sh but PROMPT path is derived from
# reviewers.json's slash_command field: PROMPT="$REPO_ROOT/.claude/commands/$(python3 -c "from _reviewers import load_reviewers; print([r.slash_command for r in load_reviewers() if r.name=='$REVIEWER_NAME'][0])").md"
# Log path: $HOME/Library/Logs/echo-review-queue-$REVIEWER_NAME.log
# ...rest unchanged
```

New shared helper `tools/review-queue/_install_reviewer_launchd.sh <slug>`:
```bash
#!/usr/bin/env bash
# Templates ~/Library/LaunchAgents/com.echo.review-queue-<slug>.plist from a single
# template string. Validates the slug is in reviewers.json with mode:headless.
# Same --smoke flag behavior; same StartInterval=600s default; same paths.
```

`run-codex-reviewer.sh` becomes a 5-line driver:
```bash
#!/usr/bin/env bash
exec env REVIEWER_NAME=codex "$(dirname "$0")/_run_reviewer.sh"
```

`install-codex-reviewer-launchd.sh` becomes a 5-line driver:
```bash
#!/usr/bin/env bash
exec "$(dirname "$0")/_install_reviewer_launchd.sh" codex "$@"
```

**Out of scope for 043: factoring `status-codex-reviewer-launchd.sh`, `uninstall-codex-reviewer-launchd.sh`, `smoke-test-codex-runner.sh` into shared helpers.** These three exist (verified by `ls tools/review-queue/*codex*.sh`) and are ~50 lines each of straightforward shell that operates on the codex-specific launchd label. Adding a 2nd Codex reviewer requires cloning these three at 5-min-each cost. Factor into shared helpers in a 044-follow-up only when a 2nd Codex actually ships and the duplication friction is real. `_run_reviewer.sh` and `_install_reviewer_launchd.sh` are the two load-bearing helpers because they run every 10 min (run) and at install time (install); status/uninstall/smoke run rarely and ad-hoc.

**Test (`n-reviewer-framework.test.ts`):**
- **AC3a — Smoke runs with REVIEWER_NAME=codex.** Invoke `_run_reviewer.sh` directly with `REVIEWER_NAME=codex` + `ECHO_REVIEW_QUEUE_REPO_ROOT=<smoke-tmpdir>`. Assert: behaves identically to the current `run-codex-reviewer.sh` smoke (uses existing `smoke-test-codex-runner.sh` as the harness with `REVIEWER_NAME=codex` set in env).
- **AC3b — REVIEWER_NAME missing fails clearly.** Invoke `_run_reviewer.sh` without `REVIEWER_NAME`; assert exit non-zero, stderr matches `/REVIEWER_NAME env var required/`.
- **AC3c — REVIEWER_NAME not in reviewers.json fails clearly.** Set `REVIEWER_NAME=ghost`; assert exit non-zero, stderr matches `/ghost not found in reviewers.json/i`.

### AC4 — Late-response race fix in `commit-reviewer-response.sh`

**Implementation.** Per Codex pushback HIGH #6: the current path `validate.py → os.link → commit-push` has a race window. A reviewer can:
1. Scan and find round X eligible (no `combined.md` yet).
2. Run Codex review (3-5 min).
3. Meanwhile, combine.py's watcher tick declares the round `partial_responses` because timeout elapsed.
4. Reviewer's `commit-reviewer-response.sh` runs `os.link` and pushes a response that contradicts the now-existing `combined.md` (which has `escalated_to_founder: true` already).

The race becomes more frequent with shorter optional-reviewer timeouts (a separate 043-follow-up concern, but the race-fix lands here regardless).

**Fix.** In `commit-reviewer-response.sh`, between `validate.py` exit-0 and `os.link`:

```bash
# AC4: late-response race guard. If combined.md was written between our scan and
# this commit attempt, our response is now stale — abort cleanly without committing
# or pushing. The round is terminal-from-this-reviewer's-POV; the next request.md
# for r<N+1> (if any) is what we should be looking at instead.
ROUND_DIR="$(dirname "$RESPONSE_PATH")"
if [ -f "$ROUND_DIR/combined.md" ]; then
  echo "commit-reviewer-response: combined.md already exists at $ROUND_DIR — round is terminal; skipping commit" >&2
  rm -f "$RESPONSE_PATH"  # remove the unstaged response file; nothing to commit
  exit 0
fi
```

**Test (`n-reviewer-framework.test.ts`):**
- **AC4a — Late-response aborts cleanly.** Fixture: a round with `r1/codex.md.tmp` staged (validation passed). Write a fake `r1/combined.md` to disk to simulate the race. Invoke `commit-reviewer-response.sh r1/codex.md codex 1 <item_id>`. Assert: exits 0, no commit landed, `r1/codex.md` does NOT exist, stderr contains "combined.md already exists".

### AC5 — `offending_response` regex widening for hyphenated slugs

**Implementation.** `combined.schema.json:offending_response` pattern: currently `^backlog/reviews/[^/]+/r\d+/[a-z]+\.md$` (no hyphens allowed in filename portion). Widen to `^backlog/reviews/[^/]+/r\d+/[a-z][a-z0-9-]+\.md$`.

This is the only schema-pattern fix in 043. Adding a reviewer with a hyphenated slug (e.g., `codex-arch`) would otherwise break 042's AC2/AC3 path-validation. Caught by Codex pushback HIGH #5.

**Test.** Update `tests/review-queue/schemas.test.ts` with one new fixture: `offending_response: backlog/reviews/.../r1/codex-arch.md` (hyphenated) → validates cleanly.

### AC6 — N-way verdict roll-up with explicit semantics

**Implementation.** Replace `compute_combined_verdict(codex_v, cursor_v)` at `combine.py:85` with:

```python
def compute_combined_verdict(
    verdicts: dict[str, str | None],
    requested: set[str],
    required_set: set[str],
) -> tuple[str, bool]:
    """
    verdicts: {reviewer_name: per_reviewer_verdict_string | None}
    requested: set of reviewer names requested for this round (from request.md)
    required_set: subset of requested that has reviewers.json `required: true`

    Returns: (combined_verdict, escalated_to_founder)
    """
    # All requested either present or not — None means "expected but missing"
    present = {k: v for k, v in verdicts.items() if v is not None}
    missing_required = required_set - present.keys()

    if missing_required:
        # At least one required reviewer absent
        if not present:
            return ("no_responses", True)
        return ("partial_responses", True)

    # All required present. Optional missing reviewers are fine — skip them.
    # Unanimous?
    present_verdicts = set(present.values())
    if len(present_verdicts) == 1:
        return (next(iter(present_verdicts)), False)

    # Multiple verdicts. Boundary check: any proceed* with any pushback?
    has_proceed = any(v.startswith("proceed") for v in present.values())
    has_pushback = "pushback" in present.values()
    if has_proceed and has_pushback:
        return ("divergent", True)

    # All proceed* but mixed (proceed vs proceed_after_patches): take the
    # stricter — proceed_after_patches.
    if "proceed_after_patches" in present_verdicts:
        return ("proceed_after_patches", False)

    # Fallback: shouldn't reach here given the above branches.
    return ("divergent", True)
```

**Semantics summary:**
- All required present + all-same verdict → that verdict, not escalated.
- All required present + only proceed* variants (proceed vs proceed_after_patches) → proceed_after_patches (stricter wins), not escalated.
- All required present + mix of proceed* and pushback → `divergent`, escalated.
- Any required missing + at least one present → `partial_responses`, escalated.
- All required missing (no_responses condition) → `no_responses`, escalated.
- Optional missing reviewers don't block convergence.

**Schema additions to `combined.schema.json`:**
- Append `partial_responses` to the `combined_verdict` enum (NEW value).
- `single_reviewer_timeout` stays in the enum for back-compat with existing rounds in `complete/`.
- `combine.py` writes `partial_responses` for new rounds; legacy rounds keep their existing values.

**Combined.md body update (under `partial_responses`).** Combine.py's body-write should enumerate which reviewers landed with what verdicts, e.g.:

```
**Partial responses — round terminal pending founder review.**

Present reviewers (and their verdicts):
- codex: proceed_after_patches

Missing required reviewers (past timeout or never requested):
- (none — only optional reviewers missing)

Missing optional reviewers:
- cursor (timeout: 2h elapsed)

Strategist: dispose this round based on present-reviewer findings; founder ratifies in next session.
```

This is the "explicit semantics" half of Codex pushback MED #7 — present reviewers' actual verdicts are visible, not hidden behind a flat enum.

**Test (`n-reviewer-framework.test.ts`):**
- **AC6a — Unanimous proceed:** verdicts `{codex: proceed, cursor: proceed}`, required `{codex}`, requested `{codex, cursor}` → returns `("proceed", False)`.
- **AC6b — Unanimous proceed_after_patches:** verdicts `{codex: proceed_after_patches}`, required `{codex}`, requested `{codex}` → returns `("proceed_after_patches", False)`.
- **AC6c — Optional missing, required present:** verdicts `{codex: proceed, cursor: None}`, required `{codex}`, requested `{codex, cursor}` → returns `("proceed", False)`. (Optional missing doesn't escalate.)
- **AC6d — Required missing, optional present:** verdicts `{codex: None, cursor: proceed}`, required `{codex}`, requested `{codex, cursor}` → returns `("partial_responses", True)`. Body lists cursor's `proceed` verdict.
- **AC6e — proceed-vs-pushback divergence:** verdicts `{codex: proceed, cursor: pushback}`, required `{codex, cursor}`, requested `{codex, cursor}` → returns `("divergent", True)`.
- **AC6f — Mixed proceed variants without pushback:** verdicts `{codex: proceed, cursor: proceed_after_patches}`, required `{codex, cursor}`, requested `{codex, cursor}` → returns `("proceed_after_patches", False)`. (Stricter wins.)
- **AC6g — No responses:** verdicts `{codex: None, cursor: None}`, required `{codex}`, requested `{codex, cursor}` → returns `("no_responses", True)`.

### AC7 — Default deploy proven byte-identical via fixture test

**Implementation.** New test file `tests/review-queue/default-deploy-baseline.test.ts`. Reference fixture: a `combined.md` byte-exactly extracted from main HEAD BEFORE this spec lands (the builder pins the exact SHA in the test).

Test runs:
1. Construct an isolated fixture repo with `requested_reviewers: [codex, cursor]`, both responses present and unanimous-proceed.
2. Invoke `combine.py` against the fixture.
3. Assert: produced `combined.md` is byte-identical to the reference fixture (after stripping the `combined_at` timestamp, which is the only non-deterministic field).

**Why this AC.** Codex pushback MED #11 explicitly flags "default deploy unchanged" as un-proven by mere inspection. A fixture-level byte-comparison is the only reliable falsification. If any of AC2-AC6's changes accidentally alter the default-deploy output (different field order, different verdict-string formatting, different body text, etc.), this test fails.

## Out of Scope (Don't Drift)

- **Non-Codex headless runner abstraction.** The `_run_reviewer.sh` shared helper is designed to handle ANY Codex variant (different slash-command prompt with same `codex exec` invocation pattern). A reviewer that runs Python (e.g., Claude API cron), shell (e.g., custom script), or a different CLI tool needs additional config fields beyond `slash_command` (e.g., `executable`, `argv_template`, `sandbox_flags`). Defer this until there's a real non-Codex use case. Per Codex pushback HIGH #3, YAGNI.
- **combine.py finding-enumeration audit.** The dropped/double-listed findings bug observed twice during 041's review rounds (`_followups.md:577`) is a separate concern. AC6 here addresses verdict-roll-up generalization, NOT finding-enumeration generalization. Keep finding-enumeration logic untouched in 043; file as `2026-05-XX-XXX-combine-finding-enumeration-audit`.
- **Schema patternProperties refactor.** Per Codex pushback HIGH #5, the schema's per-reviewer fields stay explicit. Adding a 3rd reviewer adds one new optional field declaration in `combined.schema.json` (e.g., `codex_arch_response: { type: ["string", "null"] }`). Don't use patternProperties to "save the field declaration."
- **`single_reviewer_timeout` enum value renaming.** Add `partial_responses` as NEW enum value; keep `single_reviewer_timeout` in the enum for back-compat with rounds in `complete/`. Renaming would invalidate existing complete-items.
- **Cursor accept-degradation timeout default change.** The `cursor.timeout_hours: 2` default stays. Founder can override per-cycle via `--timeout-hours=N` flag (existing). Changing the default is a separate decision item.
- **Watcher Step 3 escalation-routing.** Per `_followups.md` "From 042 dogfooding cycle" item #4, the `single_reviewer_timeout → escalate_to_founder` default contradicts AC8. That's a separate fix that doesn't affect this spec's mechanics.
- **`reviewer.schema.json` enum becoming pattern-based.** Per Codex pushback HIGH #5, the enum stays explicit `["codex", "cursor"]` (with new values appended manually when a new reviewer ships). Adding a 3rd reviewer adds one enum value AND one reviewers.json row in the same PR.
- **`_run_reviewer.sh` and `_install_reviewer_launchd.sh` becoming a single super-helper.** Keep them separate per the existing pattern. They have different lifetimes (install once vs run-on-tick).
- **Updating `docs/review-queue-setup.md` to describe "how to add a 3rd reviewer."** Update is mechanical (point at `reviewers.json` + slash-command + `_install_reviewer_launchd.sh <slug>`); explicitly in scope. But not "rewriting the doc" — surgical insertion of a new section, not a redesign.

## Test Plan Summary

| AC | New test file (or update) | New it() blocks | Notes |
|---|---|---|---|
| AC1 | `tests/review-queue/n-reviewer-framework.test.ts` | 2 (AC1a, AC1b) | Tests reviewer prompt + combine.py honor `requested_reviewers` |
| AC2 | Same file | 3 (AC2a invalid-config; AC2b cache idempotent; AC2c explicit-path) | reviewers.json validation + caching |
| AC3 | Same file | 3 (AC3a smoke-with-env-var; AC3b missing-env-var; AC3c unknown-slug) | Shared helper scripts; smoke is the existing harness with env override |
| AC4 | Same file | 1 (AC4a late-response race) | Race-fix in commit-reviewer-response.sh |
| AC5 | Update `tests/review-queue/schemas.test.ts` | 1 (hyphenated-slug fixture) | Schema regex widening |
| AC6 | Same as AC1 | 7 (AC6a-AC6g — verdict roll-up cases) | N-way `compute_combined_verdict` cases |
| AC7 | `tests/review-queue/default-deploy-baseline.test.ts` | 1 (byte-identical combined.md) | Default-deploy regression guard |

Net new test count: **17** (one new test file with 16 blocks + 1 fixture-update in schemas.test.ts). Existing suite count was 56 at 042 merge (55 review-queue + 1 pre-existing-fail); should reach **72 review-queue tests** at 043 merge (still 1 pre-existing-fail for the orphan-cleanup).

## Files Touched (Codex's full enumeration, 11+ paths)

**New files:**
- `tools/review-queue/reviewers.json`
- `tools/review-queue/_reviewers.py`
- `tools/review-queue/_run_reviewer.sh`
- `tools/review-queue/_install_reviewer_launchd.sh`
- `tools/review-queue/schemas/reviewers-config.schema.json`
- `tests/review-queue/n-reviewer-framework.test.ts`
- `tests/review-queue/default-deploy-baseline.test.ts`
- `tests/review-queue/fixtures/default-deploy-baseline/` (reference fixtures)

**Modified files:**
- `tools/review-queue/request.py` (VALID_REVIEWERS source change)
- `tools/review-queue/combine.py` (REVIEWERS removed, find_eligible_rounds per-round, compute_combined_verdict signature)
- `tools/review-queue/commit-reviewer-response.sh` (AC4 late-response race guard)
- `tools/review-queue/run-codex-reviewer.sh` (becomes 5-line driver)
- `tools/review-queue/install-codex-reviewer-launchd.sh` (becomes 5-line driver)
- `tools/review-queue/status-codex-reviewer-launchd.sh` (stays codex-specific for 043; factoring deferred to 044-follow-up)
- `tools/review-queue/uninstall-codex-reviewer-launchd.sh` (stays codex-specific)
- `tools/review-queue/smoke-test-codex-runner.sh` (stays codex-specific)
- `tools/review-queue/schemas/combined.schema.json` (offending_response regex widening; partial_responses enum value)
- `tools/review-queue/schemas/request.schema.json` (reviewer enum stays explicit — sanity check; no behavior change)
- `tools/review-queue/schemas/reviewer.schema.json` (reviewer enum stays explicit — sanity check; no behavior change)
- `tests/review-queue/schemas.test.ts` (hyphenated-slug fixture)
- `.claude/commands/review-queue-codex.md` (Step 2 honors requested_reviewers)
- `.claude/commands/review-queue-cursor.md` (Step 2 honors requested_reviewers)
- `.claude/commands/review-queue-watch.md` (Step 3 prose update for N-way roll-up)
- `docs/review-queue-setup.md` (one new section: "Adding a 3rd reviewer")

## Builder Discipline Reminders

- Read `spec_refs` before any code.
- AC1 is THE load-bearing fix. If everything else lands but AC1 doesn't (reviewer prompts still ignore `requested_reviewers`), the spec failed. Verify with AC1a + AC1b before claiming completion.
- The reference fixture for AC7 must be extracted from the spec's `spec_commit_sha`-parent commit on main, NOT the current HEAD at implementation time. Pin the exact SHA in the test file.
- AC4's race fix uses `os.path.exists()` not `os.path.isfile()` — the latter has race semantics that the former doesn't (atomic stat).
- `_reviewers.py`'s module-level cache must be process-local. Tests that mutate fixtures should pass explicit `config_path` to bypass cache.
- Don't drift into the deferred concerns (finding-enumeration audit, non-Codex runner abstraction, escalation routing). Log temptations in `raw/internal/decisions/` as drift-events and STOP.

## After Completion (Strategist Notes)

**Wiki promotion candidates:**
1. Update `wiki/operating-model/cross-tool-spec-review.md` with one sentence noting that the reviewer roster is now per-round (driven by `request.requested_reviewers`) and the runtime metadata source is `tools/review-queue/reviewers.json`. Reference 043's `spec_commit_sha` at merge.
2. Update `wiki/operating-model/one-session-coordination-loop.md` (if it exists post-prior-session-promotion) with the N-way verdict roll-up semantics.
3. No new wiki page — the operating-model surface already covers cross-tool review.

**`_followups.md` cross-outs at merge:**
- "From 042 dogfooding cycle" item #5 (reviewer schema accepts unquoted YAML timestamps) was already fixed by 042 itself — verify with a quick test of the new reviewer prompts (still need to require quoted-string completed_at).
- New finding for `_followups.md`: "From 043 dogfooding cycle (2026-05-13)" section to be added by the strategist conversation that runs 043's review. Founder noted explicitly: any friction during 043's review/speccing goes in the NEXT task, not inlined here. Catalog of in-brainstorm friction below should be reviewed and filed as a separate item after 043 ships.

## Brainstorm-Phase Friction Log (for next task, per founder direction)

This section documents friction observed during 043's brainstorm itself (before any reviewer cycle has run on the spec). Per founder direction "any friction during review and speccing should be in the next task," these are NOT in-scope for 043 — they're seed material for an item that follows 043.

1. **Strategist's hardcoding list was 5/11.** Codex pushback HIGH #4 enumerated 6 additional places I missed (`request.schema.json`, `cross_ref.reviewer`, `commit-reviewer-response.sh:37`, `combine.py:117` orphan-tmp regex, malformed-response path regex, status/uninstall/smoke scripts, docs, tests). **Process improvement**: brainstorm phase should start with `grep -rn 'codex\|cursor' tools/review-queue/ .claude/commands/ tools/review-queue/schemas/` to enumerate hardcodings exhaustively BEFORE proposing approaches.

2. **`request.requested_reviewers` already existing was missed.** Codex pushback HIGH #1 surfaced that the field already lives in `request.schema.json` and is the right per-round source of truth, but no reviewer code honored it. **Process improvement**: brainstorm phase should `cat backlog/complete/2026-05-11-039-*.md | head -200` to refresh the existing-protocol's invariants before proposing new ones.

3. **Late-response race wasn't considered.** Codex pushback HIGH #6 caught the race that becomes more likely with optional/shorter-timeout reviewers — and the fix is one line in `commit-reviewer-response.sh`. **Process improvement**: brainstorm phase should explicitly enumerate concurrency boundaries (cross-tick, cross-reviewer, cross-strategist) before designing.

4. **Schema regex assumption (`[a-z]+\.md`) was missed.** Existing `offending_response` regex (from 042) is `^backlog/reviews/[^/]+/r\d+/[a-z]+\.md$` — no hyphens. Hyphenated slug like `codex-arch` would fail validation. Codex pushback HIGH #5 caught this; I had specced patternProperties without checking existing regex constraints.

5. **"Second Codex" vs "non-Codex headless runner" conflation.** Codex pushback HIGH #3 separated these. A second Codex needs slug + slash-command (a 2-line cost). A non-Codex needs slug + slash-command + executable + argv + sandbox-flags + lifecycle hooks (a different abstraction). My Approach 1 over-scoped by abstracting both at once.

6. **Default-deploy-unchanged claim was unverified.** Codex pushback MED #11 flagged this. The brainstorm-phase recommendation was "ship a regression test"; AC7 implements it. **Process improvement**: any "X is unchanged" claim in spec text requires a regression test as the falsification mechanism.

These 6 items become the "next task" seed when 043 ships. Suggested ID: `2026-05-XX-044-strategist-brainstorm-discipline` or similar.
