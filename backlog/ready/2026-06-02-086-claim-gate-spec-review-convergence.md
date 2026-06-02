---
id: 2026-06-02-086-claim-gate-spec-review-convergence
title: "Claim gate — a spec with requested_reviewers is not claimable until its spec-review converges (close the reviewable≠claimable gap in tools/blocked.py)"
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-06-02
blocked_by: []
task_state_ref: 2026-06-02-086-claim-gate-spec-review-convergence
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/blocked.py                                  # AC1+AC2+AC3+AC6 — add a spec-review-convergence gate to candidates(): a ready/ item with non-empty `requested_reviewers` is UNBLOCKED only when its spec-review has converged (signal per AC1) AND not stale (AC3) AND not founder-escalated; else it is BLOCKED with a new reason. Items with empty/absent `requested_reviewers` are unaffected (claimable as today). Update the module docstring "Selection rule" to state the review gate. Keep the predicate in a small, isolated, unit-testable helper — do NOT inline it into the sort. ALSO (r1 F2): extend `parse_frontmatter` + `load_items` so `requested_reviewers` (the inline-list form `["a","b"]`), `spec_review`, and `spec_review_sha` survive into the item record — today the parser reads the inline list as a scalar STRING and `load_items` (L174-181) drops `requested_reviewers` entirely, which would make the gate fail OPEN on the very specs it protects.
  - skills/review-queue-watch.md                      # AC1 — at the watcher's TERMINAL/convergence step (the `dispatch-next-round.py ... --patches-applied=false` + `git commit -m "review-r<N>: terminal on <item_id>"` paths, skill §"(a) Zero patches applied → convergence" ~L173-183 and §(c) ~L275-279), ALSO write `spec_review: converged` + `spec_review_sha: <terminal spec_commit_sha>` into the reviewed item's frontmatter and include it in that same terminal commit. This is the single authoritative moment convergence is known. No new commit; fold into the existing terminal commit.
  - .claude/commands/review-queue-watch.md            # AC1 — regenerated adapter copy; produced by `tools/sync-skills.sh` after editing the canonical skill. Do NOT hand-edit; run the sync script and commit the result. `tools/sync-skills.sh --check` must pass.
  - docs/AGENT_INSTRUCTIONS.md                         # AC4 — document the claim gate in the builder claim contract (the selection/claim section): "a ready/ item with non-empty requested_reviewers is claimable only after spec-review convergence; blocked.py enforces this." Document the founder bypass field (AC5) and the `spec_review` / `spec_review_sha` frontmatter fields as agent-NON-managed (watcher/founder-owned, NOT builder-writable).
  - backlog/README.md                                 # AC4 — reflect the two-axis state in the pipeline description: ready/ now means "specced + under/awaiting spec-review", and an item becomes claimable only on review convergence. One or two sentences + the founder-bypass field; do not restructure the doc.
  - tools/test_blocked.py                             # AC6 — r1-CORRECTED (F3a): EXTEND the EXISTING dedicated harness (run `python3 tools/test_blocked.py`); do NOT create a new mislocated `tests/` file that would miss the existing selector/validator regression suite. Cover: (i) requested_reviewers empty/absent ⇒ claimable (regression: today's behavior); (ii) non-empty INLINE-LIST `requested_reviewers: ["codex","codex-ops"]` (the live 085/086 shape) + no spec_review ⇒ BLOCKED; (iii) + spec_review:converged + fresh sha ⇒ claimable; (iv) + spec_review:converged but a substantive (AC-body) edit ⇒ stale ⇒ BLOCKED, while a marker-only delta stays FRESH; (v) spec_review:waived ⇒ claimable (founder bypass); (vi) --validate rejects bad spec_review value, converged-with-MISSING-sha, and malformed spec_review_sha; (vii) --list-blocked prints the new review-gate reason.

spec_refs:
  - tools/blocked.py  # candidates() at L226 is the SOLE claim selector; its only gate today is "stage==ready AND every blocked_by id ∈ complete/". L167-169 explicitly: "the status: field is informational only … we deliberately do NOT validate status." There is NO review-state check anywhere. ⚠️ r1-CORRECTED (F2): `parse_frontmatter` parses the inline-list form `requested_reviewers: ["a","b"]` (the shape 085/086 + live specs use) as a SCALAR STRING, and `load_items` (L174-181) projects only {path,stage,id,priority,created,blocked_by} — it DROPS `requested_reviewers`. So the new fields are NOT readable without a parser + load_items change (folded into AC2).
  - skills/review-queue-watch.md  # the watcher is the actor that DECLARES convergence (§description: "either declares convergence or runs request.py for the next round"). Terminal paths: §"(a) Zero patches applied → convergence" (~L173-183) commits `review-r<N>: terminal on <item_id>`; §(c) (~L275-279) same. These are the exact write-points for the AC1 frontmatter field. NOTE: terminal verdict at convergence may be `proceed` OR `proceed_after_patches` (case c) — the gate must treat BOTH terminal-proceed-class verdicts as converged, NOT just `proceed`.
  - tools/review-queue/combine.py  # compute_combined_verdict() (L108) + the verdict roll-up table (L123-167): PROCEED_STAR={proceed,proceed_after_patches}; escalated_to_founder is set True on divergent / multi-missing / any-pushback-with-missing / no_responses. combined.md carries `combined_verdict` + `escalated_to_founder`. Read-only ref — 086 does NOT change convergence computation; it only consumes the watcher's terminal decision.
  - backlog/_followups.md  # the prior strategist already articulated THIS gap and a fix: "builder selector — spec-review convergence is not enforced before claim" (Observed 2026-05-17 on items 060/061; ~L578). It proposed reading backlog/reviews/<id>/r<N>/combined.md directly from blocked.py (combined_verdict:proceed + escalated_to_founder!=true; block on missing dirs / pending rounds / proceed_after_patches / pushback / divergent / escalation), AND "founder-approved 'claim-ready despite review' exceptions … have an explicit field or command path." 086 adopts that intent; see "Design — chosen signal" for why it routes the convergence signal through a watcher-written frontmatter field (Approach B) rather than artifact-parsing in the selector (Approach A), and the "Alternatives Considered" section for the trade.
  - tools/review-queue/request.py  # `request.py <item_id> <round> [--reviewers=…] [--spec-sha=…]` opens a review round (creates backlog/reviews/<id>/r<N>/request.md). Read-only ref: confirms how a round's spec_commit_sha is pinned (the sha 086's `spec_review_sha` must equal at convergence).
  - backlog/ready/2026-06-02-085-reviewer-invocation-contract.md  # frontmatter-shape + section-structure template this spec mirrors. ALSO the live motivating instance: 085 sits in ready/ NOW with requested_reviewers=["codex","codex-ops"], blocked.py returns it as the single claimable item, and its review queue has 0 rounds — i.e. claimable-but-never-spec-reviewed, the exact failure this spec closes.
  - docs/AGENT_INSTRUCTIONS.md  # "What You Must Not Write" (~L355-365) — confirms docs/AGENT_INSTRUCTIONS.md + backlog/README.md are NOT builder-forbidden (only wiki/, backlog item bodies, docs/{BACKLOG,STATUS,NORTH_STAR}.md, backlog/complete/ are). The new `spec_review`/`spec_review_sha` fields must be added to the NON-builder-managed list so a future builder cannot self-certify its own spec's review.
  - CLAUDE.md  # operating model: review queue / cross-tool spec review is the protocol; reviewer-independence rule. 086 makes "spec was reviewed before it is built" a code-enforced invariant rather than founder-serialization discipline.

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# 086 — Claim gate: spec-review convergence required before a reviewed spec is claimable

## Problem

`tools/blocked.py` is the **sole** claim selector — `/process-backlog` runs `python3 tools/blocked.py` and `git mv`s whatever path it prints from `ready/ → claimed/`. Its `candidates()` function (L226) gates on exactly two things: the item is in `backlog/ready/`, and every `blocked_by` id has a file in `backlog/complete/`. **Review state is never consulted** (L167-169 makes the no-status-check deliberate).

Consequence: **a spec is claimable the instant it lands in `ready/` with satisfied `blocked_by` — before any spec-review round has run, let alone converged.** Spec-review (the `request.py` / `combine.py` / watcher round loop) is a *parallel advisory track*, not a *gate*. `requested_reviewers` is advisory for the strategist, not a hard builder gate. The two properties are coupled in the wrong direction: **claimability does not wait for reviewability.**

This has been masked only by **founder serialization** (founder pushes a spec, manually drives review to convergence, *then* lets a builder run, with usually one `ready/` item at a time). The moment review and build run concurrently — the whole point of the auto-loop — the gap bites.

## Evidence (live + historical)

- **Live (2026-06-02):** `085` is in `ready/` with `requested_reviewers: ["codex","codex-ops"]`; `blocked.py` returns it as the single claimable item; its review queue has **0 rounds**. A `process-backlog` agent firing now would claim and build a never-spec-reviewed spec.
- **Historical (2026-05-17, `_followups.md` ~L578):** `blocked.py` returned `060-hotkey-overlay-v0` while a later review round `r7/` existed *without* `combined.md`; and it would treat `061-doc-leanout` as claimable though it declared `requested_reviewers` with no `backlog/reviews/<id>/` request at all. The prior strategist filed this as a "future spec candidate" with a proposed gating predicate. **086 is that spec.**

## Design

### The invariant
> A `ready/` item with a non-empty `requested_reviewers` is **claimable only after its spec-review has converged** at the item's current spec content — enforced in `tools/blocked.py`, not by operator discipline.

Items with `requested_reviewers: []` (or absent) need no review and remain claimable exactly as today. The gate is *conditional on the item itself declaring it wants review.*

### Chosen signal — watcher-written frontmatter field (Approach B)

The watcher is the actor that authoritatively knows convergence (it calls `dispatch-next-round.py --terminal` and commits `review-r<N>: terminal on <item_id>`). At a **zero-patch convergence (case (a))** it ALSO writes into the reviewed item's frontmatter, in the same terminal commit:

```
spec_review: converged
spec_review_sha: <reviewed spec_commit_sha>   # case (a) only; the sha the converged round reviewed
```

`blocked.py candidates()` then enforces, for a `ready/` item with non-empty `requested_reviewers`:

1. `spec_review == converged` (else BLOCKED — reason `awaiting-spec-review`), **and**
2. a present, valid `spec_review_sha` (else BLOCKED — a `converged` marker without a usable sha must never unblock; see AC5), **and**
3. **not stale**: the item's *reviewed substance* is unchanged since `spec_review_sha` (else BLOCKED — reason `spec-edited-after-review`).

`spec_review: waived` short-circuits 1–3 to claimable (founder bypass). Convergence that escalated to the founder never sets `converged` (the watcher only writes the field on a non-escalated terminal verdict), so escalation is naturally excluded.

**Resolving the marker-write self-reference (r1 F1, both reviewers HIGH).** The watcher writes `spec_review`/`spec_review_sha` INTO the item file at the terminal commit, so a naïve "current file bytes == file@spec_review_sha bytes" check would read the marker write *itself* as a post-review edit and block the item forever. The staleness check therefore compares **normalized reviewed content**, not raw bytes: parse the current item and the item at `git show <spec_review_sha>:<path>`, drop the watcher-owned markers (`spec_review`, `spec_review_sha`) AND the agent-managed fields (`claimed_by`, `claimed_at`, `branch`, `worktree`, `head_sha`, `pr_url`, `agent_notes`, `review_notes`), then compare the remainder. The marker write only touches excluded keys ⇒ a freshly-converged item is FRESH; any edit to title / priority / blocked_by / requested_reviewers / estimate / body / ACs / files_to_modify / spec_refs ⇒ STALE ⇒ re-review. `spec_review_sha` = the round's reviewed `spec_commit_sha` (what the reviewers actually read), **not** the terminal marker commit.

**Two terminal paths, two markers (r2 F1, codex HIGH).** The watcher has two terminal shapes that certify different things, so they write different markers:
- **Case (a) zero-patch convergence** (`proceed`/`pushback`, no patches this round): the converged content == the reviewed `spec_commit_sha`, so the watcher writes `spec_review: converged` + `spec_review_sha: <reviewed spec_commit_sha>`; the staleness check above applies.
- **Case (c) verification-explicitly-waived** (`proceed_after_patches --patches-applied=false`: the strategist applied *mechanical* patches and waived the verification round): the converged content DIFFERS from the reviewed request sha, so a `converged` + reviewed-sha marker would be self-stale immediately. Instead the watcher writes `spec_review: waived` — semantically exact (verification *was* explicitly waived) and reusing the existing bypass value, which carries no sha and skips the staleness check.

The gate consumes one frontmatter value the watcher already decided; the selector reads item frontmatter it already parses (plus one `git show` for the case-(a) staleness normalization), and the convergence *judgment* stays in the watcher where it is computed.

### Founder bypass (explicit, auditable)
The founder (principal) may fast-track a spec past review by setting `spec_review: waived` in the item frontmatter. `blocked.py` treats `waived` as claimable. This satisfies the prior note's "founder-approved exceptions must have an explicit field or command path" — the bypass is greppable and deliberate, never silent. `waived` has **two** legitimate writers: the founder (manual fast-track) and the watcher at a case-(c) verification-waived terminal (above); both are deliberate and auditable.

### Ownership / trust
`spec_review` and `spec_review_sha` are **watcher/founder-owned, NOT builder-managed** frontmatter fields (added to the AGENT_INSTRUCTIONS non-builder list, AC4). A builder cannot self-certify its own spec's review — that would reintroduce the self-review failure the reviewer-independence rule exists to prevent.

## Acceptance Criteria

- **AC1 — Watcher writes the convergence marker (per terminal path; r2 F1).** `skills/review-queue-watch.md` instructs, folded into the existing terminal commit (no new commit): at a **case-(a) zero-patch convergence**, write `spec_review: converged` + `spec_review_sha: <reviewed spec_commit_sha>`; at a **case-(c) verification-explicitly-waived terminal** (mechanical patches, verification round waived), write `spec_review: waived` (no sha) — because the converged content differs from the reviewed sha there, a `converged`+sha marker would be self-stale immediately. The adapter `.claude/commands/review-queue-watch.md` is regenerated via `tools/sync-skills.sh` and `tools/sync-skills.sh --check` passes. *Test:* skill text + a fixture-level assertion that a case-(a) terminal produces `converged`+sha and a case-(c) terminal produces `waived`; OR, if the watcher step is not unit-testable, an explicit worked-example block in the skill plus a checklist line. (Builder: pick the strongest available verification and state it in agent_notes.)
- **AC2 — Gate in the selector.** `tools/blocked.py candidates()` marks a `ready/` item BLOCKED when it has non-empty `requested_reviewers` and `spec_review != converged` and `spec_review != waived`. The predicate lives in an isolated, unit-testable helper (e.g. `spec_review_satisfied(item) -> (bool, reason|None)`), NOT inlined into the sort. **(r1 F2)** Because `parse_frontmatter` currently reads the inline-list `requested_reviewers: ["a","b"]` form as a scalar string and `load_items` drops it from the record, AC2 also requires that `requested_reviewers` (inline-list form), `spec_review`, and `spec_review_sha` are parsed and preserved into the loaded item. If `requested_reviewers` is present but cannot be parsed into a list, the item is treated as review-required and BLOCKED — **fail CLOSED, never open.** The module docstring "Selection rule" is updated to state the review gate.
- **AC3 — Staleness re-blocks (normalized; r1 F1).** When `spec_review: converged` but the item's **normalized reviewed content** differs from the item at `spec_review_sha`, the item is BLOCKED (reason `spec-edited-after-review`). Normalized reviewed content = the parsed item with the watcher-owned markers (`spec_review`, `spec_review_sha`) and the agent-managed fields (`claimed_by`, `claimed_at`, `branch`, `worktree`, `head_sha`, `pr_url`, `agent_notes`, `review_notes`) removed before comparison — so the watcher's own marker write does NOT count as an edit, while any change to reviewed substance does. Source of the reviewed version = `git show <spec_review_sha>:<path>`. The normalization MUST be pinned by a test asserting (a) a marker-only delta is FRESH and (b) an AC-body delta is STALE. `waived` is exempt from the staleness check.
- **AC4 — Docs reflect the gate.** `docs/AGENT_INSTRUCTIONS.md` (claim contract) and `backlog/README.md` (pipeline) describe: the review gate, the conditional-on-`requested_reviewers` scope, the `waived` bypass (set by the founder for a manual fast-track OR by the watcher at a case-(c) verification-waived terminal), and that `spec_review`/`spec_review_sha` are watcher/founder-owned (NOT builder-managed).
- **AC5 — Validation (r1 F3b).** `blocked.py --validate` rejects (exit 2): (a) an item whose `spec_review` is present but not in `{converged, waived, pending}`; (b) an item with `spec_review: converged` and a MISSING or malformed `spec_review_sha` — a converged marker without a usable sha must fail validation AND be treated as BLOCKED by the gate, never unblock; (c) a present-but-malformed `spec_review_sha` under any value. Absent `spec_review` is valid ("not yet reviewed"). `waived` is the only value that legitimately carries no sha.
- **AC6 — Tests (r1 F2/F3a).** `tools/test_blocked.py` (the EXISTING dedicated harness, run `python3 tools/test_blocked.py`) is EXTENDED to cover cases (i)-(vii) in `files_to_modify` — including the inline-list `requested_reviewers: ["codex","codex-ops"]` fixture matching the live 085/086 shape, and the marker-only-FRESH vs AC-body-STALE pair from AC3. Empty/absent `requested_reviewers` ⇒ claimable is a REGRESSION guard for today's behavior. `tools/test_blocked.py` passes; `blocked.py --validate` passes on the real backlog after this spec's own fields are present; existing `npm test` suites remain green.
- **AC7 — No behavior change for unreviewed-by-design items.** Items with `requested_reviewers: []` or no `requested_reviewers` field select exactly as before (verified by AC6 case (i) + a run of `blocked.py --list-all` showing such items still READY).

## Alternatives Considered

- **Approach A — artifact-read in the selector (the prior note's proposal).** `blocked.py` walks `backlog/reviews/<id>/`, finds the latest `r<N>/combined.md`, and reads `combined_verdict` + `escalated_to_founder`. *Why not primary:* it pushes review-queue artifact-schema parsing + "find latest round" + "is this round terminal vs intermediate" logic into the safety-critical deterministic selector, coupling it to the queue's artifact format and the `proceed` vs terminal-`proceed_after_patches` distinction. Approach B keeps the selector reading one boolean and leaves the convergence judgment in the watcher that already computes it. **If reviewers judge A's "no new write path / signal already durable in artifacts" outweighs the selector-coupling cost, that is a legitimate convergence — the gate predicate is identical; only the signal source differs.**
- **New stage `approved/`.** `ready/` (under review) → `approved/` (converged, claimable); `blocked.py` selects from `approved/`. *Why not:* adds a folder to the `STAGES` tuple referenced across `blocked.py`, `request.py`, `combine.py`, `dispatch-next-round.py`, README, AGENT_INSTRUCTIONS — large blast radius and re-drift risk for what a single frontmatter field expresses.

## Out of Scope (Don't Drift)

- **Making `backlog/inbox/` reviewable-but-not-claimable.** That is the *complementary* half of the same two-axis model (`_followups.md:9`: teach `request.py`/`combine.py`/`dispatch-next-round.py` to scan `inbox/` while `blocked.py` keeps excluding it). Related but a separate item — do NOT bundle.
- **Changing how convergence is computed.** `combine.py`'s verdict roll-up and the watcher's escalation boundary are unchanged. 086 only *consumes* the existing terminal decision.
- **Mechanizing `docs/BACKLOG.md`** (the separate doc-drift item) — unrelated.
- **Auto-firing reviewers / a headless dispatcher.** 086 enforces the gate; it does not change who starts review rounds.

## After Completion (Strategist Notes)

- Promote the two-axis (reviewable ⟂ claimable) state model to `wiki/operating-model/` (likely extend the cross-tool-spec-review page) once shipped — document the gate, the `spec_review`/`spec_review_sha` fields, and the `waived` bypass.
- Re-point `backlog/_followups.md:578` ("builder selector — spec-review convergence is not enforced before claim") to "shipped via 086."
- Note the complementary `inbox/`-reviewable item (`_followups.md:9`) as the next candidate in the same model.
