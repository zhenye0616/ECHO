---
id: 2026-06-04-089-legacy-spec-review-gate-teardown
title: "Tear down the legacy spec_review dual-read claim path (088 migration step 8) — make folder-location + ready_content_sha the sole claim contract"
status: proposed
priority: MED
estimate: 0.5d
created: 2026-06-04
blocked_by: []
task_state_ref: 2026-06-04-089-legacy-spec-review-gate-teardown
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: f4401d9ef8f399e247551aac954121dbd5b3be4f5a3b99864110a1fb893a3de5
files_to_modify:
  - tools/blocked.py                       # AC1/AC2/AC3 — remove the legacy claim path + validation + helpers. Delete legacy_spec_review_satisfied(); ready_content_satisfied() no longer falls back to it (missing/mismatched ready_content_sha ALWAYS fails closed). Remove the spec_review/spec_review_sha validation block + VALID_SPEC_REVIEW. KEEP CONTENT_MARKER_FIELDS unchanged (legacy fields stay excluded from the hash — decision 3 / AC3, the r1 seal-stability disposition). Remove the spec_review_content_sha() alias. Drop the `--spec-review-sha` CLI alias (keep `--ready-content-sha`) ONLY after the AC3 caller sweep. Update the module docstring (lines ~32/45/16) to drop the transitional-fallback language.
  - tools/test_blocked.py                  # AC5 — rework the legacy-path tests. The six legacy tests (transitionally-claimable, second matching-digest case, body-delta-after-legacy-convergence-is-stale, waived-without-digest, bad-spec_review-value-exits-2, malformed-spec_review-sha + converged-requires-sha) become assertions that (a) a spec_review-only item with NO ready_content_sha is BLOCKED (no seal → fail closed), and (b) spec_review is no longer a validated field (a value like `done` no longer exits 2). Keep/strengthen the ready_content_sha match/mismatch/missing coverage. `python3 tools/test_blocked.py` green.
  - tools/review-queue/promote.py          # AC3 — line-80 regex cleanup: the strip pattern `^(spec_review_sha|requested_reviewers):` drops the dead `spec_review_sha` alternation (no item carries it post-teardown), leaving the requested_reviewers handling intact. promote.py keeps using blocked.normalized_content_sha (shared; stays consistent through the CONTENT_MARKER_FIELDS change — verify no independent spec_review read remains).
  - skills/review-queue-watch.md           # AC4 — remove the legacy-marker branch (the "If it does not start with backlog/proposed/, do not write legacy spec_review markers" prose ~line 125). Post-088 every spec is authored into proposed/ and promoted via promote.py's ready_content_sha stamp; the watcher never writes a spec_review marker. Tighten the terminal/promotion prose accordingly.
  - .claude/commands/review-queue-watch.md # AC4 — GENERATED adapter (do NOT hand-edit; regenerate via tools/sync-skills.sh from canonical skills/). Listed so the builder runs sync-skills.sh and commits the regenerated copy, keeping `sync-skills.sh --check` green.
  - docs/AGENT_INSTRUCTIONS.md             # AC4 — remove the "Legacy spec_review / spec_review_sha fields are transitional and still non-builder-managed" sentence (~line 250). The claim contract is now folder-location + ready_content_sha (already documented in the same section); no legacy field remains to caveat.

spec_refs:
  - backlog/complete/2026-06-03-088-proposed-stage-pipeline.md  # THE parent. 088 introduced the proposed/ stage + ready_content_sha seal and explicitly sequenced this teardown as AC6 step (8): "remove legacy spec_review once no live item depends on it." This item executes step 8. Read 088's AC2/AC6 + the dual-read window it shipped.
  - raw/internal/decisions/2026-06-03-proposed-stage-pipeline.md  # 088's design doc — the never-half-broken migration order, the ready_content_sha normalization (spec_review_content_sha → normalized_content_sha rename), and the 086 supersession. Authoritative for the seal semantics this item must NOT change.
  - backlog/complete/2026-06-02-086-claim-gate-spec-review-convergence.md  # ORIGIN of the spec_review field gate being removed here. 086 introduced spec_review (converged|waived|pending) + spec_review_sha; 088 replaced the gate with the stage move + seal; 089 deletes the transitional remnant.
  - tools/blocked.py  # current gate: legacy_spec_review_satisfied(), ready_content_satisfied() fallback (line ~382), the spec_review validation block (~310-334), VALID_SPEC_REVIEW, CONTENT_MARKER_FIELDS, spec_review_content_sha() alias, and the dual `--ready-content-sha`/`--spec-review-sha` CLI (line ~443).

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-05T06:04:08Z"
branch: "agent/legacy-spec-review-gate-teardown"
worktree: "/Users/zhenye/Desktop/Project_echo--legacy-spec-review-gate-teardown"
head_sha: "c4150c62a98c2f73c17308a2c4690e334d3cb9f4"
pr_url: ""
agent_notes: |
  Implemented the legacy spec_review gate teardown on branch agent/legacy-spec-review-gate-teardown. The selector now requires a valid ready_content_sha seal with no spec_review fallback, legacy fields are inert and no longer validated, CONTENT_MARKER_FIELDS remains unchanged for seal stability, the --spec-review-sha alias was removed after a live caller sweep found no users, promote.py's dead spec_review_sha insertion branch is gone, and watcher/builder docs plus the generated Claude adapter are coherent. Verification passed: python3 tools/test_blocked.py (35 tests), python3 tools/blocked.py --validate, python3 tools/backlog_index.py --check, tools/sync-skills.sh --check, git diff --check, npm run lint, npm run typecheck, targeted promote tests, and full npm test (1555 passed / 21 skipped).
review_notes: |
  Merged 2026-06-05 via founder authorization ("merge after codex's review"). Strategist (Claude) as merger; builder was codex; reviewer was a SEPARATE codex process — reviewer-independence satisfied. This item also closes 088's migration sequence (AC6 step 8): folder-location + ready_content_sha is now the SOLE claim contract.

  Conflicts resolved: none — clean --no-ff merge (ort). Branch forked at the 089 claim commit; current main advanced only on pending-review metadata, task-state/run logs, _followups.md, and friction notes — none of the six implementation/doc files this branch touched. `git merge-tree` (codex review) and the actual merge both reported zero conflicts.

  C3.5 cross-vendor consult: none invoked (no conflicts).

  Fixups applied: none (verdict: merge as-is).

  Fixups deferred to follow-up items: the optional malformed-ready_content_sha fixture (non-blocking; missing+mismatch paths covered, malformed already fails closed in code).

  Verify (post-merge, ephemeral merger worktree @ 66699733): npm test 1555 passed / 21 skipped / 0 failed (147 files); npm run lint + typecheck clean; tools/test_blocked.py 35 passed; blocked.py --validate clean (89 items); backlog_index.py --check fixture-pass; check-coupled-invariants OK; sync-skills.sh --check matched; git diff --check clean.

  Independent review: separate codex reviewer, verdict `merge as-is` — all 6 ACs Met with file:line evidence, zero drift, zero blocking bugs. Confirmed legacy_spec_review_satisfied + the --spec-review-sha alias are GONE, CONTENT_MARKER_FIELDS correctly unchanged (r1 disposition), seals stay stable. Sidecar at backlog/pending_review/2026-06-04-089-…review.md (consumed at merge).

  Pipeline-shakedown note: 089 was the first item to traverse the full post-088 pipeline (proposed→ready→claimed→pending_review→complete). Friction log: raw/internal/decisions/2026-06-04-089-pipeline-shakedown-friction.md; codex root-cause analysis of the 3 friction points in backlog/_followups.md. All friction was cosmetic/operational (🟡), zero 🔴.

  Follow-up items (non-blocking):
  - Optional malformed-ready_content_sha fixture in tools/test_blocked.py.
  - (already filed) promote.py status-field seal fix; builder `review:` handoff-commit relabel; reviewer-vendor-diversity for parallelism.
---

# 089 — Tear down the legacy `spec_review` dual-read claim path (088 migration step 8)

## Why

088 shipped the `proposed/` stage and replaced 086's `spec_review` **state field** with a
`ready_content_sha` **integrity seal** — but it landed the change in the never-half-broken order,
which meant keeping a **transitional dual-read window**: `tools/blocked.py`'s `ready_content_satisfied()`
still falls back to `legacy_spec_review_satisfied()` when `ready_content_sha` is absent, so an old
`spec_review: converged`/`waived` item stays claimable during migration. 088 explicitly sequenced the
removal of this shim as **AC6 step (8): "remove legacy `spec_review` once no live item depends on it."**

That condition is now met. At spec time, `backlog/ready/` is **empty** and all 88 items are in
`complete/` — no live item is gated by `spec_review`. The dual-read path is dead code. This item
removes it so the claim contract is exactly one thing: **a `ready/` item is claimable iff its
`ready_content_sha` seal is present and matches.** No field, no fallback, no second path.

This is also the first spec authored into `backlog/proposed/` under the new lifecycle — a deliberate
end-to-end shakedown of the pipeline 088 built (author in proposed/ → spec-review there →
`promote.py` stamp + `proposed→ready` move → claim under the seal).

## Locked decisions

1. **Delete the legacy claim path, no replacement.** Remove `legacy_spec_review_satisfied()`.
   `ready_content_satisfied()` no longer has a fallback branch: a missing, malformed, or mismatched
   `ready_content_sha` **always fails closed** (item is not a candidate). An item carrying only
   `spec_review` is simply unsealed → not claimable. There is no new "legacy" error type.
2. **Stop reading and validating `spec_review` entirely — lenient ignore, not fail-loud.** Remove the
   `spec_review`/`spec_review_sha` validation block and `VALID_SPEC_REVIEW`. A stray `spec_review`
   field becomes an inert unknown frontmatter key with zero effect on claimability. **Rationale:** fail-
   loud rejection would be a new error path guarding against a field that no live item carries; lenient
   ignore is the smaller, safer teardown and the seal already provides the real gate. (Reviewers: push
   back here if you think a one-line "stray legacy field" WARN in `--validate` is worth the surface.)
3. **Clean the helpers + CLI, but KEEP the marker-set exclusions conservative (r1 codex + codex-ops
   MED).** `CONTENT_MARKER_FIELDS` is **unchanged** — it retains `{"ready_content_sha", "spec_review",
   "spec_review_sha"}`, so the legacy fields stay EXCLUDED from the normalized hash even though they're
   no longer read. **Why keep them:** removing them from the exclusion set is the *only* thing that
   could change a live item's seal hash — an item carrying a stray `spec_review`/`spec_review_sha` line
   would suddenly hash differently, so its `ready_content_sha` seal would mismatch and the item would
   become unclaimable. Keeping them excluded makes the teardown **seal-stable by construction**, so NO
   never-half-broken hash guard is needed and decision 2's lenient-ignore stands unconflicted. This is
   the root-cause disposition of the r1 guard contradiction: *remove the risky change, not add a guard.*
   Delete the `spec_review_content_sha()` alias (callers use `normalized_content_sha`). Clean
   `promote.py`'s line-80 strip regex (`spec_review_sha` alternation). Drop the `--spec-review-sha` CLI
   alias and keep `--ready-content-sha`, but ONLY after the AC3 caller sweep confirms no live caller
   passes the old flag.
4. **Docs + skills coherent.** Remove the transitional dual-read prose from `docs/AGENT_INSTRUCTIONS.md`
   and the legacy-marker branch from `skills/review-queue-watch.md`; regenerate the `.claude/` adapter
   via `tools/sync-skills.sh` (`--check` green).

## Acceptance criteria

- **AC1 — legacy claim path removed; fail-closed only.** `legacy_spec_review_satisfied()` is deleted;
  `ready_content_satisfied()` returns blocked for any item whose `ready_content_sha` is missing/
  malformed/mismatched, with no `spec_review` fallback. A test proves a `ready/` item with
  `spec_review: converged` (matching digest) but NO `ready_content_sha` is **blocked**.
- **AC2 — `spec_review` no longer validated.** The `spec_review`/`spec_review_sha` validation block and
  `VALID_SPEC_REVIEW` are removed. `tools/blocked.py --validate` passes on the live backlog. A test
  proves an item with `spec_review: <anything>` no longer exits 2 (the field is inert), and that such an
  item is not claimable absent a valid seal.
- **AC3 — helpers + CLI cleaned; marker set UNCHANGED; CLI removal gated on a caller sweep (r1
  codex-ops MED).** `CONTENT_MARKER_FIELDS` is unchanged (`{"ready_content_sha", "spec_review",
  "spec_review_sha"}` — legacy fields stay excluded from the hash; decision 3), so every existing seal
  stays valid. `spec_review_content_sha()` removed; `promote.py`'s line-80 strip regex no longer
  references `spec_review_sha`. **CLI alias removal is gated:** grep the live surfaces (`tools/`,
  `skills/`, `.claude/commands/`, any launchd/`*.sh` script — EXCLUDING historical `backlog/complete/**`,
  `backlog/reviews/**`, `raw/internal/agent-runs/**`, dogfooding) for `--spec-review-sha`; drop the alias
  only if zero live callers remain (update any found), else keep the alias and file the sweep as a
  follow-up. A test or `--help` assertion pins `--ready-content-sha` as canonical. Seal compute for a
  real proposed→ready promotion is unchanged (round-trip: stamp then `--validate` claimable).
- **AC4 — docs + skills coherent.** `docs/AGENT_INSTRUCTIONS.md` no longer caveats legacy `spec_review`;
  `skills/review-queue-watch.md` has no legacy-marker branch; `.claude/commands/review-queue-watch.md`
  regenerated; `tools/sync-skills.sh --check` green.
- **AC5 — tests green (no hash guard needed — r1 codex + codex-ops MED).** Because the marker set is
  unchanged (decision 3 / AC3), seals are stable by construction, so **no never-half-broken hash guard
  is required** — the earlier guard wording is removed precisely to avoid a `--validate` failure that
  would contradict AC2's lenient-ignore. The six legacy `test_blocked.py` tests are reworked to the new
  behavior: a `spec_review`-only item with no `ready_content_sha` is **blocked** (no seal → fail closed),
  and a `spec_review: <anything>` value is no longer validated (no exit-2). `python3
  tools/test_blocked.py`, full `npm test`, `npm run lint`, `npm run typecheck`, `tools/sync-skills.sh
  --check`, `python3 tools/blocked.py --validate`, and `python3 tools/backlog_index.py --check` all green.
- **AC6 — no scope drift.** ONLY the legacy-`spec_review` teardown. The `proposed/` stage, the
  `ready_content_sha` seal semantics, `promote.py`'s promotion/bounce/identity-gate logic, `request.py`,
  `dispatch-next-round.py`, and `backlog_index.py` are unchanged (beyond the promote.py one-line regex).
  Historical records keep their `spec_review` references (read-only): `backlog/complete/**`,
  `backlog/reviews/**`, `raw/internal/agent-runs/**`, and the 088 design doc are NOT edited.

## Out of Scope (Don't Drift) — successors

1. Renaming `ready_content_sha` or changing the seal's normalization beyond the marker-set cleanup.
2. Adding new validation/error paths for legacy fields (decision 2 is lenient-ignore — a `--validate`
   WARN is the only reviewer-optional addition, nothing stronger).
3. Touching `docs/BACKLOG.md` (generated) or `wiki/**` (post-shipment, strategist-owned).
4. The other open `_followups.md` items (code-owned sidecar emission / `producer`, the adapter-freshness
   gate, `capture-failed` classification, the stale `ECHO_COORD_REQUEST_PATH` ops bug) — all separate.

## After Completion (Strategist Notes)

- This closes 088's migration sequence (step 8 of 9; step 9 — skills/adapters/docs — shipped in 088).
  After 089, folder-location + `ready_content_sha` is the SOLE claim contract; `spec_review` exists only
  in the historical record.
- Wiki: fold the final claim-contract statement into whatever `wiki/` page documents the backlog
  pipeline when 088's wiki promotion is written (the two are naturally one page). Update `.manifest.json`
  + regen `wiki/index.md` then.
- This item is also the dogfood datapoint for the new `proposed/` pipeline — note in the merge
  `review_notes` whether promote.py's stamp + the proposed-first review queue behaved as specced.
