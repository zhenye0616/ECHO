---
task_id: 2026-07-09-130-decision-changeset-compiler-v0
role: builder
binding: codex
last_updated: 2026-07-09T19:21:55Z
branch: agent/decision-changeset-compiler-v0
status: claimed
---

## current_thesis
Claimed by Codex builder. Implement the v0 Decision-to-Linear changeset compiler exactly as the spec defines: one editable batch Slack changeset draft per Granola meeting extraction, human-confirmed apply, team-decision atom stamping, Linear create/close side effects, and idempotent retry/ownership semantics.

## locked_decisions
- AC1: meeting extraction batches create exactly one ChangesetDraft and one confirm-channel changeset message, with no per-decision DecisionDraft cards; propose_decision remains unchanged.
- AC2: supported edit ops are retitle, reassign, reproject, retype, retarget, strike, restore, split, add; every attempt is recorded, duplicate source event keys replay as no-ops, and failures change nothing while posting clarification.
- AC3: before explicit confirm, there are zero Linear mutations and zero team-decision atoms; dismiss only marks the draft dismissed.
- AC4: confirm appends atoms for all surviving lines before Linear mutations; creates and closes carry decision text, rationale, Granola provenance, decision_atom_id, decision_type, and line_key as specified.
- AC5: extraction reruns, crashed apply retry, and double confirm must not duplicate atoms, creates, or closes; line_key and durable close marker are the dedupe anchors.
- AC6: negative decisions without lineage-resolvable targets render as needs-input and cannot close anything until a human target is supplied.
- AC7: confirming an operative-subject successor appends a supersedes pointer to the prior atom id and leaves the chain queryable.
- AC8: confirm is revision-bound and CAS-owned; stale confirms reject, concurrent confirms yield one owner, fresh applying leases no-op, stale leases resume, and owner fencing blocks stale side effects.

## open_questions
- None at claim; escalate if implementation needs files, dependencies, UI surfaces, fuzzy resolution, or mutable stores outside the spec.

## dont_touch
- Do not build the pre-meeting brief generator.
- Do not implement rescope-as-edit or tripwire annotations on Linear issues; degrade as specified.
- Do not add fuzzy reference resolution, alias tables, or auto-assignment beyond spoken names.
- Do not add any new mutable ECHO-side store; threads stay emergent through canonical_subject and the ledger stays append-only.
- Do not add multi-human/federation behavior or new UI surfaces beyond the existing Slack responder.
- Do not implement brief epistemics or preview-as-endorsement grammar.

## canonical_anchors
- spec: backlog/claimed/2026-07-09-130-decision-changeset-compiler-v0.md
