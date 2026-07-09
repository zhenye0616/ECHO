---
item_id: 2026-07-09-130-decision-changeset-compiler-v0
round: 1
combined_at: '2026-07-09T18:53:48Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 2
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | both (convergent on `AC2`) | AC2 | accepted — patched | d71b7379: AC2 + stage-5 now pin a structured op set `{retitle, reassign, reproject, retype, retarget, strike, restore, split, add}` addressed to stable line ids (L1..Ln), parsed via the intake-agent provider into deterministic ops; failure contract pinned (unparseable/ambiguous reply changes nothing, recorded in edit_history as failed, visible needs-clarification reply). Tests assert against parser op output. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC4/AC5 | accepted — patched | d71b7379: stage 6 now two-phase with pinned crash ordering; stable `line_key = <note_id>:<draft_id>:<line-slug>` fixed at compile time is the atom-level dedupe key; retry recovers existing atom ids by line_key instead of re-appending; draft `pending → applying → applied`, terminal only after all side effects; AC4/AC5 rewritten accordingly. |
| 2 | MEDIUM | codex | AC1/AC3 | accepted — patched | d71b7379: NEW `ChangesetDraft` record type pinned in stage 5 (draft_id, note_id, revision, lines[], edit_history, status); meeting batches route exclusively to ChangesetDraft, zero per-decision DecisionDraft cards posted (now asserted in AC1); existing propose_decision path explicitly unchanged. |
| 3 | MEDIUM | codex | AC5 / linear-client close path | accepted — patched | d71b7379: AC5 now covers closes — dedupe on `decision_atom_id` + target issue id; closing an already-closed issue is a no-op; closing comment never posted twice. |
| 4 | MEDIUM | codex-ops | AC4 / AC5 | accepted — patched | Same root cause as divergent #1 (both reviewers converged on the mint-order trap); same d71b7379 patch: line_key exists before atoms, atoms reused on retry, mutations resume per-line from `applying`. |
| 5 | MEDIUM | codex-ops | AC4 / AC5 / linear-client close path | accepted — patched | Same root cause as divergent #3; same d71b7379 close-idempotency patch (no-op on already-closed, comment deduped by decision_atom_id + issue id). |
| 6 | MEDIUM | codex-ops | AC2 / AC4 | accepted — patched | d71b7379: NEW AC8 — confirm binds to the revision it rendered against; stale confirm rejected without side effects + visible reconfirm message; confirm during `applying` is a no-op. Edits increment `revision`. |

## Convergence call

needs R2 — focus_hints: verify d71b7379 patches hold: (1) two-phase apply — is line_key well-defined for `add`/`split` lines created by human edits after compile time? (2) ChangesetDraft/DecisionDraft coexistence — any seam where station-4 propose_decision could double-post? (3) AC8 revision CAS — is the `applying` no-op rule sufficient or does a crashed `applying` draft need an operator unlock path? (4) close idempotency wording testable as written?

