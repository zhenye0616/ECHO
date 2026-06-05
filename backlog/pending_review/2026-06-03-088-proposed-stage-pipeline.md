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
spec_review: converged
spec_review_sha: 822eba73fb70b6757b3a92d40f5d64e1c8152f449b8e129bb036978937aca63e
files_to_modify:
  - backlog/proposed/.gitkeep                       # AC1 — NEW stage directory. proposed/ holds a spec draft from first commit through spec-review convergence; presence == "in spec-review".
  - tools/blocked.py                                # AC2 — the claim-selector contract. Add "proposed" to STAGES; candidates() stays STRICTLY ready/ (proposed items are never candidates). Claimable iff: stage==ready AND every blocked_by dep in complete/ AND ready_content_sha present+matching. REMOVE the 086 spec_review field gate (transitional dual-read first — see AC6/migration). blocked_by validation: proposed items count as KNOWN ids but only complete/ SATISFIES a dep. Stale-ready: ready_content_sha mismatch ⇒ fail closed (item is invalid-in-ready, not a candidate) and is surfaced for bounce to proposed/.
  - tools/review-queue/request.py                   # AC3 — find_artifact() must scan proposed/ FIRST (today: ready|claimed|pending_review|complete). Without this, proposed specs are unreviewable. Order: proposed → ready → claimed → pending_review → complete.
  - skills/review-queue-watch.md                     # AC4 — watcher terminal step: on convergence, call promote.py in STAGE-ONLY mode (verify content-identity + stamp ready_content_sha + git mv proposed→ready, NO commit/push), then FOLD the staged move into the SAME terminal commit as combined.md and push via retry (r2 codex MED — never a separate promote commit on the convergence path). For proposed-stage promotion the watcher NEVER waives verification after a content patch (path c is cut here — r4 codex MED): any spec-content patch dispatches a verification round, so a `next_round: null` terminal that promotes is always the clean `proceed` path where current content == terminal `request.spec_commit_sha`. ADD a pre-step that scans for combined-but-not-promoted rounds before running combine.py and recovers them — but ONLY if the round satisfies the TERMINAL-PROMOTABLE predicate (see AC4); a merely-combined round (combine.py just wrote combined.md with unfilled `_strategist fills_` rows, next_round null pre-disposition) must NOT be promoted (r1 codex/codex-ops HIGH). ALSO add a stale-ready bounce pre-step: scan ready/ for ready_content_sha mismatches (the unattended owner per r1 codex-ops MED) and call promote.py's bounce, writing a queue-errors.md entry when it fires or fails.
  - tools/review-queue/promote.py                    # AC4 — NEW idempotent promotion + bounce helper (P1 mindset, mirrors the claimed→pending move in 079). TWO EXPLICIT MODES (r2 codex MED): (i) STAGE-ONLY — terminal/convergence path: content-identity check + stamp ready_content_sha + git mv proposed→ready, mutate-only (the watcher commits, folding into the terminal audit commit); (ii) COMMIT+PUSH — recovery (crash-after-terminal completion) + ready→proposed bounce paths own their own commit+push + remote-boundary check + safe re-run. Promotion fires ONLY when the round is TERMINAL-PROMOTABLE (AC4 predicate), never on combined.md existence alone. PRE-PROMOTION CONTENT-IDENTITY GATE (r2 codex-ops HIGH): before stamping, compare normalized current proposed/ file vs normalized file at the terminal round's request.spec_commit_sha; on mismatch REFUSE (no mutation, leave in proposed/, queue-errors.md row, NO inline dispatch — re-review is operator-initiated via request.py; r3 codex MED + r4 codex-ops MED propagation). The bounce has a concrete scheduled owner: the watcher stale-ready pre-step (above) calls it; on fire-or-fail it writes a queue-errors.md entry (operator-visible). (J1 — placement: standalone helper vs folding into combine.py/an existing script; default standalone for testability.)
  - tools/review-queue/dispatch-next-round.py        # AC4 (r5 codex MED; r6 codex MED — deterministic) — ENFORCE the path-(c) cut IN CODE, not just prose (per drift-prevention "enforced in code, not by policy"). Today this helper routes verdict=proceed_after_patches + --patches-applied=false into branch (c) (next_round:null). For a PROPOSED-stage artifact that tuple MUST route to branch (b) with a SUCCESSFUL next-round dispatch (exit 0, create r<N+1>/request.md, set next_round:N+1) — NOT a reject-only no-op that would leave the round stuck. PRESERVE branch (c) for non-proposed items. Detect proposed-stage via the artifact's folder/stage. Without this, the r4 cut is prose-only and a patched proposed spec can still terminalize, then get stuck at promote.py's content-identity refusal.
  - tools/backlog_index.py                           # AC5 — NEW generator that renders docs/BACKLOG.md from folder state + frontmatter (mirrors tools/wiki_index.py → wiki/index.md). Sections by stage incl. a Proposed table and a Ready table; derives BLOCKED/READY status from the blocked.py contract. docs/BACKLOG.md becomes GENERATED, not hand-maintained. OWNERSHIP (r1 codex MED): the builder ships the GENERATOR ONLY — it does NOT write the tracked docs/BACKLOG.md (that file stays off files_to_modify; it remains a forbidden builder write per AGENT_INSTRUCTIONS, like wiki/index.md). `--check` is FIXTURE-ONLY: it validates the generator against test fixtures, NOT the live tracked docs/BACKLOG.md, so the merge gate never fails on a not-yet-regenerated live file. Regenerating the live docs/BACKLOG.md is the strategist/post-merge step (After Completion), exactly like the wiki/index.md regen.
  - skills/process-backlog.md                        # AC7 — stage-reference + claim-contract prose: claim target stays ready→claimed, but document the proposed→ready→claimed lifecycle, the ready_content_sha contract, and that new specs are authored into proposed/.
  - skills/process-backlog-batch.md                  # AC7 — same stage/lifecycle prose updates as process-backlog.
  - skills/merge-and-cleanup.md                      # AC7 — stage-list/diagram references (operates on pending_review→complete; verify no assumption that a spec was ever in ready-as-draft).
  - backlog/README.md                                # AC7 — the canonical pipeline doc: proposed → ready → claimed → pending_review → complete; raw ideas = ECHO context (no inbox); the ready_content_sha integrity model; the two-axis reviewable(in proposed)⟂claimable(in ready) split.
  - docs/AGENT_INSTRUCTIONS.md                       # AC7 — claim contract (claim from ready/ only; ready means claimable, no field read), the forbidden-strategist-files list (docs/BACKLOG.md now GENERATED — never hand- or builder-edited), task-state pointer default path = backlog/proposed/.
  - CLAUDE.md                                        # AC7 (J2) — operating-model pipeline diagram + the proposed/ stage description. (J2 flagged: operating-model docs ship ON the builder branch so they stay coherent with enforcement code at merge, rather than strategist-immediate — for a pipeline-topology change the doc describes code behavior, so atomic coherence wins.)
  - .claude/commands/process-backlog.md              # AC7 — GENERATED adapter (do NOT hand-edit; regenerated by tools/sync-skills.sh from the canonical skills/ source). Listed so the builder can run sync-skills.sh and commit the regenerated copy, keeping `sync-skills.sh --check` green (r3 codex LOW).
  - .claude/commands/process-backlog-batch.md        # AC7 — GENERATED adapter (regen via sync-skills.sh; do NOT hand-edit) — r3 codex LOW.
  - .claude/commands/merge-and-cleanup.md            # AC7 — GENERATED adapter (regen via sync-skills.sh; do NOT hand-edit) — r3 codex LOW.
  - .claude/commands/review-queue-watch.md           # AC7 — GENERATED adapter (regen via sync-skills.sh; do NOT hand-edit) — r3 codex LOW.
  - tools/test_blocked.py                                          # AC8 — rework 086's SHIPPED selector harness (NOT a new tests/backlog/blocked.test.* placeholder — r1 codex MED: the real harness is tools/test_blocked.py and still holds the spec_review assertions this item must rework). Rework for the stage model: candidates only ready/; proposed never a candidate; ready_content_sha match→claimable, mismatch→fail-closed-not-candidate; blocked_by proposed=known-but-unsatisfied, complete=satisfied; legacy spec_review absence is fine; the transitional dual-read window (AC6). AC8 requires `python3 tools/test_blocked.py` green.
  - tests/review-queue/promote.test.* (path per repo convention)   # AC8 — promotion idempotency + recovery: stamp+move; crash-after-terminal-disposition-before-promote recomputes + promotes on re-run; double-run is a no-op; ready→proposed bounce on sha mismatch; remote-boundary check. MODE boundary (r2 codex MED): stage-only mode mutates without committing (no promote-only commit on the convergence path); commit+push mode owns its commit on recovery/bounce. NEGATIVE cases: (a, r1 HIGH) crash-after-combine-BEFORE-disposition (combined.md present, `_strategist fills_` unfilled, next_round null, no terminal marker) must NOT promote; (b, r2 codex-ops HIGH / r3 codex MED) proposed/ file edited after request.spec_commit_sha → content-identity mismatch must REFUSE promotion: NO mutation (no stamp, no move), item stays in proposed/ (non-claimable), queue-errors.md row written, and NO inline round dispatch (re-review is operator-initiated via request.py).
  - tests/review-queue/request.test.* (path per repo convention)   # AC8 — find_artifact() resolves a proposed/ spec; resolution order proposed-first.
  - tests/review-queue/watcher-state.test.ts                       # AC8 (r6 codex LOW) — the npm-run home of branch-(c) dispatch coverage. Add the proposed-stage guard assertions here: proposed artifact + proceed_after_patches + --patches-applied=false routes to branch (b) with a successful next-round dispatch (exit 0, r<N+1>/request.md written, next_round:N+1); non-proposed artifact still takes branch (c). (`tools/review-queue/test-dispatch-next-round.sh` is ad-hoc, NOT the gate.)
  - tests/backlog/backlog-index.test.* (path per repo convention)  # AC8 — generator renders Proposed + Ready tables from folder state; --check fails on drift; matches the blocked.py status derivation.

spec_refs:
  - raw/internal/decisions/2026-06-03-proposed-stage-pipeline.md  # THE design (model, decisions 1-3, blocked.py contract, Codex adversarial pitfalls, the never-half-broken migration order, 086 supersession). Authoritative; this spec implements it.
  - backlog/complete/2026-06-02-086-claim-gate-spec-review-convergence.md  # SUPERSEDED-MECHANISM. 086 introduced spec_review (converged|pending|waived) + spec_review_sha + the in-ready field gate + spec_review_content_sha() normalization. 088 KEEPS 086's intent (converge before claimable) + REUSES its normalization, but REPLACES the field gate with the stage move + ready_content_sha. 086's tests are reworked, not deleted.
  - tools/blocked.py  # current selector: STAGES tuple, candidates() (stage==ready only), the spec_review gate + spec_review_content_sha() + has_valid_spec_review_sha() + staleness check 088 reworks.
  - tools/review-queue/request.py  # current find_artifact() scanning ready|claimed|pending_review|complete — proposed/ must be added.
  - skills/review-queue-watch.md  # current terminal/convergence step that writes the 086 marker — becomes the promotion step.
  - tools/wiki_index.py  # the precedent for a generated index (wiki/index.md) that tools/backlog_index.py mirrors for docs/BACKLOG.md.
  - backlog/complete/2026-05-28-079-loop-reliability-pack.md  # AC3's clean-snapshot + P1 idempotent stage-move pattern (the claimed→pending move) that promote.py mirrors for proposed→ready.

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-05T04:24:18Z"
branch: "agent/proposed-stage-pipeline"
worktree: ""
head_sha: "857924b9fd69c2af55f03db165cd761d3fd22ae7"
pr_url: ""
agent_notes: |
  Implemented the proposed-stage pipeline on branch agent/proposed-stage-pipeline: added backlog/proposed, reworked claimability around ready_content_sha, added proposed-first review artifact lookup, added idempotent promote/bounce tooling, enforced proposed-stage verification-round routing, added the generated BACKLOG index tool, and updated the allowed docs/skills plus regenerated command adapters. Verification passed: python3 tools/test_blocked.py, python3 tools/backlog_index.py --check, targeted Vitest, python3 tools/blocked.py --validate, tools/sync-skills.sh --check, git diff --check, npm run lint, npm run typecheck, and full npm test.
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
- **J3 — bounce surfacing (RESOLVED r1 codex-ops MED):** `blocked.py` is report-only (excludes the
  mismatched item from candidates, no selector side effects). The bounce's concrete *scheduled* owner
  is the watcher stale-ready pre-step, which calls `promote.py`'s `ready→proposed` bounce and logs a
  `queue-errors.md` entry on fire-or-fail. No fail-closed item can sit in `ready/` waiting on manual
  discovery.

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
  `promote.py` makes the move idempotent + crash-recoverable: a crash after the terminal disposition
  but before promotion is recovered on the next tick; re-run is a no-op; it also performs the
  `ready→proposed` bounce on sha mismatch.
  - **TERMINAL-PROMOTABLE predicate (r1 codex/codex-ops HIGH).** `combine.py` writes `combined.md`
    *before* the strategist dispositions, so `combined.md` existence is NOT a terminal signal.
    Promotion recovery fires ONLY when ALL hold: (a) no unresolved `_strategist fills_` disposition
    rows in `combined.md`; (b) `escalated_to_founder: false`; (c) `next_round: null` (a dispatch
    branch sets `next_round: N+1` → not terminal); (d) a terminal convergence marker is present (the
    "Convergence call" reads `claim-ready after R<N>`); (e) no `r<N+1>/request.md` exists. A
    merely-combined round (rows unfilled, no marker) must NOT promote, even after an unattended crash.
    AC8 covers the crash-after-combine-before-disposition negative case.
  - **Stale-ready bounce owner (r1 codex-ops MED).** `blocked.py` only *reports* a `ready_content_sha`
    mismatch (it fails closed, excluding the item from candidates — J3 report-only). The concrete
    *scheduled* owner of the repair is a **watcher pre-step**: each tick scans `ready/` for mismatches
    and calls `promote.py`'s bounce (`ready→proposed`), writing an operator-visible `queue-errors.md`
    entry when it fires or fails. This closes the "fail-closed item silently stuck in ready/ until
    manual discovery" hole — the exact hidden-non-claimable state this spec removes.
  - **`promote.py` commit-boundary: two explicit modes (r2 codex MED).** The original "terminal
    commit folds the move" (the watcher) and "helper does stamp+move+commit+push" clauses conflict —
    a builder cannot do both. Split the contract: (i) **stage-only mode** — the terminal/convergence
    path: `promote.py` verifies + stamps `ready_content_sha` + `git mv proposed→ready` but does NOT
    commit/push; the watcher folds the staged move into the SAME terminal commit as `combined.md`
    (preserves the single audit commit, never exposes a `ready/` item before the terminal state
    lands). (ii) **commit+push mode** — the recovery + bounce pre-steps (crash-after-terminal
    promotion completion, and the `ready→proposed` bounce) own their own commit+push. The chosen
    boundary is pinned in `promote.py` tests.
  - **Pre-promotion content-identity gate (r2 codex-ops HIGH).** `ready_content_sha` stamped on the
    *current* `proposed/` file only protects content *after* promotion; it never proves the current
    file is still what reviewers approved. Before stamping, `promote.py` MUST compare the normalized
    current `proposed/` file against the normalized file at the terminal round's
    `request.spec_commit_sha` (the reviewed artifact). On **match**, stamp + promote. On **mismatch**
    (the spec was edited after the request but before terminalization), `promote.py` REFUSES: it makes
    NO mutation (no stamp, no move) and returns a structured mismatch result; the item stays in
    `proposed/` (fail-closed, non-claimable) and an operator-visible `queue-errors.md` row is written
    via the watcher's existing stale/error logging owner. **Re-review is operator-initiated** through
    the normal `request.py` path once the drift is investigated — `promote.py` does NOT inline-dispatch
    a new round (r3 codex MED: the inline auto-dispatch is REMOVED to eliminate the stage-only-mode
    commit-owner ambiguity; the integrity guarantee — promotion never certifies unreviewed bytes — is
    fully preserved by the fail-closed refusal alone). AC8 covers the edited-after-request
    mismatch-refuses case.
  - **No verification-waived promotion after a content patch (r4 codex MED — structural cut).** The
    content-identity gate keys on the terminal round's `request.spec_commit_sha`. The watcher's
    existing path (c) (apply a mechanical patch after a request, then *waive* the verification round
    and terminalize) deliberately makes the current spec differ from that SHA — which the gate would
    then (correctly) refuse. Resolve by **cutting path (c) for proposed-stage promotion**: under the
    proposed-stage model, **any spec-content patch forces a verification round (path b)** — the
    watcher never terminalizes a proposed→ready promotion with `next_round: null` after applying a
    content patch. The only `next_round: null` terminal that promotes is the clean `proceed` path
    where NO content was edited, so the current normalized content provably equals the terminal
    round's `request.spec_commit_sha`. **Promotion invariant:** proposed-stage terminal promotion is
    valid iff `normalized(current proposed file) == normalized(file @ terminal request.spec_commit_sha)`.
    This keeps the gate's reference always correct without inventing a waiver-identity marker; it does
    NOT change path (c) for non-proposed-stage items. (Diagnostic, must hold: the only two ways to
    reach a terminal round with `next_round: null` are (a) clean `proceed` with zero content edits
    [current == request SHA ✓] and (c) waiver-after-patch [now forbidden for proposed promotion]; no
    other path both edits the spec after the request and terminalizes with `next_round: null`.)
    **Enforced in code (r5 codex MED; r6 codex MED — deterministic):** the cut is NOT prose-only —
    for a proposed-stage artifact, `dispatch-next-round.py` routes `proceed_after_patches` +
    `--patches-applied=false` to branch (b) with a SUCCESSFUL next-round dispatch (exit 0, writes
    `r<N+1>/request.md`, sets `next_round: N+1`) — never a reject-only no-op that strands the round.
    So a patched proposed spec can never terminalize via the waiver branch in the first place.
    promote.py's content-identity refusal is the backstop, not the primary enforcement. Branch (c) is
    preserved for non-proposed-stage items.
- **AC5 — generated `BACKLOG.md`.** `tools/backlog_index.py` renders `docs/BACKLOG.md` (Proposed +
  Ready + downstream tables) from folder state + the blocked.py status derivation. `docs/BACKLOG.md`
  is no longer hand-edited. **Ownership (r1 codex MED):** the builder ships the GENERATOR ONLY and
  never writes the tracked `docs/BACKLOG.md` — that file stays off `files_to_modify` and remains a
  forbidden builder write (like `wiki/index.md`). `--check` is **fixture-only**: it asserts the
  generator's output against test fixtures, NOT the live tracked `docs/BACKLOG.md`, so the merge gate
  never fails on a not-yet-regenerated live file. The live `docs/BACKLOG.md` is regenerated as the
  strategist/post-merge step (After Completion), mirroring the `wiki/index.md` regen.
- **AC6 — never-half-broken migration.** Land in this order: (1) add `proposed/` + docs; (2)
  blocked.py loads proposed for validation, candidates still ready; (3) **transitional dual-read** —
  086's field gate still works for existing ready/ items while `ready_content_sha` is introduced; (4)
  request.py scans proposed; (5) watcher promotion via promote.py; (6) stale-ready bounce; (7)
  migrate any live `ready/` item still carrying legacy `spec_review` to a current `ready_content_sha`
  (it stays in ready/) — at spec time NO such live item exists (087b shipped to `complete/`; `ready/`
  is empty), so step (7) is a no-op unless a legacy item is in `ready/` at migration time; the
  migration mechanism + its fixture test (AC8) are still required; (8) remove legacy `spec_review`
  once no live item depends on it; (9) skills/
  adapters/docs/tests. The pipeline is claimable-correct at every step.
- **AC7 — docs + skills coherent.** README, AGENT_INSTRUCTIONS, CLAUDE.md pipeline diagrams,
  process-backlog(+batch), merge-and-cleanup, review-queue-watch reflect the new stages + contract;
  `.claude/` adapters regenerated via `tools/sync-skills.sh` (`--check` green). Forbidden-files list
  notes BACKLOG.md is generated.
- **AC8 — tests green.** `tools/test_blocked.py` (the SHIPPED 086 harness, reworked — r1 codex MED):
  stage model, ready_content_sha match/mismatch, blocked_by proposed-vs-complete, candidates-only-ready,
  dual-read window; `python3 tools/test_blocked.py` must pass — incl. a FIXTURE assertion that a
  legacy item migrated from `spec_review` to a `ready_content_sha` (no `spec_review`) stays claimable
  in ready/ (r4 codex MED — fixture-based, since `ready/` has no live legacy item at spec time).
  promote.py (idempotency + recovery + bounce; the crash-after-combine-before-disposition NEGATIVE
  case must NOT promote; the edited-after-request content-identity mismatch must REFUSE; and a
  waiver-after-content-patch is NOT a valid proposed-promotion terminal — it forces a verification
  round, r4 codex MED), request.py (proposed-first resolution), backlog_index (render + fixture-only
  --check). `dispatch-next-round.py` (r5 codex MED; r6 codex MED — deterministic): a PROPOSED-stage
  artifact with verdict=proceed_after_patches + --patches-applied=false MUST route to branch (b) with
  a successful dispatch (exit 0, writes `r<N+1>/request.md`, sets `next_round: N+1`) — assert the
  positive dispatch, not merely "did not terminalize"; a non-proposed artifact still takes branch (c)
  — pin both. These assertions live in `tests/review-queue/watcher-state.test.ts` (the npm-run home of
  the branch-(c) coverage — r6 codex LOW; `tools/review-queue/test-dispatch-next-round.sh` is ad-hoc
  and NOT the gate). Full `npm test` + lint + typecheck + `tools/sync-skills.sh --check` + `python3`
  test runner green.
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
