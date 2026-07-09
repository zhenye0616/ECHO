---
item_id: 2026-07-09-130-decision-changeset-compiler-v0
round: 2
combined_at: '2026-07-09T19:00:23Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

Reframe gate: FIRED — all 7 findings target mechanisms introduced by the r1 patch (d71b7379: line_key, applying state, close idempotency). Fresh-context investigator (codex exec read-only, session 019f4841) returned `kind: propagation_completion`: the findings are the unpropagated edges of the r1 invariants, not patch-on-patch drift; cutting split/add would violate the founder's explicit max-flexibility requirement. Diagnostic check applied before patching: the r2 patch adds no new user workflow or store — it completes four falsifiable contracts (split/add retry reuses line_key; two same-revision confirms → one owner; stale-applying confirm resumes; existing close marker prevents repost). Recommendation validated and accepted; no removal (removal matrix not applicable — no mechanism dropped). Investigator also flagged the residual risk (duplicate Slack edit-delivery could dupe edit_seq) — carried into r3 focus hints.

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | The v0 pipeline stage 5-6 / AC2 / AC5 | accepted — patched (propagation completion) | 94f7cb71: line_key allocated once at line creation from immutable metadata — compile lines `c<compile_index>`, split/add lines `e<edit_seq>[-<child>]` from edit_history position; text slug REMOVED from the key (retitle-stable); AC5 adds the split-retry-no-duplicate-atom test. |
| 2 | MEDIUM | codex | The v0 pipeline stage 5 / AC8 | accepted — patched | 94f7cb71: phase 0 atomic store-level CAS `pending@revN → applying{owner_token, lease_at}`; AC8 requires the deterministic concurrency test (two same-revision confirms → exactly one owner). |
| 3 | MEDIUM | codex | The v0 pipeline stage 6 / AC5 / AC8 | accepted — patched | 94f7cb71: named resume trigger — confirm handler doubles as resume; fresh lease (<10 min) → visible no-op, stale lease → CAS ownership takeover + per-line resume; stuck `applying` rendered visibly on the card. |
| 4 | MEDIUM | codex | AC5 / linear-client.ts close path | accepted — patched | 94f7cb71: durable close marker `echo:decision:<atom_id>:issue:<issue_id>` embedded in the closing comment, queried before posting; marker-comment-before-state-transition ordering pinned; already-closed + marker = full no-op (test required). |
| 5 | MEDIUM | codex-ops | spec:43 (line_key vs split/add) | accepted — same root cause as #1 | Same 94f7cb71 patch — keys from immutable draft/edit metadata, never mutable line text (reviewer's exact prescription adopted). |
| 6 | MEDIUM | codex-ops | spec:54 (applying recovery) | accepted — same root cause as #3 | Same 94f7cb71 patch — owner_token + stale-lease confirm-as-resume + visible stuck-state evidence on the card. |
| 7 | MEDIUM | codex-ops | spec:51 (durable close marker) | accepted — same root cause as #4 | Same 94f7cb71 patch — deterministic marker checked on retry before posting. |

## Convergence call

needs R3 — focus_hints: verify 94f7cb71 closes the r2 set with no new gaps: (1) line_key allocation — is `edit_seq` well-defined under duplicate Slack event delivery (the investigator's flagged residual risk: does edit-op idempotency need a Slack event-id guard, or does the accepted-op-position rule already dedupe)? (2) CAS + lease — any hole between lease expiry and takeover where two owners could both apply phase 2? (3) close marker — comment-before-transition ordering vs Linear API atomicity, testable as written? (4) any NEW mechanism this round that itself needs pinning (watch for patch-on-patch)?

