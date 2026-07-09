---
id: 2026-07-09-130-decision-changeset-compiler-v0
title: "Decision→Linear changeset compiler v0: meeting decision cards materialize as an editable batch changeset (creates + closes), human-confirmed in one gesture"
status: proposed
priority: HIGH
estimate: 2.5d
created: 2026-07-09
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-09-decision-changeset-compiler-design.md   # full design rationale — READ FIRST
  - raw/internal/decisions/2026-07-08-decision-confirm-friction.md            # why one batch gesture, not N buttons
  - backlog/complete/2026-07-01-109-granola-meeting-intake-bridge.md          # the bridge this extends
  - backlog/complete/2026-06-27-108-slack-linear-intake-gate.md               # confirm-gated Linear create + idempotency machinery
  - src/surfaces/ceo-slack-responder/decision-store.ts                        # team-decision atoms, dedupe_key supersession chains
  - src/surfaces/ceo-slack-responder/draft-store.ts                           # draft lifecycle (pending/confirmed/dismissed)
  - src/surfaces/ceo-slack-responder/linear-client.ts                         # existing create path; close path is NEW
  - src/enrich/granola-intake-candidates.ts                                   # extraction/classification seam
files_to_modify:
  # PROVISIONAL — builder refines, no scope expansion
  - src/surfaces/ceo-slack-responder/decision-changeset.ts        # NEW: compile shaped cards + Linear state → changeset; apply on confirm
  - src/surfaces/ceo-slack-responder/decision-store.ts            # decision_type + supersedes metadata on appended atoms
  - src/surfaces/ceo-slack-responder/draft-store.ts               # changeset draft record (batch, per-meeting)
  - src/surfaces/ceo-slack-responder/linear-client.ts             # close-issue mutation + decision_atom_id stamp on create
  - src/surfaces/ceo-slack-responder/responder.ts                 # batch card render, thread-reply edit loop, confirm/apply
  - src/enrich/granola-intake-candidates.ts                       # decision_type classification on extracted cards
  - tests/surfaces/decision-changeset.test.ts                     # NEW
---

## Context

The meeting→decision extraction leg is live (two real runs: 2026-07-08 audio-test 1 card, EchoBrain Legal 5 cards, founder verdict 5/5 useful). What's missing is the materialization step: turning confirmed decisions into tracker work. Founder scope call: Granola + Linear + Slack confirm only — no coding-agent capture at this tier. Full reasoning in the design note (spec_refs[0]); this spec is the v0 cut: **simplest pipeline, maximum human editability** — the system stages what the human is already compiling in their head; the human corrects anything; refinement comes from real usage.

## The v0 pipeline

1. **Extract** (exists): Granola note → decision cards (subject, decision, rationale from transcript). Fabrication boundary: spoken content only — no invented subtasks, decomposition, or acceptance criteria. Spoken structure ("first X, then Y") may yield multiple work items.
2. **Classify** (new, thin): each card gets `decision_type`: `executable` | `directional` | `negative` | `conditional`. Bias executable-when-uncertain (a mis-issued directional pollutes mildly; a dropped executable never gets assigned). Human can retype any card at stage 5.
3. **Resolve** (new, deliberately dumb): close-targets for `negative` cards are proposed ONLY via decision-lineage (open issues stamped with a decision_atom_id whose subject chain matches) — otherwise the card shows "targets: ? (reply to pick)". NO fuzzy matching in v0. Never guess.
4. **Compile** (new): changeset =
   - `executable` → issue create(s): title = executable core near-verbatim; description = decision text + rationale + Granola note link + `decision_atom_id`; assignee only if spoken; project from the configured subject→project map, else unassigned-project line on the card.
   - `negative` → issue close(s) with the decision text as the closing comment.
   - `directional` / `conditional` → NO tracker mutation; rendered on the card as ledger-only lines (visibly not dropped); conditional records its tripwire text in atom metadata for the future brief.
5. **Confirm** (new shape): ONE batch card per meeting posted to the confirm target — the changeset staging view ("5 decisions → 3 creates, 2 closes, 1 ledger-only"). The card is backed by a NEW `ChangesetDraft` record type in the draft store — `{draft_id, note_id, revision, lines[], edit_history[], status: pending|applying|applied|dismissed}`, each line carrying a stable `line_key` (see stage 6) and its proposed mutation. The existing per-decision `DecisionDraft` / `propose_decision` path is untouched; meeting-extraction batches route EXCLUSIVELY to `ChangesetDraft` — no per-decision cards are posted for meeting decisions. Each rendered line shows a stable line id (`L1`..`Ln`). Human edits via thread replies, parsed (intake-agent provider) into structured ops from the fixed set `{retitle, reassign, reproject, retype, retarget, strike, restore, split, add}`, each addressing a line id; applying ops increments `revision`, re-renders the card, and appends to `edit_history`. **Edit failure contract:** an unparseable or ambiguous reply applies NOTHING — draft unchanged, the failed reply recorded in `edit_history`, and the responder posts a visible needs-clarification message naming what it could not resolve. Nothing executes until one explicit confirm. Per-line strike and whole-card dismiss both work. **Edit/confirm race:** the confirm action binds to the `revision` it was rendered against; if edits landed after that revision, the apply is REJECTED and the card re-renders with a visible "draft changed — reconfirm" message. A stale rendering is never silently applied.
6. **Execute + stamp** (new): two-phase apply with pinned crash ordering. Every line has a stable `line_key = <note_id>:<draft_id>:<line-slug>` fixed at compile time (exists BEFORE any atom). On confirm: **phase 1** appends team-decision atoms for ALL surviving lines (all types) with `decision_type`, rationale, meeting provenance, `line_key` as the atom-level dedupe key, and `supersedes` when the subject chain already has an operative atom — on retry, an existing atom with the same `line_key` is REUSED (its atom_id recovered from storage), never re-appended; **phase 2** applies Linear mutations idempotently keyed by `decision_atom_id` (creates) and `decision_atom_id` + target issue id (closes). The draft transitions `pending → applying → applied`; `applied` is set only after every surviving line's side effects complete, so a crash mid-apply leaves `applying` and retry resumes per-line, skipping lines whose mutation already exists. Every created issue carries its `decision_atom_id` — this stamp is non-negotiable and lands even if every other field is human-rewritten.

## Acceptance Criteria

- **AC1 (batch card):** a Granola note with confirmed extraction produces exactly one `ChangesetDraft` and exactly one changeset draft message in the confirm channel — and zero per-decision `DecisionDraft` cards — listing every extracted decision with its type, line id, and proposed mutations; directional/conditional decisions appear as explicit ledger-only lines. The existing `propose_decision` MCP path continues to produce per-decision `DecisionDraft` cards unchanged.
- **AC2 (editability):** a thread reply parsed into any op in `{retitle, reassign, reproject, retype, retarget, strike, restore, split, add}` against a line id changes exactly that field before confirm; the re-rendered card reflects the edit and `revision` increments; `edit_history` records every attempt. An unparseable or ambiguous reply changes NOTHING, is recorded in `edit_history` as failed, and produces a visible needs-clarification reply. Tests drive the op set deterministically via the parser's structured op output.
- **AC3 (nothing-before-confirm):** zero Linear mutations and zero team-decision atoms exist before the explicit confirm action; dismiss leaves no side effects beyond the draft record's `dismissed` status.
- **AC4 (execute + stamp, pinned ordering):** on confirm, phase 1 (atoms) completes before phase 2 (Linear): creates carry decision text + rationale + Granola link + `decision_atom_id` in the issue; closes carry the decision text as closing comment; ALL surviving lines (including ledger-only) append team-decision atoms with `decision_type`, `line_key`, and meeting provenance; the draft reaches `applied` only after all surviving lines' side effects complete.
- **AC5 (idempotency, both phases):** re-running extraction on the same note (Granola re-summarization), retrying a crashed apply from `applying`, or double-confirming never duplicates anything: atoms dedupe on `line_key` (existing atom's id is reused on retry), creates dedupe on `decision_atom_id`, closes dedupe on `decision_atom_id` + target issue id — closing an already-closed issue succeeds as a no-op and the closing comment is never posted twice.
- **AC6 (no-guess resolution):** a negative card with no lineage-resolvable targets renders as needs-input and cannot be confirmed into a close without a human-picked target.
- **AC7 (supersession):** confirming a decision whose normalized subject already has an operative atom appends with a `supersedes` pointer to the prior atom id; the chain is queryable.
- **AC8 (edit/confirm race):** a confirm issued against revision N when the draft is at revision M > N is rejected without side effects and the card re-renders with a visible reconfirm message; a confirm arriving while status is `applying` is a no-op (the in-flight apply owns the draft).

## Out of Scope (Don't Drift)

- Pre-meeting brief generator (separate follow-on item; consumes the stamps this item writes).
- Rescope-as-edit and tripwire annotations on Linear issues (degrade to close+recreate / ledger-only).
- Fuzzy reference resolution, alias tables, auto-assignment beyond spoken names.
- Any new mutable ECHO-side store ("threads base" etc.) — threads stay emergent via canonical_subject; ledger stays append-only.
- Multi-human / federation; new UI surfaces beyond the existing Slack responder.
- Brief epistemics (five-state grammar, preview-as-endorsement) — recorded in the design note for the brief item.

## After Completion (Strategist Notes)

Wiki: new `surfaces/decision-changeset-compiler.md` (pipeline, fabrication boundary, changeset semantics) + update `surfaces/mcp-server.md` if any MCP surface changes + update `architecture/interface-layers.md` if the confirm-card grammar becomes a canonical pattern. Update `capture/per-app/` only if Granola field usage changes. Follow-on items to spec after usage: pre-meeting brief generator (Linear read + five-state grammar + preview-as-endorsement), confirm-leg operational hardening (responder-not-running = dead buttons, 2026-07-08 finding).
