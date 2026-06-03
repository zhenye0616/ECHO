---
id: 2026-06-03-088-proposed-stage-pipeline
title: "Add a `proposed/` backlog stage — make folder-location the single source of claimability; delete 086's spec_review state field for a renamed `ready_content_sha` integrity seal; generate docs/BACKLOG.md"
status: ready
priority: HIGH
estimate: 2-3d
created: 2026-06-03
blocked_by: []
task_state_ref: 2026-06-03-088-proposed-stage-pipeline
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - backlog/proposed/.gitkeep                       # AC1 — NEW stage directory. proposed/ holds a spec draft from first commit through spec-review convergence; presence == "in spec-review".
  - tools/blocked.py                                # AC2 — the claim-selector contract. Add "proposed" to STAGES; candidates() stays STRICTLY ready/ (proposed items are never candidates). Claimable iff: stage==ready AND every blocked_by dep in complete/ AND ready_content_sha present+matching. REMOVE the 086 spec_review field gate (transitional dual-read first — see AC6/migration). blocked_by validation: proposed items count as KNOWN ids but only complete/ SATISFIES a dep. Stale-ready: ready_content_sha mismatch ⇒ fail closed (item is invalid-in-ready, not a candidate) and is surfaced for bounce to proposed/.
  - tools/review-queue/request.py                   # AC3 — find_artifact() must scan proposed/ FIRST (today: ready|claimed|pending_review|complete). Without this, proposed specs are unreviewable. Order: proposed → ready → claimed → pending_review → complete.
  - skills/review-queue-watch.md                     # AC4 — watcher terminal step: on convergence, stamp ready_content_sha on the CURRENT proposed/ file, then idempotently move proposed→ready, fold into the terminal commit with combined.md, push via retry. ADD a pre-step that scans for "combined-but-not-promoted/terminalized" rounds before running combine.py (recompute promotion from review artifacts — pitfall #1) so a crash after combined.md but before promotion is recovered on the next tick, never stranding a converged spec outside ready/.
  - tools/review-queue/promote.py                    # AC4 — NEW idempotent promotion + bounce helper (P1 mindset, mirrors the claimed→pending move in 079): upsert proposed→ready (stamp+move+commit+push, remote-boundary check, safe re-run) and the reverse ready→proposed bounce on ready_content_sha mismatch. The watcher + a manual repair path both call it. (J1 — placement: standalone helper vs folding into combine.py/an existing script; default standalone for testability.)
  - tools/backlog_index.py                           # AC5 — NEW generator that renders docs/BACKLOG.md from folder state + frontmatter (mirrors tools/wiki_index.py → wiki/index.md). Sections by stage incl. a Proposed table and a Ready table; derives BLOCKED/READY status from the blocked.py contract. docs/BACKLOG.md becomes GENERATED, not hand-maintained (it is a strategist-only file: the builder ships the GENERATOR + a --check mode, NOT a hand-edit of BACKLOG.md; regeneration is a strategist/post-merge step like wiki regen).
  - skills/process-backlog.md                        # AC7 — stage-reference + claim-contract prose: claim target stays ready→claimed, but document the proposed→ready→claimed lifecycle, the ready_content_sha contract, and that new specs are authored into proposed/.
  - skills/process-backlog-batch.md                  # AC7 — same stage/lifecycle prose updates as process-backlog.
  - skills/merge-and-cleanup.md                      # AC7 — stage-list/diagram references (operates on pending_review→complete; verify no assumption that a spec was ever in ready-as-draft).
  - backlog/README.md                                # AC7 — the canonical pipeline doc: proposed → ready → claimed → pending_review → complete; raw ideas = ECHO context (no inbox); the ready_content_sha integrity model; the two-axis reviewable(in proposed)⟂claimable(in ready) split.
  - docs/AGENT_INSTRUCTIONS.md                       # AC7 — claim contract (claim from ready/ only; ready means claimable, no field read), the forbidden-strategist-files list (docs/BACKLOG.md now GENERATED — never hand- or builder-edited), task-state pointer default path = backlog/proposed/.
  - CLAUDE.md                                        # AC7 (J2) — operating-model pipeline diagram + the proposed/ stage description. (J2 flagged: operating-model docs ship ON the builder branch so they stay coherent with enforcement code at merge, rather than strategist-immediate — for a pipeline-topology change the doc describes code behavior, so atomic coherence wins.)
  - tests/backlog/blocked.test.* (path per repo convention)        # AC8 — rework 086's blocked.py tests for the stage model: candidates only ready/; proposed never a candidate; ready_content_sha match→claimable, mismatch→fail-closed-not-candidate; blocked_by proposed=known-but-unsatisfied, complete=satisfied; legacy spec_review absence is fine; the transitional dual-read window (AC6).
  - tests/review-queue/promote.test.* (path per repo convention)   # AC8 — promotion idempotency + recovery: stamp+move+push; crash-after-combined-before-promote recomputes on re-run; double-run is a no-op; ready→proposed bounce on sha mismatch; remote-boundary check.
  - tests/review-queue/request.test.* (path per repo convention)   # AC8 — find_artifact() resolves a proposed/ spec; resolution order proposed-first.
  - tests/backlog/backlog-index.test.* (path per repo convention)  # AC8 — generator renders Proposed + Ready tables from folder state; --check fails on drift; matches the blocked.py status derivation.

spec_refs:
  - raw/internal/decisions/2026-06-03-proposed-stage-pipeline.md  # THE design (model, decisions 1-3, blocked.py contract, Codex adversarial pitfalls, the never-half-broken migration order, 086 supersession). Authoritative; this spec implements it.
  - backlog/complete/2026-06-02-086-claim-gate-spec-review-convergence.md  # SUPERSEDED-MECHANISM. 086 introduced spec_review (converged|pending|waived) + spec_review_sha + the in-ready field gate + spec_review_content_sha() normalization. 088 KEEPS 086's intent (converge before claimable) + REUSES its normalization, but REPLACES the field gate with the stage move + ready_content_sha. 086's tests are reworked, not deleted.
  - tools/blocked.py  # current selector: STAGES tuple, candidates() (stage==ready only), the spec_review gate + spec_review_content_sha() + has_valid_spec_review_sha() + staleness check 088 reworks.
  - tools/review-queue/request.py  # current find_artifact() scanning ready|claimed|pending_review|complete — proposed/ must be added.
  - skills/review-queue-watch.md  # current terminal/convergence step that writes the 086 marker — becomes the promotion step.
  - tools/wiki_index.py  # the precedent for a generated index (wiki/index.md) that tools/backlog_index.py mirrors for docs/BACKLOG.md.
  - backlog/complete/2026-05-28-079-loop-reliability-pack.md  # AC3's clean-snapshot + P1 idempotent stage-move pattern (the claimed→pending move) that promote.py mirrors for proposed→ready.
  - backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md  # the live migration case: currently in ready/ with spec_review: waived — AC6 migrates it to a ready_content_sha (it stays claimable in ready/).
---

# 088 — Add a `proposed/` backlog stage (folder-location = claimability)

## Why

`ready/` holds two states at once — "specced but still in spec-review" and "converged, claimable
now." 086 disambiguated *within* `ready/` with a `spec_review` **state field**, which restored
correctness (no claiming before review) but broke the property the rest of the pipeline has:
**location == state**. This item gives the spec-review phase its own folder (`proposed/`) so `ready/`
means exactly one thing again, and replaces 086's field with an integrity-only checksum. Full
reasoning, decisions, pitfalls, and migration order: the design doc in `spec_refs`.

## Locked decisions (from the design doc)

1. **`proposed/ → ready/ → claimed/ → pending_review/ → complete/`; `inbox/` deleted.** Raw ideas
   have no artifact — they live in ECHO session context (retrievable via ECHO MCP). `proposed/` =
   spec draft in spec-review; no draft-vs-review sub-flag (a flag would recreate 086's hidden state).
   `ready/` = claimable only.
2. **Promotion is AUTOMATED.** The watcher does the `proposed→ready` move at convergence — no human
   beat (spec-review IS the gate; builder output is still code-reviewed; founder still owns the
   `push origin main` merge gate). No "hold" marker (encode non-claimability structurally instead).
3. **Delete the `spec_review` state field; keep only `ready_content_sha`** — a renamed integrity seal
   (NOT state). `ready/` = claimable (folder is the truth); `ready_content_sha` proves the file still
   matches the content blessed into `ready/`. Mismatch ⇒ fail closed + bounce to `proposed/`. Reuse
   086's normalization (exclude agent-managed fields + the checksum line). Waiver = founder stamps
   `ready_content_sha` + moves to `ready/` (no `waived` value).
4. **`docs/BACKLOG.md` becomes generated** from folder state (`tools/backlog_index.py`), never
   hand-maintained — removes a drift class and avoids automation writing a strategist-only file.

## Judgment calls (flag for r1)

- **J1 — promote.py placement:** standalone helper (default, testable) vs folding into
  `combine.py`/the watcher. Either way the promotion+bounce must be idempotent + crash-recoverable.
- **J2 — operating-model docs (CLAUDE.md/README/AGENT_INSTRUCTIONS) ship ON the builder branch** so
  they stay coherent with the enforcement code at merge, rather than strategist-immediate. For a
  pipeline-topology change the docs describe code behavior, so atomic coherence beats the usual
  "operating-model files update immediately" rule. (BACKLOG.md stays excluded — generated.)
- **J3 — bounce surfacing:** when `ready_content_sha` mismatches, does `blocked.py` just exclude it
  (report-only) and let the watcher/repair path move it, or does it move it? Default: blocked.py
  reports invalid + the explicit `promote.py` repair path performs the bounce (no selector side
  effects).

## Acceptance criteria

- **AC1 — `proposed/` stage exists** (`backlog/proposed/.gitkeep`) and is documented as the
  spec-draft+review stage; `inbox/` references removed across docs/skills.
- **AC2 — `blocked.py` contract.** `STAGES` includes `proposed`; `candidates()` returns only
  `ready/` items; claimable iff stage==ready AND all `blocked_by` in complete/ AND
  `ready_content_sha` present+matching. `blocked_by` validation: proposed = known id, only complete
  satisfies. Stale-ready (sha mismatch) ⇒ fail closed (not a candidate), reason surfaced. The 086
  `spec_review` field gate is removed after the AC6 transitional window.
- **AC3 — `request.py find_artifact()` scans `proposed/` first** (proposed → ready → claimed →
  pending_review → complete). A proposed spec is reviewable.
- **AC4 — automated, idempotent promotion.** The watcher, at convergence, stamps `ready_content_sha`
  on the current `proposed/` file and moves it to `ready/` (terminal commit + push-with-retry).
  `promote.py` makes the move idempotent + crash-recoverable: a crash after `combined.md` but before
  promotion is recovered on the next tick (recompute from review artifacts); re-run is a no-op; it
  also performs the `ready→proposed` bounce on sha mismatch.
- **AC5 — generated `BACKLOG.md`.** `tools/backlog_index.py` renders `docs/BACKLOG.md` (Proposed +
  Ready + downstream tables) from folder state + the blocked.py status derivation, with a `--check`
  mode for drift. `docs/BACKLOG.md` is no longer hand-edited (builder ships the generator, not a
  hand-edit of the file).
- **AC6 — never-half-broken migration.** Land in this order: (1) add `proposed/` + docs; (2)
  blocked.py loads proposed for validation, candidates still ready; (3) **transitional dual-read** —
  086's field gate still works for existing ready/ items while `ready_content_sha` is introduced; (4)
  request.py scans proposed; (5) watcher promotion via promote.py; (6) stale-ready bounce; (7)
  migrate existing items (087b: replace `spec_review: waived` with a current `ready_content_sha`,
  stays in ready/); (8) remove legacy `spec_review` once no live item depends on it; (9) skills/
  adapters/docs/tests. The pipeline is claimable-correct at every step.
- **AC7 — docs + skills coherent.** README, AGENT_INSTRUCTIONS, CLAUDE.md pipeline diagrams,
  process-backlog(+batch), merge-and-cleanup, review-queue-watch reflect the new stages + contract;
  `.claude/` adapters regenerated via `tools/sync-skills.sh` (`--check` green). Forbidden-files list
  notes BACKLOG.md is generated.
- **AC8 — tests green.** blocked.py (stage model, ready_content_sha match/mismatch, blocked_by
  proposed-vs-complete, candidates-only-ready, dual-read window), promote.py (idempotency + recovery
  + bounce), request.py (proposed-first resolution), backlog_index (render + --check). Full
  `npm test` + lint + typecheck + `tools/sync-skills.sh --check` + `python3` test runner green.
- **AC9 — no scope drift.** Only stage TOPOLOGY + the claim/promotion mechanism change. Spec-review
  CONTENT (rounds, reviewers, convergence computation) is unchanged. `docs/BACKLOG.md` is not
  hand-edited; `wiki/**` untouched (post-shipment). The demoted `_followups.md` root-cause fixes
  (code-own emission, adapter-drift gate, echo_skill) are NOT in scope.

## Out of Scope (Don't Drift) — successors

1. `echo_skill()` render-at-use-time / retiring rendered adapters (the demoted followup; unrelated to
   stage topology).
2. Code-own emission of machine-consumed artifacts + the adapter-drift freshness gate (demoted
   followups — the producer-bug root cause, separate from pipeline stages).
3. Changing spec-review convergence computation, reviewer rosters, or round mechanics.
4. A `proposed/`-reviewable vs `inbox/`-reviewable distinction (inbox is deleted, not reworked).

## After Completion (Strategist Notes)

- Regenerate `docs/BACKLOG.md` via the new `tools/backlog_index.py` (strategist/post-merge step;
  builder shipped the generator, not the rendered file).
- New specs are henceforth authored into `backlog/proposed/` (not `ready/`); 089+ follow the new flow.
- **Wiki (post-shipment):** add/extend an operating-model page documenting the stage model +
  `ready_content_sha`; note the 086 supersession. Update `.manifest.json` + regen `wiki/index.md`.
- Close the loop on the demoted root-cause followups (088 frees attention for them).

## Provenance

Brainstormed 2026-06-03 (founder + Claude via the brainstorming skill) with a cross-vendor Codex
design consult (Q1 promotion=automated, Q2 keep-only-renamed-checksum, + 9 ranked pitfalls + the
never-half-broken migration order). Full design: the `spec_refs` design doc. This reworks just-
shipped 086 — hence the careful, dual-read migration order. Reviewer roster: `["codex", "codex-ops"]`.
