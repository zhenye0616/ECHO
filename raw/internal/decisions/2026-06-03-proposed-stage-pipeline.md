# Design: add a `proposed/` stage — make backlog folder-location the single source of truth for claimability

**Date:** 2026-06-03
**Status:** design (feeds backlog item 088)
**Authors:** founder + Claude (strategist), with a cross-vendor Codex design consult (2026-06-03)
**Touches pipeline infra — handle with the careful, never-half-broken migration order below.**

## Problem

Backlog stages today: `ready/ → claimed/ → pending_review/ → complete/`.

A spec must pass multiple rounds of **spec review** before it should be claimable. But `ready/`
holds **two states at once**: "specced but still in spec-review" and "converged, claimable now."
Item 086 (shipped 2026-06-02) disambiguated *within* `ready/` by adding a `spec_review:
converged|pending|waived` **state field** + a `spec_review_sha` staleness check, and gating
`tools/blocked.py` (the sole claim selector) on that field.

That fixed the *correctness* bug (specs were claimable before review) but created a **legibility**
bug: folder location stopped meaning one thing. A spec in `ready/` could be claimable or not, and
you could only tell by reading frontmatter or running `blocked.py`. The rest of the pipeline
(`claimed/`, `pending_review/`, `complete/`) has the property that **location == state**; 086 broke
that property for `ready/` by splitting a state with a *field* instead of a *location*.

## The model (decided)

Add one stage **before** `ready/`, and delete `inbox/`:

```
[raw idea]            → ECHO session context only — NO artifact (retrievable via ECHO MCP)
      │  write a spec draft
      ▼
proposed/ ─ full spec-review pipeline until convergence ─► ready/ → claimed/ → pending_review/ → complete/
(spec draft, in review)                                    (claimable now)
```

- **Raw ideas have no file.** Phase 1 (an unspecced idea) lives in session/ECHO context and is
  retrievable via ECHO MCP. ECHO *is* the capture layer for pre-spec ideas, so `inbox/` is replaced
  by retrieval, not by another folder. `inbox/` is **removed**.
- **`proposed/`** = a written spec draft, from first commit through spec-review convergence.
  Presence in `proposed/` means "this is in spec-review." There is **no draft-vs-in-review
  sub-flag** — a flag would recreate 086's hidden-field sin one level down. Drafting-before-you're-
  ready-for-review happens in the working tree, pre-commit.
- **`ready/`** = ONLY converged (or explicitly-promoted) specs = claimable. Location is the single
  source of truth again: a spec is in `ready/` ⟺ it is claimable.

This **keeps 086's intent** ("a spec must converge before it's claimable") and **replaces 086's
mechanism**: convergence now MOVES the file `proposed/ → ready/` instead of flipping an in-place
field.

## Decision 1 — promotion is AUTOMATED (no human beat)

The spec-review watcher, at terminal convergence, performs the `proposed/ → ready/` move as its
terminal step (replacing 086's marker-write). Converged ⇒ instantly claimable, no human checkpoint.

Rationale (Claude + Codex convergent): the spec-review *is* the gate. Once codex/codex-ops converge
there is no further human judgment needed *before a builder starts*, because the builder's output is
still independently code-reviewed and the founder still owns the irreversible `push origin main`
merge gate. A human "make claimable" checkpoint after convergence is a second gate with **no new
safety property**, and it re-inserts the founder into execution — against the loop-close goal.

Rejected: (b) human-gated promotion [re-inserts founder serialization]; (c) a "hold" marker
[recreates 086's hidden-state mistake — if something shouldn't be claimable, encode it structurally:
keep it in `proposed/`, add a real `blocked_by`, or don't create the artifact yet].

## Decision 2 — delete the `spec_review` state field; keep ONLY a renamed integrity checksum

Once the **stage** encodes claimability, the `spec_review: converged|pending|waived` **state field
is deleted entirely** — it has nothing left to disambiguate, and it was the source of the dual-truth
(folder says one thing, field says another).

Keep the content checksum, but **rename it away from review-state language to `ready_content_sha`**,
because it is **not state — it is an integrity guard (a tamper-seal) on the `ready/` stage**:

- `proposed/` = review in progress
- `ready/` = claimable
- `ready_content_sha` = sha-256 of the spec's **normalized content** (reuse 086's
  `spec_review_content_sha()` normalization: hash the spec body + spec-relevant frontmatter; EXCLUDE
  the volatile agent-managed fields `claimed_by`/`claimed_at`/`branch`/`worktree`/`head_sha`/
  `pr_url`/`review_notes` and the checksum line itself), stamped at the moment the spec enters
  `ready/`. It proves the file still matches the content that was blessed into `ready/`.

**On mismatch, fail closed and bounce back to `proposed/`** (not a silent claim). This is the same
protection 086 gives — and it is LIVE: today a strategist edited a `ready/` spec (087b) and 086's
sha staleness correctly re-blocked it. The redesign expresses that as a **stage-bounce** instead of
an in-place claim-block.

**Waiver becomes uniform with promotion:** `ready/` = "reviewed OR explicitly promoted, claimable at
this content." A founder waiver is simply: founder stamps the current content's `ready_content_sha`
and moves the file to `ready/`. No special `spec_review: waived` value — that status label is also
deleted.

## Decision 3 — `docs/BACKLOG.md` becomes GENERATED, not hand-maintained

Once specs are *created* in `proposed/`, the hand-maintained "Ready" table can no longer be the
creation target. `docs/BACKLOG.md` is **demoted from lifecycle authority and generated from folder
state** (a `tools/backlog_index.py`, mirroring `tools/wiki_index.py` → `wiki/index.md`). This
removes a whole drift class and avoids forcing automation (the watcher) to write a strategist-only
file. `docs/BACKLOG.md` stays a strategist/founder-readable view; it is regenerated, never edited by
hand or by a builder.

## The claim-selector contract (new `blocked.py`)

A `ready/` item is an UNBLOCKED candidate iff ALL hold:
1. `stage == ready` (folder location — the only "is it claimable" signal)
2. every `blocked_by` dep is in `complete/`
3. `ready_content_sha` is present AND matches the recomputed normalized-content hash (else: fail
   closed; the item is invalid-in-`ready/` and must be bounced to `proposed/`)

No `spec_review` field is read. `proposed/` items are never candidates.

## Pitfalls and how each is neutralized (Codex adversarial pass)

1. **Promotion must be idempotent + crash-recoverable, not an ad-hoc `git mv`.** The durable
   boundary is `origin/main:backlog/ready/<id>.md`. If the watcher crashes after pushing
   `combined.md` but before promoting, the next tick must **recompute** the promotion from review
   artifacts — else a converged spec is stranded outside `ready/`. Apply the same P1 mindset as the
   `claimed→pending` move (079 AC3 / the "pipeline resumable from interruption" invariant): a
   watcher pre-step scans for "combined-but-not-promoted/terminalized" rounds before running
   `combine.py`; promotion is an upsert with a remote-boundary check and safe re-run.
2. **Two `git mv`s (promote, then claim) are fine — the risk is non-idempotency, not the two moves.**
   Each move is serialized by push: a builder cannot claim an unpushed promotion; a race just hits
   pull/push rejection (existing atomic-claim behavior). No new race surface beyond #1.
3. **`request.py find_artifact()` must learn `proposed/` FIRST** (it currently scans only
   `ready|claimed|pending_review|complete`) — otherwise proposed specs are literally unreviewable.
4. **`blocked_by`: `proposed/` items count as known IDs for validation, but only `complete/`
   SATISFIES a dep** (so deps on future work don't look dangling, and nothing claims early).
5. **Review artifacts are id-keyed** (`backlog/reviews/<id>/rN/…`) and reviewers read them via
   `git show <spec_commit_sha>:<artifact_path>`, so stage moves don't break them — but terminal
   promotion must compute the checksum on the *current `proposed/` file*, then move it (don't assume
   `ready/` exists yet).
6. **task-state pointers** (`backlog/task-state/<id>/*.md`, `canonical_anchors.spec`) and templates
   must start new strategist pointers at `backlog/proposed/…`; promotion updates/tolerates the moved
   path. (087b's "lifecycle-mobile path" prose is the right pattern for humans but not enough for
   machine pointers.)
7. **The `status:` frontmatter field is another latent dual-source** — make it display-only /
   deprecate it; code depends on folder location, never on `status:`.

## Safe migration order (never half-broken)

1. Add `backlog/proposed/.gitkeep`; update docs/templates/diagrams to
   `proposed → ready → claimed → pending_review → complete`.
2. `blocked.py`: load `proposed/` for validation, but keep candidates strictly `ready/`.
3. **Transitional dual-read:** 086's `spec_review` gate still works for existing `ready/` items
   while `ready_content_sha` is introduced — so the pipeline is never half-broken mid-migration.
4. `request.py find_artifact()`: scan `proposed/` first.
5. Rework watcher terminal path: on convergence, stamp `ready_content_sha`, `git mv proposed→ready`,
   commit with the terminal `combined.md`, push via retry — idempotent/recoverable (pitfall #1).
6. Add stale-`ready/` detection: `ready_content_sha` mismatch ⇒ fail closed; bounce `ready→proposed`
   via an explicit repair/promotion helper (never a silent claim).
7. Migrate existing items. Current state after today's fixups: `ready/` holds only 087b
   (converged/waived → legitimately claimable, stays in `ready/`; replace its `spec_review: waived`
   with a current `ready_content_sha`). `claimed/`, `pending_review/` empty → trivial.
8. Remove legacy `spec_review` values from selector/docs/tests once no live item depends on them.
9. Update process/backlog skills (`process-backlog`, `process-backlog-batch`, `review-queue-watch`,
   `merge-and-cleanup`), `.claude/` adapters (via `sync-skills.sh`), task-state docs, `BACKLOG.md`
   generation, and tests.

## 086 supersession

Keep 086's INTENT; replace its MECHANISM. Inverted/removed: 086 AC1 (watcher writes `spec_review`
marker → becomes "watcher promotes proposed→ready"), 086 AC2 (blocked.py field-gate → becomes the
stage + `ready_content_sha` contract above), and the related 086 tests are rewritten for the
stage/checksum model. The staleness/validation behavior is preserved (renamed), not dropped.

## Scope / out of scope

- IN: the stage model, `blocked.py` contract, the watcher promotion rework (idempotent), `request.py`
  + `blocked_by` validation, `ready_content_sha`, generated `BACKLOG.md`, migration, 086 rework,
  docs/skills/tests.
- OUT: the `echo_skill()` render-at-use-time work and the code-own-emission / adapter-drift-gate
  root-cause fixes (those are the demoted `_followups.md` items, unrelated to stage topology);
  changing what spec-review CONTENT does (rounds, reviewers, convergence computation) — only WHERE
  the artifact lives changes.

## Becomes backlog item 088

This design is specced as `088` (the freed ID) and goes through the cross-tool spec-review pipeline
before any code lands. Reviewer roster: `["codex", "codex-ops"]`.
