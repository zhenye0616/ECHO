---
item_id: 2026-07-13-134-local-echo-loop-source-extraction
round: 17
combined_at: '2026-07-14T05:20:00Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 19fe3ae2e9e41ac01ee5695959c3834b18038d49
next_round: null
combined_verdict: divergent
escalated_to_founder: true
---

# Combined findings — FOUNDER DISPOSITION (loop paused after r17)

codex=pushback, codex-ops=proceed_after_patches — boundary crossed; founder dispositions directly.
Rationale record: `raw/internal/decisions/2026-07-13-extraction-specs-r17-founder-disposition.md`.

| # | Sev | Source | Where | Disposition | Rationale / patch |
|---|---|---|---|---|---|
| 1 | MED | codex | requested_reviewers / AC5 cross-vendor | rejected | Roster is a founder decision: cursor binding unavailable (r1 no_responses evidence). AC5's cross-vendor clause governs the extracted code's capability, not this review's roster. |
| 2 | MED | codex | AC2 source-policy sealing | patched | Policy sealed at blob dd9d78ab / sha256 44bef194; loaded by OID, builder-immutable, removed from files_to_modify. |
| 3 | MED | codex | AC5/AC8 reviewer push authorization + stale head_sha | patched | head_sha updated to full-40-char child OID in the review commit (two-path tree delta); feature-branch push explicitly needs no founder gate — founder checkpoints remain merge/main-push. |
| 4 | MED | codex | AC5 APPLYING->APPROVED transition | patched | Recovery edge added to the declared graph as guarded conditional SQLite CAS retaining the approval token, with fixture. |
| 5 | MED | codex | AC5 unnamed watcher project config | patched | Named provenance/watcher-project.v1.json; schema/normalization/transport/SHA-256 bound in migration record. |
| 6 | MED | codex | AC3 coord.ready publication | patched-minimal | Publication primitive specified: exclusive same-dir temp, file fsync, rename(2), directory fsync. |
| 7 | MED | codex | AC3 2,000ms budget | patched | Contract narrowed to initiation bound (no new op after expiry); no wall-clock return bound claimed; fake-clock tests assert scheduling. |
| 8 | MED | codex | AC7 locked-install argv | rejected | Builder latitude at DEV: offline flags + lock-authorized cache fill suffice; exact-argv ceremony is mechanism-deepening. |
| 9 | MED | codex | Out of Scope contradiction | patched | Prohibition scoped to exclude the three authorized operations (pinned source reads, target creation, AC8 push). |
| 10 | HIGH | codex-ops | AC5 transport child vs lease | patched | Process-group child, hard deadline < lease, TERM/KILL-reap before takeover, takeover requires termination evidence + re-probe. |
| 11 | MED | codex-ops | AC5 PREPARED candidate GC durability | patched | Internal ref refs/echo-watcher/prepared/<id> anchors candidate until terminal state; gc --prune=now fixture. |
| 12 | MED | codex-ops | AC5 post-push retry hot loop | patched | Durable failure class/attempt count/next-attempt; bounded backoff; repeated identical failures escalate. |

Cross-spec additions (import-graph analysis, not reviewer-raised): rewritten-lane rule for excluded-capability imports (tests/coord -> src/mcp/server, src/storage/memory; src/coord's own capture/logging/echo-home/storage imports); explicit better-sqlite3 rebuild row mirroring echo-context.

## Convergence call

Founder disposition: patches applied at 19fe3ae2e9e41ac01ee5695959c3834b18038d49; pushback finding #1 rejected on recorded roster rationale. Optional fenced r18 (verify patched zones only); otherwise CONVERGED by founder authority. No r19 under any outcome.
