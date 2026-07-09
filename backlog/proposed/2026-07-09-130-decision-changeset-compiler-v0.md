---
id: 2026-07-09-130-decision-changeset-compiler-v0
title: "Decision→Linear changeset compiler v0: meeting decision cards materialize as an editable batch changeset (creates + closes), human-confirmed in one gesture"
status: proposed
priority: HIGH
estimate: 2d
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
5. **Confirm** (new shape): ONE batch card per meeting posted to the confirm target — the changeset staging view ("5 decisions → 3 creates, 2 closes, 1 ledger-only"). Human edits ANYTHING via natural-language thread replies (retitle, reassign, retype, strike a line, change close-targets, split/merge items); responder re-renders the draft. Nothing executes until one explicit confirm. Per-line strike and whole-card dismiss both work.
6. **Execute + stamp** (new): on confirm — (a) append team-decision atoms for ALL cards (all types) with `decision_type`, rationale, meeting provenance, `supersedes` when the subject chain already has an operative atom; (b) apply Linear creates/closes through the existing idempotency machinery, keyed `decision_atom_id` + child slug (re-extraction / retry never double-creates); (c) every created issue carries its `decision_atom_id` — this stamp is non-negotiable and lands even if every other field is human-rewritten.

## Acceptance Criteria

- **AC1 (batch card):** a Granola note with confirmed extraction produces exactly one changeset draft message in the confirm channel, listing every extracted decision with its type and proposed mutations; directional/conditional decisions appear as explicit ledger-only lines.
- **AC2 (editability):** a natural-language thread reply can change any field of any line (title, assignee, project, type, close-targets, strike/restore) before confirm; the re-rendered draft reflects the edit; the draft store records the edit history.
- **AC3 (nothing-before-confirm):** zero Linear mutations and zero team-decision atoms exist before the explicit confirm action; dismiss leaves no side effects.
- **AC4 (execute + stamp):** on confirm, every surviving line applies: creates carry decision text + rationale + Granola link + `decision_atom_id` in the issue; closes carry the decision text as closing comment; ALL surviving cards (including ledger-only) append team-decision atoms with `decision_type` and meeting provenance.
- **AC5 (idempotency):** re-running extraction on the same note (Granola re-summarization) or retrying a crashed apply never double-creates issues or duplicate atoms (dedupe on `decision_atom_id` + child slug; existing draft-lock pattern).
- **AC6 (no-guess resolution):** a negative card with no lineage-resolvable targets renders as needs-input and cannot be confirmed into a close without a human-picked target.
- **AC7 (supersession):** confirming a decision whose normalized subject already has an operative atom appends with a `supersedes` pointer to the prior atom id; the chain is queryable.

## Out of Scope (Don't Drift)

- Pre-meeting brief generator (separate follow-on item; consumes the stamps this item writes).
- Rescope-as-edit and tripwire annotations on Linear issues (degrade to close+recreate / ledger-only).
- Fuzzy reference resolution, alias tables, auto-assignment beyond spoken names.
- Any new mutable ECHO-side store ("threads base" etc.) — threads stay emergent via canonical_subject; ledger stays append-only.
- Multi-human / federation; new UI surfaces beyond the existing Slack responder.
- Brief epistemics (five-state grammar, preview-as-endorsement) — recorded in the design note for the brief item.

## After Completion (Strategist Notes)

Wiki: new `surfaces/decision-changeset-compiler.md` (pipeline, fabrication boundary, changeset semantics) + update `surfaces/mcp-server.md` if any MCP surface changes + update `architecture/interface-layers.md` if the confirm-card grammar becomes a canonical pattern. Update `capture/per-app/` only if Granola field usage changes. Follow-on items to spec after usage: pre-meeting brief generator (Linear read + five-state grammar + preview-as-endorsement), confirm-leg operational hardening (responder-not-running = dead buttons, 2026-07-08 finding).
