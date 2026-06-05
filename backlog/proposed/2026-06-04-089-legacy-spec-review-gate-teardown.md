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
files_to_modify:
  - tools/blocked.py                       # AC1/AC2/AC3 — remove the legacy claim path + validation + helpers. Delete legacy_spec_review_satisfied(); ready_content_satisfied() no longer falls back to it (missing/mismatched ready_content_sha ALWAYS fails closed). Remove the spec_review/spec_review_sha validation block + VALID_SPEC_REVIEW. CONTENT_MARKER_FIELDS → {"ready_content_sha"} only. Remove the spec_review_content_sha() alias. Drop the `--spec-review-sha` CLI alias (keep `--ready-content-sha`). Update the module docstring (lines ~32/45/16) to drop the transitional-fallback language.
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
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
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
3. **Clean the marker set + helpers + CLI.** `CONTENT_MARKER_FIELDS` → `{"ready_content_sha"}` (the
   seal field self-excludes from its own hash; the now-absent `spec_review`/`spec_review_sha` no longer
   need exclusion). Delete the `spec_review_content_sha()` alias (callers use `normalized_content_sha`).
   Drop the `--spec-review-sha` CLI alias; keep `--ready-content-sha`. Clean `promote.py`'s line-80
   strip regex (`spec_review_sha` alternation). **Never-half-broken guard:** this MUST land while no
   `ready/` item carries `spec_review` (true now) — otherwise removing `spec_review` from
   `CONTENT_MARKER_FIELDS` would change that item's normalized hash and break its seal. A pre-flight
   assertion (no live `ready/`+`claimed/`+`pending_review/` item carries `spec_review`) belongs in the
   test/validate path.
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
- **AC3 — marker set + helpers + CLI cleaned.** `CONTENT_MARKER_FIELDS == {"ready_content_sha"}`;
  `spec_review_content_sha()` removed; `--spec-review-sha` removed and `--ready-content-sha` retained
  (a test or `--help` assertion pins the canonical flag); `promote.py`'s strip regex no longer
  references `spec_review_sha`. Seal compute for a real proposed→ready promotion is unchanged
  (round-trip: stamp then `--validate` claimable).
- **AC4 — docs + skills coherent.** `docs/AGENT_INSTRUCTIONS.md` no longer caveats legacy `spec_review`;
  `skills/review-queue-watch.md` has no legacy-marker branch; `.claude/commands/review-queue-watch.md`
  regenerated; `tools/sync-skills.sh --check` green.
- **AC5 — never-half-broken + tests green.** A guard (test or `--validate` check) asserts no live
  `ready/`/`claimed/`/`pending_review/` item carries `spec_review` before the marker-set change is
  trusted. The six legacy `test_blocked.py` tests are reworked to the new behavior (spec_review-only →
  blocked; spec_review value not validated). `python3 tools/test_blocked.py`, full `npm test`,
  `npm run lint`, `npm run typecheck`, `tools/sync-skills.sh --check`, `python3 tools/blocked.py
  --validate`, and `python3 tools/backlog_index.py --check` all green.
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
