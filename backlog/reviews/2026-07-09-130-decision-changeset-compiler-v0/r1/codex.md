---
item_id: "2026-07-09-130-decision-changeset-compiler-v0"
round: 1
reviewer: "codex"
artifact_sha: "d36cf4fc83ca21aa5a1e78d6b22a07de3983de1f"
completed_at: '2026-07-09T18:52:27Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4/AC5"
    finding: "Pin the confirm/apply crash ordering. The spec mints decision_atom_id by appending atoms before Linear mutations, but AC5 only names dedupe on decision_atom_id + child slug; a crash after atom append but before all mutations can make retry append new atoms and produce new idempotency keys. Require a stable per-meeting/per-line atom dedupe key, recovery of existing per-line decision_atom_id values before applying Linear mutations, and a terminal draft state only after all side effects complete."
  - severity: "medium"
    where: "AC2"
    finding: "Define the v0 edit contract instead of requiring unbounded natural-language edits to any field. Add the concrete accepted thread-edit grammar or command patterns, line identifiers, failure behavior for ambiguous edits, and the responder/draft-store ownership path so tests can assert title, assignee, project, type, close-targets, strike, and restore edits deterministically."
  - severity: "medium"
    where: "AC1/AC3"
    finding: "Specify how the new batch changeset draft bypasses or replaces the existing per-decision draft/card lifecycle. AC1 requires exactly one changeset draft message and AC3 requires zero atoms before confirm, but the spec does not state whether a new draft record type is introduced or how existing DecisionDraft posting is suppressed for Granola decision batches."
  - severity: "medium"
    where: "AC5 / src/surfaces/ceo-slack-responder/linear-client.ts"
    finding: "Extend idempotency coverage to close mutations, not only issue creates and atoms. Require retrying a close to avoid duplicate closing comments and to treat an already-closed issue with the matching decision stamp/comment as a no-op."
---
