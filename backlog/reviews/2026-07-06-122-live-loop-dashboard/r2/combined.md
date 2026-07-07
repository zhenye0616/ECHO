---
item_id: 2026-07-06-122-live-loop-dashboard
round: 2
combined_at: '2026-07-07T01:55:12Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 3
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | Acceptance Criteria / AC2 (cold-start single-flight) | accepted — propagation completion | AC2 now defines the cold branch: a poll during the first in-flight computation JOINS that one shared computation (same timeout); on timeout/fail it gets the degraded/`unknown` contract-shaped doc — never undefined/500/stall. No second computation/child spawned. Warm case (last cached + `stale:true`) unchanged. |
| 2 | MEDIUM | codex | Acceptance Criteria / AC2 (heartbeat glob) | accepted — patched (original-spec text) | AC2(b) now iterates 120's exported expected worker names/`WorkerName` set (not a `worker-heartbeat-*.json` glob); an absent expected file surfaces as `{ error }` rather than a dropped key. AC5 pins it. |
| 3 | MEDIUM | codex-ops | AC2:63 (cold-start single-flight) | accepted — folded into #1 | Same cold-start single-flight gap; resolved by the AC2 cold-branch definition above. |

Reframe gate: **triggered** — rows 1 and 3 (2 findings) target the single-flight mechanism introduced in the r1 `spec-r1-patches` commit (cb7bb276); matches signal (b) (multiple reviewers converge on a bug in a mechanism that did not exist before the prior-round patch). Fresh-context investigator (`codex exec --sandbox read-only`) run before disposition; returned `kind: propagation_completion`. Validated: r1 codex-ops F6 explicitly scoped single-flight to "cold or expired" overlap and said "last cached ... when available" — the r1 patch collapsed that to unconditional last-cached and dropped the cold-start branch, so r2 completes an accepted load-bearing contract rather than exposing a removable mechanism. No removal language in the disposition → removal-proof matrix not applicable. Row 2 targets original AC2 heartbeat text, not the patch, so it did not contribute to the gate count.

## Convergence call

`needs R3 — focus_hints:` verify AC2 cold-start single-flight (two concurrent cold polls spawn exactly one computation, both get a contract-shaped response, timeout→degraded/`unknown`, never undefined/500/stall) and warm-case unchanged; AC2(b) heartbeats iterate 120's expected worker-name set with absent file → `{ error }` (no glob drop); AC5 covers both.

