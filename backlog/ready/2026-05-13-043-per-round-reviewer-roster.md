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
- **AC1a — Cursor exits no-op when not in requested_reviewers.** Fixture: a round with `requested_reviewers: [codex]` only. Invoke `.claude/commands/review-queue-cursor.md`'s Step 2 logic (extract into a testable shell function or invoke directly via env-var-driven harness). Assert: exits 0 with stderr "tick: no cursor reviews to write" and `r1/cursor.md` does NOT exist.
- **AC1b — Codex-only-requested round eligible immediately, emits schema-valid combined.md (R3 HIGH #1 fix).** Same fixture as AC1a; after `r1/codex.md` is written, invoke `combine.py` immediately (no `--timeout-hours` flag); assert: `combined.md` is written, `combined_verdict` reflects codex's verdict, `cursor_response: null` (NOT MISSING — explicitly null so validate.py accepts), `escalated_to_founder: false`. **Then run `python3 tools/review-queue/validate.py combined <combined.md>` and assert exit 0.** This last assertion is the falsification for "schema-declared reviewer fields must all be emitted, null for unrequested" — without the AC6 Phase 2 fix, validate.py rejects the output because `cursor_response` is `required` in `combined.schema.json`.

**The required×mode×timeout matrix (Codex R1 HIGH #1 resolution).** Three additional test cases enumerate the eligibility×verdict behavior for the four cells of the matrix that matter in practice. The fixture toggles `reviewers.json` per case (each test uses `config_path` to bypass cache and load a custom config).

- **AC1c — Required cursor missing BEFORE timeout, codex present.** Fixture: `reviewers.json` with `cursor: required=true, mode=ide, timeout_hours=2`; round dispatched with `requested_reviewers: [codex, cursor]`; codex.md present with verdict `proceed`; cursor.md ABSENT; round's `requested_at` is < 2h ago. Invoke `combine.py` (no `--timeout-hours` override). Assert: **NOT eligible** — `combine.py` prints `no rounds to combine` and exits 0; no `combined.md` written.
- **AC1d — Required cursor missing AFTER timeout, codex present.** Same fixture as AC1c but `requested_at` is > 2h ago (use `--now=<future-iso>` flag to simulate). Invoke `combine.py`. Assert: **eligible** — `combined.md` written, `combined_verdict: partial_responses`, `escalated_to_founder: true`, `cursor_response: null`, body enumerates codex's `proceed` verdict explicitly.
- **AC1e — Optional cursor missing, codex present (non-blocking).** Fixture: `reviewers.json` with `cursor: required=false, mode=ide, timeout_hours=2`; round dispatched with `requested_reviewers: [codex, cursor]`; codex.md present with verdict `proceed`; cursor.md ABSENT; round's `requested_at` is 5 minutes ago (well before any timeout). Invoke `combine.py`. Assert: **eligible immediately** — `combined.md` written, `combined_verdict: proceed` (not partial_responses — optional missing doesn't escalate), `escalated_to_founder: false`, `cursor_response: null`. **This is the empirical close on Codex R1 HIGH #1**: the same physical state (codex present, cursor absent, before timeout) yields different outcomes depending on `cursor.required`, with NO ambiguity in the implementation.

### AC1f — Per-round roster preserved across review rounds (R2 HIGH #3 fix)

**Implementation.** `dispatch-next-round.py` currently invokes `request.py` for r<N+1> WITHOUT a `--reviewers` flag, falling back to `request.py`'s default. If r1 was dispatched with a custom roster (e.g., `[codex, cursor, codex-arch]`), r2's request silently drops to the default `[codex, cursor]`. AC1's "per-round roster honored end-to-end" claim breaks across rounds.

Fix: `dispatch-next-round.py` reads the current round's `request.md`, extracts `requested_reviewers` (the source-of-truth per AC1), and passes them to `request.py` for r<N+1>:

```python
# In dispatch-next-round.py branch (b) — verification round dispatch:
import yaml
current_request = round_dir / "request.md"
fm, _body = _lib.parse_frontmatter(current_request)
roster = ",".join(fm["requested_reviewers"])  # preserve order from r<N>

# Pass to request.py:
subprocess.run([
    "python3", str(repo_root / "tools/review-queue/request.py"),
    item_id, str(next_round),
    "--class", request_class,
    "--reviewers", roster,         # NEW: propagate roster from r<N>
    "--spec-sha", args.spec_sha,
    "--focus-hints", args.focus_hints,
], check=True)
```

Apply the same fix to dispatch-next-round.py's branch (c) — terminal-with-verification-waived — which currently also doesn't pass `--reviewers`. (Branch (a) is terminal without dispatching anything; no fix needed there.)

**Files Touched (add).** `tools/review-queue/dispatch-next-round.py` is now part of the modified-file list (was missing from R1's enumeration; R2 HIGH #3 caught this).

**Test (`tests/review-queue/n-reviewer-framework.test.ts`):**
- **AC1f — r<N+1> roster preserves r<N> roster.** Fixture: synthetic `codex-arch` added to all schemas + reviewers.json; r1 dispatched with `requested_reviewers: [codex, cursor, codex-arch]`; codex + codex-arch responses present, both `proceed_after_patches` with one finding each; strategist disposition (simulated in-test) flags patches-applied; invoke `dispatch-next-round.py <item_id> 1 --verdict=proceed_after_patches --patches-applied=true --class=narrow --spec-sha=<sha>`. Assert: `r2/request.md` exists; its `requested_reviewers` is EXACTLY `[codex, cursor, codex-arch]` in the same order as r1's. Falsifies R2 HIGH #3 directly.

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
      "required": true,
      "timeout_hours": 2,
      "slash_command": "review-queue-cursor"
    }
  ]
}
```

Field semantics — ONE rule for eligibility×verdict (resolves R1 HIGH #1 ambiguity):

- `name` (required, string): the slug. MUST match `^[a-z][a-z0-9-]*$` and be unique across the list.

- `mode` (required, enum `headless | ide`): determines launchd-plumbing applicability. `headless` reviewers ARE installed as launchd jobs; `ide` reviewers are user-triggered inside the IDE and never installed as launchd jobs.

- `required` (required, bool):
    - **`required: true` + `mode: headless`:** `combine.py` waits indefinitely for this reviewer's response. Headless reviewers tick every ~10 min via launchd, so "indefinitely" is bounded in practice. A missing required headless reviewer past, say, 24h is operationally a queue stall — out of scope for 043 (separate observability concern).
    - **`required: true` + `mode: ide`:** `combine.py` waits up to `timeout_hours` for this reviewer. If absent past timeout, combine emits `combined_verdict: partial_responses` with `escalated_to_founder: true`; the body enumerates present reviewers' verdicts. This is current Cursor behavior; **AC7's "default deploy unchanged" depends on this.**
    - **`required: false`:** Combine treats absence as non-blocking. Eligibility is computed against the required-only set; the optional reviewer is included in the verdict roll-up if-and-only-if its response is present at combine time. Any late-landing response after `combined.md` exists is rejected by AC4's race guard (the response is unwritten by the reviewer prompt's pre-`os.link` check). `timeout_hours` on an optional reviewer is semantically meaningless — the value is allowed in `reviewers.json` but ignored by `combine.py`.

- `timeout_hours` (required, number | null):
    - For `required: true` + `mode: ide` reviewers: positive number, meaningful (used by combine).
    - For `required: true` + `mode: headless` reviewers: must be `null` (the launchd tick-cadence is the de facto timing layer).
    - For `required: false` reviewers: present but ignored by combine; conventionally `null` for headless and the same `2` as before for cursor if we ever toggle cursor to optional.

- `slash_command` (required, string): the `.claude/commands/<slash_command>.md` file this reviewer reads. Convention is `review-queue-<name>` but explicit reference allows future variants.

**Default `reviewers.json` deploy values (preserves current behavior — AC7-load-bearing):**
- `codex`: `required: true, mode: headless, timeout_hours: null` — exactly current codex behavior.
- `cursor`: `required: true, mode: ide, timeout_hours: 2` — exactly current cursor behavior (combine waits up to 2h for cursor.md; emits `partial_responses` past timeout). **`required: true` on cursor is the right default per Codex R1 HIGH #1.** Toggling cursor to `required: false` would be a separate speed-decision item, not bundled in 043.

New file `tools/review-queue/_reviewers.py`:
```python
"""_reviewers.py — load + validate reviewers.json. Single import point."""
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import NamedTuple

_SLUG_RE = re.compile(r"^[a-z][a-z0-9-]*$")
_VALID_MODES = ("headless", "ide")
_REQUIRED_FIELDS = ("name", "mode", "required", "timeout_hours", "slash_command")


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
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ValueError(f"reviewers.json: invalid JSON: {e}") from e
    if "reviewers" not in raw or not isinstance(raw["reviewers"], list):
        raise ValueError("reviewers.json: top-level 'reviewers' array is required")

    reviewers: list[Reviewer] = []
    for i, r in enumerate(raw["reviewers"]):
        if not isinstance(r, dict):
            raise ValueError(f"reviewers.json[{i}]: entry must be an object")
        # Convert TypeError (missing/extra field) → ValueError with field name in message.
        try:
            rev = Reviewer(**r)
        except TypeError as e:
            missing = set(_REQUIRED_FIELDS) - set(r.keys())
            extra = set(r.keys()) - set(_REQUIRED_FIELDS)
            msg = f"reviewers.json[{i}] (name={r.get('name', '<unknown>')!r}): {e}"
            if missing:
                msg += f"; missing required fields: {sorted(missing)}"
            if extra:
                msg += f"; unknown fields: {sorted(extra)}"
            raise ValueError(msg) from e
        reviewers.append(rev)

    seen: set[str] = set()
    for r in reviewers:
        if not _SLUG_RE.match(r.name):
            raise ValueError(
                f"reviewers.json: invalid slug {r.name!r} — must match {_SLUG_RE.pattern}"
            )
        if r.name in seen:
            raise ValueError(f"reviewers.json: duplicate slug {r.name!r}")
        seen.add(r.name)
        if r.mode not in _VALID_MODES:
            raise ValueError(
                f"reviewers.json: invalid mode {r.mode!r} for {r.name!r} — must be one of {_VALID_MODES}"
            )
        # mode↔timeout_hours contract (resolves R1 HIGH #1 with explicit enforcement).
        if r.mode == "headless" and r.timeout_hours is not None:
            raise ValueError(
                f"reviewers.json: {r.name!r} has mode=headless but timeout_hours={r.timeout_hours!r}; "
                f"headless reviewers must have timeout_hours=null"
            )
        if r.mode == "ide":
            if r.timeout_hours is None:
                raise ValueError(
                    f"reviewers.json: {r.name!r} has mode=ide but timeout_hours=null; "
                    f"ide reviewers must have a positive numeric timeout_hours"
                )
            if not isinstance(r.timeout_hours, (int, float)) or r.timeout_hours <= 0:
                raise ValueError(
                    f"reviewers.json: {r.name!r} has invalid timeout_hours {r.timeout_hours!r}; "
                    f"must be a positive number"
                )
        if not isinstance(r.required, bool):
            raise ValueError(
                f"reviewers.json: {r.name!r} 'required' must be a bool, got {type(r.required).__name__}"
            )

    reviewers_tuple = tuple(reviewers)
    if config_path is None:
        _CACHED = reviewers_tuple
    return reviewers_tuple
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

**`reviewer.schema.json` enum.** Stays explicit `["codex", "cursor"]`. Adding a new reviewer adds one enum value (one-line schema change) + one row in `reviewers.json`. Both edits land in the same PR. The schema explicitness is deliberate per Codex R1 HIGH #5.

### Adding a Reviewer: Changelist (R2 HIGH #1 — the cost of "adding the 3rd reviewer" enumerated)

The "1 config row + 1 slash-command file + 1 install invocation" promise from the spec preamble is the **steady-state** cost — for a new headless Codex variant with no semantic changes. The actual diff for adding reviewer `X` (where X is a slug like `codex-arch`) is exactly **5 files** + **1 command**:

| # | File | Edit |
|---|---|---|
| 1 | `tools/review-queue/reviewers.json` | Append one row: `{"name": "X", "mode": "headless"\|"ide", "required": true\|false, "timeout_hours": null\|<positive number>, "slash_command": "review-queue-X"}` |
| 2 | `tools/review-queue/schemas/request.schema.json` | Append `"X"` to the `requested_reviewers.items.enum` |
| 3 | `tools/review-queue/schemas/reviewer.schema.json` | Append `"X"` to BOTH enums in this file: (a) the top-level `reviewer` enum AND (b) the `findings[].cross_ref.reviewer` enum. (R3 MED #3: this file has TWO reviewer enums — missing the second one breaks cross_ref-to-new-reviewer in default-deploy review responses.) |
| 4 | `tools/review-queue/schemas/combined.schema.json` | Add property declaration: `"X_response": { "type": ["string", "null"] }` under `properties`. `additionalProperties: false` is preserved. |
| 5 | `.claude/commands/review-queue-X.md` | New file; mirror `review-queue-codex.md`'s structure with reviewer-perspective-specific prompt body. |

Plus **1 command** (only for `mode: headless` reviewers): `tools/review-queue/_install_reviewer_launchd.sh X` to install a launchd plist + create the wrapper driver.

For `mode: ide` reviewers (Cursor today, hypothetical others tomorrow): no launchd command needed; user runs the slash-command in the IDE.

**Schema-derivation alternative (rejected per R1 HIGH #5):** Loading enums from reviewers.json at validate-time was considered. Per Codex R1 HIGH #5, explicit enums in static schema files preserve the jsonschema contract better. The cost is a 5-file edit per reviewer instead of a 1-file edit — acceptable for the cadence of "a new reviewer ships every few months at most."

**Falsification for the 5-file changelist:** AC6h test fixture must apply all 5 edits as part of fixture setup AND exercise the full pipeline (`request.py` → `validate.py reviewer` → `commit-reviewer-response.sh` → `combine.py` → `validate.py combined`). If any one of the 5 edits is missing, the test fails at a specific gate; the failure mode is the falsification proof for "exactly 5 schema edits are required."

**Test (`n-reviewer-framework.test.ts`):**
- **AC2a — Invalid reviewers.json rejected.** Fixtures with: duplicate slug, missing required field, extra field, invalid mode value, invalid slug pattern (uppercase, leading digit, special char), non-bool `required`. Each fixture: `_reviewers.py` raises `ValueError` (NOT `TypeError`) with a clear message that includes the reviewer name and the specific violation; calling tool exits 1 with the message on stderr.
- **AC2b — Cached load is idempotent AND returns a tuple (R2 MED #4 fix).** Call `load_reviewers()` twice without `config_path`; assert: (i) `isinstance(result, tuple)` (not list); (ii) `result is load_reviewers()` (identity holds — same tuple object returned from cache, not re-read or re-converted).
- **AC2c — Explicit config_path bypasses cache.** Call `load_reviewers(config_path=<fixture>)`; assert returns fixture contents AND module cache untouched.
- **AC2d — `mode` × `timeout_hours` contract enforced.** Six fixtures testing the cross-field validation: (i) `mode=headless + timeout_hours=2` rejected; (ii) `mode=headless + timeout_hours=null` accepted; (iii) `mode=ide + timeout_hours=null` rejected; (iv) `mode=ide + timeout_hours=2` accepted; (v) `mode=ide + timeout_hours=0` rejected; (vi) `mode=ide + timeout_hours="2"` (string, not number) rejected. Each rejection's error message names both the reviewer slug AND the offending field.

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

# AC3/R2 HIGH #5 fix: ensure _reviewers.py is importable from any cwd.
# The wrapper cd's into REPO_ROOT (not tools/review-queue/), so without
# PYTHONPATH the inline `from _reviewers import ...` raises ModuleNotFoundError.
export PYTHONPATH="$REPO_ROOT/tools/review-queue:${PYTHONPATH:-}"

# Validate REVIEWER_NAME exists in reviewers.json with mode=headless. Fails
# fast with the exact diagnostic AC3c asserts:
#   "ghost not found in reviewers.json"  (when REVIEWER_NAME is unknown)
#   "ghost has mode=ide, not headless"   (when REVIEWER_NAME is IDE-only)
SLASH_COMMAND="$(python3 - <<PY
from _reviewers import load_reviewers
import sys
r = next((r for r in load_reviewers() if r.name == "$REVIEWER_NAME"), None)
if r is None:
    sys.stderr.write(f"$REVIEWER_NAME not found in reviewers.json\n")
    sys.exit(1)
if r.mode != "headless":
    sys.stderr.write(f"$REVIEWER_NAME has mode={r.mode}, not headless\n")
    sys.exit(1)
print(r.slash_command)
PY
)"

PROMPT="$REPO_ROOT/.claude/commands/${SLASH_COMMAND}.md"
LOG_FILE="$HOME/Library/Logs/echo-review-queue-${REVIEWER_NAME}.log"

# ...rest mirrors current run-codex-reviewer.sh body: log rotation,
#    PATH augmentation, codex exec invocation, tick start/end markers.
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
- **AC3c — REVIEWER_NAME not in reviewers.json fails clearly.** Set `REVIEWER_NAME=ghost`; assert exit non-zero, stderr contains the EXACT literal string `ghost not found in reviewers.json` (no `ModuleNotFoundError`, no Python traceback). The literal-match assertion is the falsification for R2 HIGH #5 (PYTHONPATH must be set so the inline `from _reviewers import` doesn't crash before the not-found check fires).
- **AC3d — REVIEWER_NAME points at an `ide` reviewer fails clearly.** Set `REVIEWER_NAME=cursor` (which has `mode: ide` in default deploy); assert exit non-zero, stderr contains `cursor has mode=ide, not headless`. Same falsification class — guards against accidental launchd-firing of an IDE reviewer.

### AC4 — Late-response race fix in reviewer prompts (NOT the commit helper)

**Implementation.** Per Codex R1 HIGH #2: the original v1 of this AC placed the race guard inside `commit-reviewer-response.sh`. But the prompt-side path is:

```
1. Reviewer writes content to /tmp file.
2. Reviewer does os.link(/tmp/file, r<N>/<reviewer>.md) — atomic, in the PROMPT body.
3. Reviewer shells out to commit-reviewer-response.sh — the helper sees r<N>/<reviewer>.md and validates/commits.
```

`commit-reviewer-response.sh` doesn't OWN the `os.link`; it operates on the already-linked file. Putting the race guard inside the helper would delete a file that combine.py may have already observed and referenced in `combined.md` — making the queue inconsistent.

**Correct fix location: the reviewer prompts' Step 5, immediately before the `os.link` call.** Update `.claude/commands/review-queue-{codex,cursor}.md` Step 5 Python snippet from:

```python
import os, uuid
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)
try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
```

…to:

```python
import os, uuid
# AC4: late-response race guard. The os.link is atomic, but the window between
# "Codex started reviewing" and "Codex is about to link" is minutes long. If
# combined.md was written during that window, our response is stale — discard
# it without linking. The round is already terminal from this reviewer's POV;
# next tick will see r<N+1>/request.md if there is one.
round_dir = os.path.dirname(final)
if os.path.exists(os.path.join(round_dir, "combined.md")):
    raise SystemExit(0)
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)
try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
```

The guard is process-local atomic-stat (`os.path.exists` reads the directory entry, which is atomic on POSIX). Race window between the `exists` check and the subsequent `os.link` is microseconds; an `os.link` race with combine.py's `os.link` writing combined.md is handled by combine.py's existing atomic-write pattern (it links its own temp into place; if combined.md materializes between our exists-check and our os.link of reviewer.md, the worst case is the reviewer.md gets written and combine.py rejects on next tick — same recovery as 041 AC4 quarantine semantics, no data loss).

**No change to `commit-reviewer-response.sh` for AC4.** AC4 is now a pure prompt-side change.

**(R3 HIGH #2 separate fix — required for AC6h's end-to-end exercise.)** `commit-reviewer-response.sh:37-43` currently has a hardcoded `case "$REVIEWER" in codex|cursor) ;; *) echo "unknown reviewer"; exit 1 ;; esac` (approximate). This is the gate that rejects unknown reviewer names BEFORE validate.py runs. To make AC6h actually exercise the synthetic `codex-arch` reviewer end-to-end, this case statement must be either:

- **(option a — preferred)** removed entirely. validate.py already enforces the reviewer-name check via `reviewer.schema.json:reviewer` enum at line 67. The shell-level case statement is redundant. Drop it.
- **(option b — alternative)** replaced with a `_reviewers.py` lookup via inline python3:
  ```bash
  if ! PYTHONPATH="$REPO_ROOT/tools/review-queue:${PYTHONPATH:-}" python3 -c "
  from _reviewers import load_reviewers
  import sys
  sys.exit(0 if any(r.name == '$REVIEWER' for r in load_reviewers()) else 1)
  "; then
    echo "commit-reviewer-response: '$REVIEWER' not found in reviewers.json" >&2
    exit 1
  fi
  ```

The spec mandates **option a** (drop the case statement) — preserves the "5 files + 1 command" promise per Adding-a-Reviewer changelist. `commit-reviewer-response.sh` becomes part of the spec's modified-files list with this specific deletion.

**Test (`tests/review-queue/n-reviewer-framework.test.ts`):**
- **AC4a — Late-response aborts before linking.** Fixture: extract the reviewer Step 5 Python snippet into a testable form (either a small Python helper at `tools/review-queue/_atomic_write.py` that the prompts import, or a parametrized Python invocation the test can drive directly). Create the fixture round directory with `r1/combined.md` already written; invoke the extracted snippet with `final=r1/codex.md`; assert: exits 0, `r1/codex.md` does NOT exist (no link happened), the fixture's combined.md unchanged.
- **AC4b — No race condition when combined.md absent.** Same fixture but without combined.md. Assert: `r1/codex.md` exists after invocation; no tmp files left behind.
- **AC4c — Race-with-os.link is handled by FileExistsError fall-through.** Stress test: pre-create `r1/codex.md` (simulating "another reviewer ticked between our check and our link"). Assert: exits 0 cleanly without raising.

**Optional refactor (NOT required by AC4):** extracting the Step 5 Python block into `tools/review-queue/_atomic_write.py` would make this testable without spawning the full reviewer prompt. The builder MAY choose to do this; the spec does not require it.

### AC5 — `offending_response` regex widening for hyphenated slugs

**Implementation.** `combined.schema.json:offending_response` pattern: currently `^backlog/reviews/[^/]+/r\d+/[a-z]+\.md$` (no hyphens allowed in filename portion). Widen to `^backlog/reviews/[^/]+/r\d+/[a-z][a-z0-9-]+\.md$`.

This is the only schema-pattern fix in 043. Adding a reviewer with a hyphenated slug (e.g., `codex-arch`) would otherwise break 042's AC2/AC3 path-validation. Caught by Codex pushback HIGH #5.

**Test.** Update `tests/review-queue/schemas.test.ts` with one new fixture: `offending_response: backlog/reviews/.../r1/codex-arch.md` (hyphenated) → validates cleanly.

### AC6 — N-way verdict roll-up + full build_combined generalization

**Context (Codex R1 HIGH #3).** Generalizing only `find_eligible_rounds` and `compute_combined_verdict` is insufficient. `combine.py:build_combined` is the function that actually discovers reviewer responses on disk, reads their findings, cross-references findings across reviewers, and writes the per-reviewer fields into `combined.md`. Current `build_combined` hardcodes:
- **Discovery:** opens exactly `codex.md` and `cursor.md` (hardcoded names at `combine.py:276-304`).
- **Per-reviewer field write:** `codex_response: <path>` and `cursor_response: <path>` (fixed field names at `combine.py:306-380`).
- **Cross-reference matching:** pairwise codex×cursor matching by `where` anchor (one nested loop hardcoded for two reviewers).

A 3rd reviewer's response would be **silently ignored** by `build_combined` even if `find_eligible_rounds` and `compute_combined_verdict` know about it. AC6 must generalize ALL THREE phases.

**Implementation (Phase 1: compute_combined_verdict).** Replace `compute_combined_verdict(codex_v, cursor_v)` at `combine.py:85` with:

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

**Implementation (Phase 2: build_combined response discovery and per-reviewer field write).** Replace the hardcoded codex.md/cursor.md handling at `combine.py:276-304` and `:306-380` with a loop over `request.requested_reviewers`. Concrete refactor:

```python
# OLD (hardcoded — combine.py:276-304):
codex_path = round_dir / "codex.md"
cursor_path = round_dir / "cursor.md"
codex_fm, codex_body = _lib.parse_frontmatter(codex_path) if codex_path.exists() else (None, None)
cursor_fm, cursor_body = _lib.parse_frontmatter(cursor_path) if cursor_path.exists() else (None, None)
# … later, hardcoded field writes:
combined_fm["codex_response"] = "codex.md" if codex_fm else None
combined_fm["cursor_response"] = "cursor.md" if cursor_fm else None

# NEW (per-round discovery driven by requested_reviewers):
requested = request_fm["requested_reviewers"]  # list of reviewer slugs for THIS round
responses = {}  # {reviewer_slug: (frontmatter_dict | None, body_str | None)}
for slug in requested:
    path = round_dir / f"{slug}.md"
    if path.exists():
        try:
            responses[slug] = _lib.parse_frontmatter(path)
        except ValueError:
            # 042 AC2 handles malformed; that path emits malformed_reviewer_response.
            # build_combined for the normal path doesn't see malformed files.
            raise
    else:
        responses[slug] = (None, None)

# … later, R3 HIGH #1 fix: separate schema-declared reviewer set from
# requested-for-round reviewer set. The schema-declared set is the universe
# of every reviewer EVER declared in combined.schema.json's properties; the
# requested set is per-round. combined.md must emit ALL schema-declared fields
# (with value null for unrequested or missing reviewers) so validate.py combined
# never fails on a missing required field.
schema_declared_reviewers = tuple(r.name for r in load_reviewers())  # full universe
for slug in schema_declared_reviewers:
    if slug in responses and responses[slug][0] is not None:
        combined_fm[f"{slug}_response"] = f"{slug}.md"
    else:
        combined_fm[f"{slug}_response"] = None
```

**Why this matters (R3 HIGH #1):** `combined.schema.json` currently has `cursor_response` in its `required` array. If a round dispatches with `requested_reviewers: [codex]` only (AC1b case), the round still needs `cursor_response: null` in the emitted combined.md — otherwise validate.py combined rejects. AC1b's assertion must explicitly include `validate.py combined <combined.md>` exit 0 as the falsification mechanism.

**Implementation (Phase 3: cross-reference matching for findings).** Per R2 HIGH #2, the N-way generalization MUST preserve current `combine.py:normalize_where()` (anchor extraction) AND `combine.py:cross_refs_match()` (explicit reviewer-emitted convergence override). Raw-`where` grouping regresses the default 2-reviewer deploy where existing tests rely on these semantics.

```python
# OLD (pairwise hardcoded — combine.py:311-330):
for c_finding in codex_findings:
    c_anchor, _ = normalize_where(c_finding["where"])
    matching = None
    for u_finding in cursor_findings:
        u_anchor, _ = normalize_where(u_finding["where"])
        if c_anchor == u_anchor or cross_refs_match(c_finding, rnd, "codex", u_finding, rnd, "cursor"):
            matching = u_finding
            break
    if matching:
        convergent.append({"codex": c_finding, "cursor": matching})
    else:
        divergent.append({"reviewer": "codex", **c_finding})

# NEW (N-way group-by-PRIMARY-anchor, preserves normalize_where + cross_refs_match):
# Build {primary_anchor: {reviewer_slug: finding}} via two-phase pass:
# Phase 3a — group by normalized primary anchor.
findings_by_anchor: dict[str, dict[str, dict]] = {}
for slug, (fm, _body) in responses.items():
    if fm is None:
        continue
    for f in fm.get("findings", []):
        primary, _ = normalize_where(f["where"])
        findings_by_anchor.setdefault(primary, {})[slug] = f

# Phase 3b — apply cross_refs_match override across all reviewer pairs.
# A cross_ref on reviewer X's finding pointing at reviewer Y's finding (same round)
# forces them into the same convergence bucket even if their primary anchors differ.
# This preserves the cross_ref-as-override semantics from combine.py:67-95.
def _key_for(slug: str, f: dict) -> str:
    """Stable key the cross_ref resolver uses; combines normalized primary anchor."""
    primary, _ = normalize_where(f["where"])
    return primary

# Pairwise scan for cross_ref overrides; merge buckets when matched.
all_findings = [(slug, f) for slug, (fm, _b) in responses.items() if fm for f in fm.get("findings", [])]
for i, (slug_a, f_a) in enumerate(all_findings):
    for slug_b, f_b in all_findings[i+1:]:
        if slug_a == slug_b:
            continue
        if cross_refs_match(f_a, rnd, slug_a, f_b, rnd, slug_b):
            key_a, key_b = _key_for(slug_a, f_a), _key_for(slug_b, f_b)
            if key_a != key_b:
                # Merge bucket key_b into key_a (or vice-versa); preserve all reviewers.
                merged = {**findings_by_anchor.get(key_b, {}), **findings_by_anchor.get(key_a, {})}
                findings_by_anchor[key_a] = merged
                findings_by_anchor.pop(key_b, None)

# Phase 3c — bucketize into convergent (≥2 reviewers) vs divergent (1 reviewer).
convergent = []
divergent = []
for anchor, by_reviewer in findings_by_anchor.items():
    if len(by_reviewer) >= 2:
        convergent.append({"anchor": anchor, "by_reviewer": by_reviewer})
    else:
        slug, f = next(iter(by_reviewer.items()))
        divergent.append({"reviewer": slug, "anchor": anchor, **f})
```

This preserves all three semantics of the current pairwise code: (1) `normalize_where` extracts the primary anchor (current line 311 + 316); (2) `cross_refs_match` is the explicit override that bridges different anchors when a reviewer's finding cross-references another (current line 320); (3) the convergent/divergent split is unchanged in shape. The N-way generalization rides on top.

**Falsification:** default 2-reviewer deploy behavior is identical to current pairwise logic. AC6k test exercises a `cross_ref`-bridged convergence in the 2-reviewer case to prove no regression.

**Combined.md table rendering.** Currently the body has two tables with `Source: codex | cursor`. Generalize to:
- For convergent rows: `Source` column lists ALL reviewers that flagged the anchor (e.g., `codex, cursor` or `codex, codex-arch, cursor`).
- For divergent rows: `Source` column is a single reviewer slug.

No changes to the table column structure beyond `Source` being a comma-list when multiple reviewers converge.

**Test (`n-reviewer-framework.test.ts`):**
- **AC6a — Unanimous proceed (2 reviewers):** verdicts `{codex: proceed, cursor: proceed}`, required `{codex, cursor}`, requested `{codex, cursor}` → returns `("proceed", False)`.
- **AC6b — Unanimous proceed_after_patches (1 reviewer required, 1 requested):** verdicts `{codex: proceed_after_patches}`, required `{codex}`, requested `{codex}` → returns `("proceed_after_patches", False)`.
- **AC6c — Optional cursor missing, required codex present:** verdicts `{codex: proceed, cursor: None}`, required `{codex}`, requested `{codex, cursor}` → returns `("proceed", False)`. (Tests `required: false` semantics from AC2 field semantics.)
- **AC6d — Required cursor missing past timeout, optional headless present:** verdicts `{codex: None, cursor: proceed}`, required `{codex}`, requested `{codex, cursor}` → returns `("partial_responses", True)`. Body lists cursor's `proceed` verdict.
- **AC6e — proceed-vs-pushback divergence (2 required):** verdicts `{codex: proceed, cursor: pushback}`, required `{codex, cursor}`, requested `{codex, cursor}` → returns `("divergent", True)`.
- **AC6f — Mixed proceed variants without pushback:** verdicts `{codex: proceed, cursor: proceed_after_patches}`, required `{codex, cursor}`, requested `{codex, cursor}` → returns `("proceed_after_patches", False)`. (Stricter wins.)
- **AC6g — No responses:** verdicts `{codex: None, cursor: None}`, required `{codex}`, requested `{codex, cursor}` → returns `("no_responses", True)`.
- **AC6h — 3 requested reviewers, full end-to-end (load-bearing N-way test).** Fixture setup patches ALL FOUR schema files: `reviewers.json` adds `codex-arch` row; `request.schema.json:requested_reviewers` enum adds `"codex-arch"`; `reviewer.schema.json:reviewer` enum adds `"codex-arch"`; `combined.schema.json:properties` adds `codex-arch_response: { type: ["string", "null"] }`. Round dispatched with `requested_reviewers: [codex, cursor, codex-arch]` via the REAL `request.py` (validates against patched request.schema.json). All three responses present with unanimous `proceed`, each validated via the REAL `validate.py reviewer <path>` (against patched reviewer.schema.json) and committed via the REAL `commit-reviewer-response.sh`. `combine.py` runs (against patched combined.schema.json + the REAL build_combined). Final `combined.md` validates against patched combined.schema.json. Assert: `combined_verdict: proceed`, `escalated_to_founder: false`, `combined.md` frontmatter contains all three `<slug>_response` fields, `validate.py combined <combined.md>` exits 0. **This is the falsification test for R2 HIGH #1**: proves adding a 3rd reviewer works end-to-end through every gate the queue currently runs, not just the in-memory dict.
- **AC6i — 3 requested reviewers, convergent finding across all 3:** same fixture as AC6h but all three reviewers flag the same `where` anchor with similar findings. Assert: convergent table row has `Source: codex, cursor, codex-arch` (comma-list, alphabetical) and divergent table is empty.
- **AC6j — 3 requested reviewers, one diverges:** same fixture, codex+cursor flag anchor X with finding A; codex-arch flags anchor X with finding A AND anchor Y with finding B. Assert: convergent has anchor X with all three; divergent has anchor Y with `Source: codex-arch` only.
- **AC6k — Two-reviewer default-deploy cross_ref convergence (regression guard for R2 HIGH #2).** Fixture: default `reviewers.json` (codex + cursor only), round with both responses; codex's finding has `where: "AC1 implementation"`, cursor's finding has `where: "AC1 test fixture"` (different primary anchors). Codex's finding includes `cross_ref: {round: 1, reviewer: cursor, finding_index: 1}` pointing at cursor's finding. Assert: combined.md convergent table has ONE row pairing both findings (proven by their cross_ref override bridging different anchors); divergent is empty. **This is the falsification for R2 HIGH #2** — proves the N-way refactor preserves `cross_refs_match` semantics. Build_combined would otherwise put them in divergent (different normalize_where outputs).
- **AC6l — Three-reviewer cross_ref convergence (extension of AC6k):** same as AC6k but with synthetic `codex-arch` added; codex-arch's finding has `where: "AC1 schema"` (different again) and `cross_ref: {round: 1, reviewer: codex, finding_index: 1}` pointing at codex's. **Additionally**: codex's finding has `cross_ref: {round: 1, reviewer: "codex-arch", finding_index: 1}` (a default-deploy reviewer pointing at the new reviewer). Assert: (i) convergent has ONE row with all three reviewers; divergent empty; (ii) `validate.py reviewer <codex.md>` exits 0 (proves the `findings[].cross_ref.reviewer` enum in `reviewer.schema.json` was updated per R3 MED #3 — without that update, validate rejects codex.md with `'codex-arch' is not one of ['codex', 'cursor']`). This is the falsification for R3 MED #3.

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
| AC1 | `tests/review-queue/n-reviewer-framework.test.ts` | 6 (AC1a/b + AC1c/d/e required×mode×timeout matrix + AC1f cross-round roster propagation) | Tests reviewer prompt + combine.py + dispatch-next-round.py honor `requested_reviewers` AND `required` flag AND propagate roster |
| AC2 | Same file | 4 (AC2a invalid-config; AC2b cache idempotent; AC2c explicit-path; AC2d mode×timeout contract) | reviewers.json validation + caching |
| AC3 | Same file | 4 (AC3a smoke-with-env-var; AC3b missing-env-var; AC3c unknown-slug w/ literal-string match; AC3d ide-mode-rejection) | Shared helper scripts; PYTHONPATH set per R2 MED #5; literal-string assertions guard against ModuleNotFoundError leakage |
| AC4 | Same file | 3 (AC4a race-with-combined.md; AC4b no-race-happy-path; AC4c race-with-os.link-already-linked) | Race-fix in reviewer prompt's Step 5 (NOT commit-reviewer-response.sh) |
| AC5 | Update `tests/review-queue/schemas.test.ts` | 1 (hyphenated-slug fixture) | Schema regex widening |
| AC6 | Same as AC1 | 12 (AC6a-g verdict roll-up + AC6h end-to-end through ALL schema gates + AC6i 3-reviewer convergent + AC6j 3-reviewer divergent + AC6k 2-reviewer cross_ref convergence regression guard + AC6l 3-reviewer cross_ref chain) | N-way `compute_combined_verdict` + `build_combined` generalization preserving `normalize_where` + `cross_refs_match`; AC6h is THE end-to-end falsification through real schemas |
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
- `tools/review-queue/commit-reviewer-response.sh` (R3 HIGH #2: drop the hardcoded `case codex|cursor` reviewer-name check at lines 37-43; validate.py's schema enum is the gate. No AC4 race-guard change here; AC4 lives in reviewer prompts.)
- `tools/review-queue/dispatch-next-round.py` (R2 HIGH #3: pass `--reviewers=<comma-list>` to `request.py` for r<N+1>, sourced from the current round's `request.requested_reviewers`)
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
