---
item_id: 2026-05-13-044-reviewer-cycle-infrastructure-debt
round: 1
combined_at: '2026-05-13T20:29:47Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: null
combined_verdict: pushback
escalated_to_founder: false
---

# Combined findings

Strategist union-find pass: combine.py's automated cross_ref matcher did not collapse same-semantics findings because `where` strings differed in form (codex used `§AC2 Direct-invoke pattern + tools/review-queue/_run_reviewer.sh:21`, codex-ops used `AC2 - Direct-invoke pattern for manual reviewer force-fires`). The strategist manually pairs the 8 findings into 5 distinct issues below.

## Convergent findings (strategist-paired)

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| C1 | HIGH | codex (1) + codex-ops (5) | §AC2 direct-invoke command | spec-patch | AC2's force-fire example rewritten to use the existing `run-codex-reviewer.sh` (and `run-codex-ops-reviewer.sh`) drivers per 043 AC3's 5-line-driver convention. The drivers export `REVIEWER_NAME` before exec'ing `_run_reviewer.sh`; the original positional-arg shape would have exited at `_run_reviewer.sh:15` under `set -u`. |
| C2 | HIGH | codex (3) + codex-ops (6) | §Pre-flight step 1 codex-ops `timeout_hours` | spec-patch | §Pre-flight reviewers.json snippet changed from `timeout_hours: 0.5` → `timeout_hours: null`. `_reviewers.py:94` enforces headless-must-be-null. AC3 updated to note headless rows always carry null; the per-reviewer policy applies via `FALLBACK_TIMEOUT_HOURS = 0.5`. (Strategist note: this was already the as-built state — the pre-flight commit `a13e52b` deviated to null already; the spec text was the lagging artifact. Patch now aligns the two.) |
| C3 | HIGH/MED | codex-ops (7) + codex MED (4) | §AC3 round-level eligibility semantics | spec-patch | AC3 adds change #4: explicit `not_yet_due` per-reviewer state. A round becomes combine-eligible only when EVERY missing required reviewer has individually exceeded its per-reviewer timeout. Prevents the silent-mis-timeout failure mode where a fast headless reviewer's 0.5h elapsed would have falsely combined a round while Cursor (2h timeout) is still inside its window. AC3 test plan expanded to AC3a–AC3d covering the not_yet_due, all-timed-out, fast-responded-slow-pending, and CLI-override cases. |

## Divergent findings (single-reviewer)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| D1 | HIGH | codex (2) | §AC2 docs-grep test | spec-patch | The original grep `! grep -r "launchctl kickstart" .claude/commands/ docs/review-queue-setup.md tools/review-queue/` is unsatisfiable at HEAD — it matches three legitimate uses: `_install_reviewer_launchd.sh:95` (`--smoke` one-shot path, not a steady-state force-fire), `.claude/commands/merge-and-cleanup.md` (daemon-restart prose; out of 044 scope), `.claude/commands/review-queue-codex-ops.md` (documents the friction as 044 motivation). Narrowed scope to `.claude/commands/review-queue-watch.md docs/review-queue-setup.md` — the two files 044 actually edits. Out-of-scope clarification added to AC2 body. |
| D2 | HIGH | codex-ops (8) | §AC4 watcher contract sprawl | spec-patch | AC4 reframed to flip only `escalated_to_founder` (no new `combined_verdict` enum value). Contract change concentrated in 2 places (combine.py emission + `.claude/commands/review-queue-watch.md` Step 3 prose) instead of 4 — `dispatch-next-round.py` is untouched, `combined.schema.json` enum is unchanged. Removes the silent-failure risk where a new verdict would have bypassed the watcher's existing branch logic. AC4 test names updated accordingly (AC4a–AC4e all verify `partial_responses` + the `escalated_to_founder` flag, not a new enum). |

## Convergence call

`needs R2 — focus_hints: Verify C1 spec example now uses run-<reviewer>-reviewer.sh driver (not _run_reviewer.sh <slug> positional). Verify C2 reviewers.json snippet is timeout_hours: null, AC3 documents headless-must-be-null. Verify C3 not_yet_due round-level rule is specced in AC3 change #4 with AC3a–AC3d tests. Verify D1 docs-grep is narrowed to .claude/commands/review-queue-watch.md docs/review-queue-setup.md only. Verify D2 AC4 reframe uses partial_responses + escalated_to_founder: false (NO new enum value), and dispatch-next-round.py is untouched. 044 is class:narrow; target ≤3 rounds per Definition of Done step 5. R2 should converge if these 5 patches are clean; if Codex finds new issues outside this set, those are scope-creep and the strategist defers them to follow-ups.`

