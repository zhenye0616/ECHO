---
id: 2026-05-13-044-reviewer-cycle-infrastructure-debt
title: Reviewer-cycle infrastructure debt — fix the 4 compounding frictions from 043's dogfooding (autostash + direct-invoke wrapper + per-reviewer timeout + single-reviewer auto-disposition)
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
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - backlog/complete/2026-05-13-043-per-round-reviewer-roster.md   # Direct parent. 043 shipped the N-reviewer framework but explicitly deferred the 4 friction items below ("Out of scope: ... dirty-tree fix, single-reviewer-escalate, launchd kickstart bug, timeout default change"). 043's own review_notes named 044 as the falsification-bundle item; the founder has redirected 044's scope to the friction-fix cluster instead, and bundled the falsification *into the cycle itself* via the codex-ops deployment in §Pre-flight.
  - backlog/complete/2026-05-12-042-reviewer-emission-yaml-validation.md  # 042's own _followups.md seed first identified items #1, #2, #3, #4 as recurring. 043 did not address. This spec closes that loop.
  - backlog/_followups.md                                                # Top of file documents the 13-item friction list from 043's dogfooding. AC1-AC4 below address items #1-#4 (the top-4 compounders, >70% of cycle overhead). Items #5-#13 explicitly OUT OF SCOPE.
  - raw/internal/dogfooding/mcp-interactions-journal.md                  # The 043-cycle journal entries that document each friction's per-tick cost (~15-20 ticks for #1, ~8 rounds for #2/#3/#4). Empirical input for the 044 spec scope decision.
  - .claude/commands/review-queue-watch.md                               # AC1 touch: line 11 `git pull --rebase origin main` → `git -c rebase.autoStash=true pull --rebase origin main`. AC4 touch: Step 3 prose branches on `escalated_to_founder` for `combined_verdict: partial_responses` (auto-disposition path when false; founder-escalation path when true).
  - tools/review-queue/push-with-retry.sh                                # AC1 EXTENSION (r2 disposition): line 25's inner `git pull --rebase` also gets `-c rebase.autoStash=true`. combine.py shells out to this helper for terminal/disposition pushes; if only watcher Step 1 had autostash, friction #1 would persist in the helper's inner pull. Both call sites must change. Fallback semantics (PUSH-RACE-FALLBACK logging) untouched.
  - tools/review-queue/run-codex-reviewer.sh                             # AC2: the canonical 5-line driver (per 043 AC3) that exports REVIEWER_NAME and execs _run_reviewer.sh. AC2 documents direct-invoke via this driver (NOT `_run_reviewer.sh codex` — that fails fast because the wrapper consumes REVIEWER_NAME from env, not positional args).
  - tools/review-queue/_run_reviewer.sh                                  # AC2 NOT touched as code. Referenced because r1 reviewers caught that direct-invoke must go through `run-<reviewer>-reviewer.sh` driver (which exports REVIEWER_NAME). The wrapper itself remains unchanged.
  - tools/review-queue/combine.py                                        # AC3 touch: `DEFAULT_TIMEOUT_HOURS = 2.0` at :39 becomes per-reviewer config lookup; new `FALLBACK_TIMEOUT_HOURS = 0.5` applies when reviewer.timeout_hours is null (mandatory for headless reviewers per _reviewers.py:94). `find_eligible_rounds()` adds the `not_yet_due` gate per AC3 change #4. `--timeout-hours` CLI flag stays for ad-hoc override. AC4 touch: `combined_verdict: partial_responses` path at :114-119 + :358 flips `escalated_to_founder: false` for the single-missing-AND-present-proceeds sub-case ONLY; multi-missing + pushback paths retain `escalated_to_founder: true`. NO new enum value (verdict stays `partial_responses`).
  - tools/review-queue/reviewers.json                                    # AC0 touch (Pre-flight): add codex-ops row with `timeout_hours: null` (mandatory for `mode: headless` per `_reviewers.py:94`). Existing rows untouched.
  - tools/review-queue/schemas/request.schema.json                       # AC0 touch: `requested_reviewers.items.enum` gets `"codex-ops"`. AC4 touch: NO schema change — `partial_responses` enum value already exists per 043 AC6.
  - tools/review-queue/schemas/reviewer.schema.json                      # AC0 touch: `reviewer` enum + `findings[].cross_ref.reviewer` enum both get `"codex-ops"`. 043's "Adding a Reviewer Changelist" — 4th of the 5 files.
  - tools/review-queue/schemas/combined.schema.json                      # AC0 touch: declare `codex-ops_response` optional field (mirrors `codex_response`, `cursor_response` shape). 5th of the 5 files per 043.
  - .claude/commands/review-queue-codex-ops.md                           # AC0 NEW FILE: codex-ops slash-command prompt. Operational/runtime perspective — see §Pre-flight for the prompt template. The 6th component of 043's "Adding a Reviewer Changelist" (5 files + 1 slash-command).
blocked_by: []
suggested_builder: any  # Shell + Python + schema work. ~5 files touched + 1 new file. No new dependencies, no UI, no MCP/storage churn. Builder may be Claude Code, Cursor's Claude, or any agent — Cursor-domain delegation does not apply here.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
review_notes: ""
---

# Reviewer-cycle infrastructure debt — friction-044

## Why this spec exists

After 043's dogfooding cycle (8 review rounds, ~3 hours strategist time), 13 friction items were enumerated. Four of them — **the top-4 compounders** — accounted for >70% of per-cycle overhead, and **all four were already named in 042's `_followups.md` seed**. 043 chose architectural generalization over infrastructure debt; 044 inverts that priority.

This spec is the explicit anti-thesis to 043's scope-creep pattern. It is deliberately tight, deliberately narrow, and deliberately defends against the same reviewer-driven inflation that grew 043 from ~700 to ~1200 spec lines over 8 rounds.

### The four compounders

| # | Friction | Per-cycle cost (043) | Cure |
|---|---|---|---|
| 1 | Dirty-tree stash dance — every cron-fired `/review-queue-watch` failed `git pull --rebase` on dirty journal + queue-errors files; manual stash → pull → combine → pop ~30s per tick | ~15-20 ticks | AC1: `git -c rebase.autoStash=true` in watcher Step 1 |
| 2 | `launchctl kickstart` silently broken — increments `runs` but wrapper exits before log opens | ~8 force-fires per cycle | AC2: direct-invoke pattern for manual force-fires (cron path unchanged) |
| 3 | Force `combine.py --timeout-hours=0` every round (default 2h waits for Cursor) | ~8 rounds × manual flag | AC3: per-reviewer `timeout_hours` from reviewers.json; `DEFAULT_TIMEOUT_HOURS = 2.0` deprecated |
| 4 | Single-reviewer-timeout escalation override — strategist manually re-dispositions every "escalated to founder" case where the present reviewer's verdict is already actionable | ~8 dispositions per cycle | AC4: combine.py auto-dispositions the single-missing-AND-present-proceeds sub-case |

The compound-interest framing: each cycle pays these costs again because the cure was deferred. 043's R1 spec growth proves the reviewer pattern is biased toward expansion; the strategist counterweight failed at R1, so the costs propagated. Closing items #1-#4 is the *first* compound-interest-positive infrastructure spend since the review-queue framework shipped (039 → 040 → 041 → 042 → 043 were all framework-expansion; 044 is framework-maintenance).

## Pre-flight (strategist must complete before dispatching r1)

This spec is also the **first production exercise of 043's "Adding a Reviewer Changelist"**. Closing AC1-AC4 is the substantive work; the act of dispatching this spec's review with `requested_reviewers: ["codex", "codex-ops"]` is the load-bearing falsification of 043's framework (the second 044 candidate from `_followups.md:675` collapsed into this cycle).

The pre-flight is **6 edits before r1 dispatches**:

1. **`tools/review-queue/reviewers.json`** — append a `codex-ops` row:
   ```json
   {
     "name": "codex-ops",
     "mode": "headless",
     "required": true,
     "timeout_hours": null,
     "slash_command": "review-queue-codex-ops"
   }
   ```
   Note: `timeout_hours: null` is mandatory for `mode: headless` reviewers — `_reviewers.py:94` enforces this rule because headless reviewers are launchd-driven (no human-timeout concept applies). The AC3 `FALLBACK_TIMEOUT_HOURS = 0.5` policy applies at combine time for any reviewer whose `timeout_hours` is `null`. Disposition for r1 finding "Pre-flight headless-timeout conflict" (convergent codex HIGH #3 + codex-ops HIGH #2).

2. **`tools/review-queue/schemas/request.schema.json`** — append `"codex-ops"` to `requested_reviewers.items.enum`.

3. **`tools/review-queue/schemas/reviewer.schema.json`** — append `"codex-ops"` to BOTH the top-level `reviewer` enum AND `findings[].cross_ref.reviewer` enum.

4. **`tools/review-queue/schemas/combined.schema.json`** — declare an optional `"codex-ops_response": { "type": ["string", "null"] }` field mirroring the existing `codex_response` / `cursor_response` shape.

5. **`.claude/commands/review-queue-codex-ops.md`** — NEW slash-command prompt. Template:

   ```markdown
   # codex-ops review — operational / runtime perspective

   You are codex-ops, the operational/runtime perspective reviewer in ECHO's cross-tool review queue. Your lens is **"what breaks in production?"** Read the spec, the prior rounds' findings, and the codebase touched, looking for runtime failure modes that the implementation-perspective `codex` reviewer may miss.

   ## Your lens (in priority order)

   1. **Cron / scheduler interaction** — what fails when this code runs inside a cron-fired tick? What happens if the tick fires mid-disposition of the previous round? What happens if launchd's `StartInterval` overlaps a prior wrapper still running?
   2. **Dirty-tree / autostash failure modes** — when `git pull --rebase` is run with `rebase.autoStash=true`, what happens if the stashed changes conflict with incoming commits? What's the recovery path?
   3. **Launchd / wrapper / shell exit semantics** — what happens when `set -euo pipefail` interacts with a backgrounded subshell? What happens when the wrapper exits non-zero (does the next tick still fire)? What happens when stdout/stderr redirection targets a non-existent directory?
   4. **Race conditions** — what if two reviewer ticks race? What if a reviewer writes its `<name>.md` between combine.py's existence check and the strategist's combined-emission? (043 AC4 closed one such race; surface any others.)
   5. **Operational observability** — when the cure for friction #N inevitably fails in some new way, will the operator (strategist or founder) know? Is there a log line, an exit code, a tracked failure mode?

   ## Your output

   Identical schema to `codex` reviewer (`reviewer.schema.json`). The differentiator is your *focus*, not your shape. Findings should be operational concerns, not implementation correctness — leave the latter to `codex`.

   ## Pinning

   You review at `request.spec_commit_sha`. Do not review against `main` HEAD. Per 043 AC1, exit no-op if `codex-ops` is not in `request.requested_reviewers`.
   ```

6. **Install the launchd job:**
   ```bash
   tools/review-queue/_install_reviewer_launchd.sh codex-ops --smoke
   ```
   Per 043 AC3 the install script writes `~/Library/LaunchAgents/com.echo.review-queue-codex-ops.plist`, points it at `_run_reviewer.sh` with `REVIEWER_NAME=codex-ops`, and bootstraps. `--smoke` flag fires a one-shot test before going live.

Once the 6 pre-flight steps land in a single commit and push to `origin/main`, dispatch r1 via:
```bash
tools/review-queue/request.py 044-reviewer-cycle-infrastructure-debt --reviewers=codex,codex-ops --spec-sha=<spec-commit>
```

Cursor is intentionally **not** in this spec's review roster. Cursor stays in `reviewers.json` with `required: true` (unchanged for non-044 specs); only this spec's `requested_reviewers` omits it. Per 043 AC1, an unrequested reviewer no-ops. Rationale: Cursor was the slow path causing frictions #3 (force-timeout) and #4 (escalation override) in the 043 cycle; running 044 without Cursor is both the YAGNI move and the empirical test that the codex-only path is viable.

## Acceptance Criteria

### AC1 — Watcher transaction uses autostash on EVERY `git pull --rebase`

**Touch:**
- `.claude/commands/review-queue-watch.md:11` — Step 1 pull
- `tools/review-queue/push-with-retry.sh:25` — the inner-pull-then-push retry loop

**Change:** Both call sites change `git pull --rebase origin main` → `git -c rebase.autoStash=true pull --rebase origin main`.

Disposition for r2 codex-ops HIGH (the "AC1 incompleteness" finding): the watcher's Step 1 is not the only `git pull --rebase` in the transaction — `combine.py` shells out to `push-with-retry.sh` for its disposition + terminal pushes (per `combine.py:~177`), and `push-with-retry.sh:25` runs its own `git pull --rebase` before retrying the push. If only Step 1 has autostash, the watcher still hits the dirty-tree block at `push-with-retry.sh:25`, and friction #1 isn't actually eliminated. Both sites must change. This is scope-completion (extending the cure to where it's load-bearing), not scope-creep.

**Why:** Eliminates the per-tick stash dance for friction #1 (and the cascading #5 push-with-retry fallback loop, since the underlying dirty-tree condition no longer blocks the pull). The autostash flag is git's built-in mechanism since 2.6: stash → pull → pop, atomically, with proper conflict surfacing if the pop fails.

**Out-of-scope drift to defend against:** Do NOT generalize autostash to slash commands outside the strategist watcher transaction — specifically: `.claude/commands/process-backlog.md`, `process-backlog-batch.md`, `merge-and-cleanup.md`, and the reviewer prompts (`review-queue-codex.md`, `review-queue-cursor.md`, `review-queue-codex-ops.md`) are explicitly out of scope. Their pulls run at tick-start when the tree should already be clean; the friction surface 044 targets is the *watcher transaction*. Do NOT modify `push-with-retry.sh`'s fallback semantics (only the autostash flag is added to its inner pull; the fallback to logging `PUSH-RACE-FALLBACK` rows remains intact as a tripwire).

**Test:** Add a fixture-based test under `tests/review-queue/` that exercises the full watcher transaction under a dirty tree, not just Step 1:
1. Initializes a fixture repo (per the 041 `ECHO_REVIEW_QUEUE_REPO_ROOT` smoke pattern).
2. Stages a fresh `r<N>/request.md` and reviewer responses that will trigger combine + push.
3. Creates a dirty journal file in the working tree BEFORE invoking the watcher.
4. Runs the equivalent of the watcher Step 1 pull THEN `combine.py` (which exercises `push-with-retry.sh`'s inner pull on its terminal/disposition push).
5. Asserts: both pulls succeeded; the combined.md was committed and pushed; the dirty journal file is preserved on the working tree post-transaction; `queue-errors.md` got zero new `PUSH-RACE-FALLBACK` rows during the transaction (the cure is verified by absence of fallback rows, not just by transaction success).

### AC2 — Direct-invoke pattern for manual reviewer force-fires

**Touch:** Documentation in `docs/review-queue-setup.md` and the strategist's `/review-queue-watch` slash command (any user-facing reference to `launchctl kickstart`).

**Change:** Replace any documented `launchctl kickstart -k gui/$(id -u)/com.echo.review-queue-<slug>` invocation with a direct-invoke of the existing per-reviewer wrapper driver (the 5-line script established by 043 AC3):
```bash
nohup tools/review-queue/run-codex-reviewer.sh >> /tmp/review-queue-codex-$(date +%s).log 2>&1 &
```
Equivalent for codex-ops (`run-codex-ops-reviewer.sh`) and any other headless reviewer. The driver exports `REVIEWER_NAME=<slug>` before `exec`ing `_run_reviewer.sh`, which is the contract `_run_reviewer.sh` expects (it fails fast with `set -u` if `REVIEWER_NAME` is unset). Disposition for r1 finding "AC2 force-fire CLI wrong" (convergent codex HIGH #1 + codex-ops HIGH #1): the original `nohup _run_reviewer.sh codex` would have exited at line 15 because `_run_reviewer.sh` consumes `REVIEWER_NAME` from env, NOT from positional args.

**Why:** `launchctl kickstart -k` increments the launchd `runs` counter but the wrapper exits before its log file opens for write — a 042-era footgun that 043's `_run_reviewer.sh` refactor did not address. The direct-invoke pattern (background bash via the existing driver + log redirect) bypasses launchd entirely for manual fires while preserving the cron-fired `StartInterval=600s` pathway for unattended ticks.

**Out-of-scope drift to defend against:** Do NOT remove launchd. Do NOT change the launchd plist contents. Do NOT change `_run_reviewer.sh` itself. Do NOT change the per-reviewer 5-line driver shape. This is documentation-only: the *manual force-fire pathway* changes; the *unattended cron pathway* is untouched.

**Test:** Narrowly-scoped docs-grep (codex HIGH #2 disposition — the original grep matched legitimate launchctl uses in `_install_reviewer_launchd.sh:95` for `--smoke`, `.claude/commands/merge-and-cleanup.md`'s daemon-restart prose, and `review-queue-codex-ops.md`'s own documentation of friction #2). Grep is scoped to the two files that 044 actually edits:
```bash
! grep -n "launchctl kickstart" .claude/commands/review-queue-watch.md docs/review-queue-setup.md
```
This must pass with zero matches once the docs are updated. `_install_reviewer_launchd.sh`'s `--smoke` use of `launchctl kickstart` is legitimate (one-shot test, not a steady-state force-fire) and explicitly allowed; `merge-and-cleanup.md`'s daemon-restart prose is out of 044's scope.

### AC3 — Per-reviewer timeout from reviewers.json

**Touch:** `tools/review-queue/combine.py:39, :208, :265, :669, :679`

**Change:**

1. `DEFAULT_TIMEOUT_HOURS = 2.0` at line 39 → removed; replaced with `FALLBACK_TIMEOUT_HOURS = 0.5` (used only when a reviewer has `timeout_hours: null` — the mandatory value for `mode: headless` reviewers per `_reviewers.py:94` — AND no `--timeout-hours` CLI override is present).
2. `find_eligible_rounds()` and downstream callers consume the per-reviewer `timeout_hours` from `_reviewers.load_reviewers()`, not a global default. For each reviewer in `request.requested_reviewers`, look up their `timeout_hours` from reviewers.json; treat `null` as `FALLBACK_TIMEOUT_HOURS`.
3. CLI flag `--timeout-hours` stays for ad-hoc override (debug / fixture cases) but is no longer the policy default. When set, it overrides ALL reviewers' per-reviewer values (current semantics).
4. **Round-level eligibility rule (disposition for r1 codex-ops HIGH #3 + codex MED #4 — the "not_yet_due" semantic):** A round becomes combine-eligible only when EVERY missing required reviewer has individually exceeded its per-reviewer timeout (`FALLBACK_TIMEOUT_HOURS` for null entries; the per-reviewer value otherwise). Reviewers whose own timeout has not yet elapsed are in `not_yet_due` state and gate the round — combine.py refuses to emit `combined.md` while any required reviewer is `not_yet_due`. This prevents the silent-mis-timeout failure mode where a fast headless reviewer's 0.5h elapsed would have falsely combined a round in which Cursor (2h timeout) was still inside its window. The rule is round-level (per existing `find_eligible_rounds()` shape); per-reviewer state is computed inside that gate.

**Why:** Eliminates friction #3 (manual `--timeout-hours=0` every round). The per-reviewer field already exists in 043's `reviewers.json` schema (`timeout_hours: 2` for cursor, `null` for codex); 043 specced it but `combine.py` never read it. Reading it closes the loop. Cursor's 2h timeout is preserved (rare-event correctness); codex/codex-ops at 0.5h fallback becomes the fast path. The not_yet_due rule (change #4) preserves cursor's rare-event correctness *even when faster reviewers are also missing*.

**Out-of-scope drift to defend against:** Do NOT make `--timeout-hours` per-reviewer (i.e., `--timeout-hours=codex:0,cursor:2`). Single CLI override remains all-reviewers. Do NOT change the eligibility-rounds query semantics beyond the timeout source + not_yet_due gate. Do NOT relax `_reviewers.py:94`'s headless-must-be-null rule.

**Test:** Extend `tests/review-queue/combine.test.ts` (or wherever `find_eligible_rounds` is tested):
1. **AC3a — per-reviewer eligibility:** Fixture: 2 reviewers, one `timeout_hours: 0.1`, one `timeout_hours: 2`. Set `requested_at` to 10 minutes ago. Both reviewers absent. Assert: round is NOT eligible (cursor's slot is `not_yet_due`; the 0.1h reviewer's slot HAS timed out, but the round is gated by the slowest still-pending reviewer).
2. **AC3b — all-timed-out:** Same fixture, advance to 2.5h elapsed. Both reviewers still absent. Assert: round IS eligible (both slots have timed out).
3. **AC3c — fast-responded-slow-pending:** Same fixture at 10 min elapsed, the 0.1h reviewer responded. Assert: round is NOT eligible (the slow reviewer is `not_yet_due` and the round still waits for it, the same way 043 currently treats missing required reviewers).
4. **AC3d — CLI override:** Re-run AC3a with `--timeout-hours=2` CLI flag; assert: both slots gated by 2h (override semantics, no not_yet_due distinction).

### AC4 — Single-reviewer auto-disposition

**Touch:** `tools/review-queue/combine.py:114-120, :358, :585`; `.claude/commands/review-queue-watch.md` Step 3 (watcher prose for the new `escalated_to_founder: false` partial-response path).

**Change:**

Disposition for r1 codex-ops HIGH #4 (the watcher-contract sprawl): keep the verdict enum unchanged (no `proceed_after_patches_partial` addition). Make AC4 a single-flag change: the existing `combined_verdict: partial_responses` value (043 AC6) stays the carrier; only the `escalated_to_founder` flag flips.

`compute_combined_verdict()` and the combined.md emission path treat the case **"exactly one requested reviewer missing AND every present reviewer's verdict is `proceed` or `proceed_after_patches`"** as `escalated_to_founder: false`:

- `combined_verdict: partial_responses` (UNCHANGED — existing enum value reused)
- `escalated_to_founder: false` (NEW for this sub-case; was `true` in 043 AC6)
- `next_round: null` ALWAYS (the strategist watcher fills `next_round` after disposition — combine.py never auto-fills it, preserving the 043 contract that `dispatch-next-round.py` is the sole `next_round` writer)
- The combined.md body explicitly notes the missing reviewer as a divergent row ("reviewer X: did not respond; per 044 AC4 single-reviewer auto-disposition") so the watcher's path-(a)/(b)/(c) decision logic still sees the partial-response signal.

The remaining `partial_responses` sub-cases stay `escalated_to_founder: true`:
- **Multi-missing** (≥2 reviewers absent)
- **Pushback-with-missing** (any present reviewer pushed back AND a reviewer is missing)

Watcher prose update in `.claude/commands/review-queue-watch.md` Step 3: when reading a `combined.md` with `combined_verdict: partial_responses`, branch on `escalated_to_founder`. If `true`, treat as founder-escalation (existing path; ping founder, do not disposition). If `false`, treat as auto-disposition: the present reviewer's findings flow through the existing path-(a)/(b)/(c) disposition prose as if all-requested reviewers had responded, with the missing reviewer's row pre-filled "missing — per 044 AC4." `dispatch-next-round.py` is unchanged (it never reads `escalated_to_founder`; its mapping is keyed on `combined_verdict` + `next_round`, both of which retain their 043 semantics).

**Why:** Eliminates friction #4 (manual strategist re-disposition every cycle). The single-reviewer-missing-AND-present-reviewer-proceeds case is the overwhelming majority of "escalated" events in 042/043; the strategist was always dispositioning them the same way. Codifying the policy as a flag flip (rather than a new verdict) keeps the schema enum stable, keeps `dispatch-next-round.py` untouched, and concentrates the contract change in two places (combine.py emission + watcher Step 3 prose) instead of four.

**Out-of-scope drift to defend against:** Do NOT change the multi-missing escalation semantics. Do NOT change the pushback escalation semantics. Do NOT auto-disposition past 1 missing reviewer. Do NOT remove the founder-escalation pathway entirely; it must still fire for the cases that genuinely need a human. Do NOT add a new `combined_verdict` enum value — the existing `partial_responses` is sufficient.

**Test:** Extend `tests/review-queue/combine.test.ts`:

1. **AC4a — single-missing-proceed → auto-disposition:** 2 reviewers requested, 1 responds `proceed`, 1 missing past timeout. Assert: `combined_verdict: partial_responses`, `escalated_to_founder: false`, `next_round: null`, combined.md body lists missing reviewer as divergent row.
2. **AC4b — single-missing-proceed_after_patches → auto-disposition:** 2 reviewers, 1 responds `proceed_after_patches` with findings, 1 missing. Assert: `combined_verdict: partial_responses`, `escalated_to_founder: false`, `next_round: null` (watcher fills via dispatch-next-round.py).
3. **AC4c — single-missing-pushback → still escalates:** 2 reviewers, 1 responds `pushback`, 1 missing. Assert: `combined_verdict: partial_responses`, `escalated_to_founder: true` (preserved).
4. **AC4d — multi-missing → still escalates:** 3 reviewers requested, 1 responds `proceed`, 2 missing. Assert: `combined_verdict: partial_responses`, `escalated_to_founder: true` (preserved).
5. **AC4e — codex-only-with-codex-ops-missing (the 044-cycle native case):** Mirrors AC4a with the exact reviewer roster this spec dispatches under. Falsifies the policy on the precise shape of the codex+codex-ops deploy.

## Out of Scope (Don't Drift)

The 043 cycle taught that reviewer pattern is biased toward expanding scope. The strategist counterweight failed at R1. 044 explicitly defends against the same failure mode by enumerating what NOT to do:

- **Friction items #5–#13 from the 043 enumeration.** Including #6 spec-inflation feedback loop, #11 disposition drift, #12 path-(c) fuzzy criterion. Some of those are *process* concerns not addressable by infrastructure code; they belong in operating-model retrospectives, not this spec.
- **Generalizing the autostash flag** to slash commands other than `/review-queue-watch`. If `/process-backlog` or others also benefit, that's a separate item.
- **Removing `launchctl` entirely** from the reviewer-dispatch architecture. The cron-fired pathway works correctly; only the manual-force-fire pathway is broken. Do not redesign the scheduler.
- **Per-reviewer `--timeout-hours` CLI flag** (e.g., `--timeout-hours=codex:0,cursor:2`). YAGNI — the per-reviewer-from-reviewers.json policy covers the actual use case.
- **Auto-dispositioning past 1 missing reviewer.** 2+ missing is a real signal that something is wrong with the infrastructure; founder-escalation is correct.
- **Removing Cursor from the framework / reviewers.json.** Cursor stays as `required: true` for non-044 specs. This spec's review just omits Cursor; that's a per-spec roster choice, not a global framework change.
- **Changing the launchd plist or `_run_reviewer.sh` itself.** AC2 is documentation-only.
- **Changing the founder-gate semantics in `/merge-and-cleanup`.** Out of scope. AC4 only changes the *escalation trigger condition*, not what the founder does on escalation.
- **Refactoring `combine.py`'s eligibility-rounds query beyond the timeout-source change.** The 043 spec already touched this code surface heavily; minimize re-disturbance.

## Definition of Done

1. Pre-flight 6 edits land on `main` in a single commit (codex-ops deployed via 043's "Adding a Reviewer Changelist").
2. r1 dispatched via `request.py --reviewers=codex,codex-ops`.
3. AC1–AC4 implemented per their per-AC test specs.
4. Empirical measurement during 044's own review cycle:
   - **Friction #1 count:** target 0 (autostash should make stash dance vanish).
   - **Friction #3 count:** target 0 (`combine.py` should not need `--timeout-hours=0` override).
   - **Friction #4 count:** target 0 (single-missing-proceed auto-dispositions).
5. Round count: target ≤3 (the structural-reform baseline; 043's 8 was the anomaly).
6. `npm test` post-merge: all new AC1/AC3/AC4 tests pass; pre-existing `concurrency.test.ts:133` orphan-cleanup may continue failing (out of scope here, same as 042 + 043).
7. Friction-046 (or whatever's next) journal entries report 0 instances of items #1, #3, #4 across the cycle. Item #2 should also be 0 if the strategist follows the new direct-invoke recipe.

## After Completion (Strategist Notes)

Once 044 lands in `complete/`, the strategist should:

1. **Update `wiki/operating-model/cross-tool-spec-review.md`** with the per-reviewer-timeout pattern and the single-reviewer auto-disposition policy.
2. **Promote `wiki/operating-model/adding-a-new-reviewer.md`** (new page) — codex-ops is the first non-default reviewer ever deployed; document the 6-edit recipe used in §Pre-flight as the canonical pattern for future reviewer additions.
3. **Update `wiki/principles/drift-prevention.md`** with the 044 lesson: "When a prior spec's `_followups.md` seed names the same infrastructure friction across multiple cycles, that friction should be prioritized over the next architectural item. Compound interest is real; the cure-debt-first principle applies to operating-model infrastructure as much as to product code."
4. **Append the empirical results from Definition of Done step 4 to `mcp-interactions-journal.md`** as the close-of-window entry. Compare with 043's friction counts in the same file format.
5. **Decide whether `codex-ops` becomes a permanent default reviewer** (alongside `codex`) for all future specs, OR stays an opt-in roster for ops-heavy specs. This is a project-wide decision that 044's empirical cycle should inform — not a 044 acceptance criterion.

## Risk register

- **Codex-ops deployment fails the framework** — if the 6-edit pre-flight reveals that 043's "Adding a Reviewer Changelist" is missing a step (e.g., the install script errors, or `_run_reviewer.sh` doesn't accept arbitrary slugs), 044's first r1 cannot dispatch. Mitigation: pre-flight smoke (`--smoke` flag) runs before r1 dispatch. If smoke fails, escalate to founder and file findings against 043 retrospectively — that's an empirical contribution either way.
- **Codex-ops findings are correlated with codex findings** — if codex-ops's ops-perspective prompt doesn't differentiate enough, both reviewers will agree on the same findings and the "two codex" experiment proves only that the framework dispatches correctly, not that adding a perspective adds signal. Mitigation: the prompt template in §Pre-flight explicitly lists 5 ops-only lenses; if codex-ops's r1 still produces purely implementation-correctness findings, that's a prompt-tuning iteration (not a 044 scope item — log to journal and tighten in the next cycle).
- **AC4 auto-disposition mis-fires** — the single-reviewer-missing-AND-proceeds case may have edge cases (e.g., proceed-with-findings that the strategist would have wanted to surface to founder anyway). Mitigation: AC4 keeps the existing `combined_verdict: partial_responses` enum value and flips only `escalated_to_founder` for the narrow single-missing-proceed sub-case; the strategist watcher reads both `combined_verdict` and `escalated_to_founder` and dispositions normally through the existing path-(a)/(b)/(c) when `escalated_to_founder: false`. The founder-escalation pathway stays wired for multi-missing + pushback-with-missing.
