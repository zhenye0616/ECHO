---
item_id: 2026-07-13-135-local-echo-context-source-extraction
round: 17
combined_at: '2026-07-14T05:20:00Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 19fe3ae2e9e41ac01ee5695959c3834b18038d49
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: true
---

# Combined findings — FOUNDER DISPOSITION (loop paused after r17)

Dispositioned by founder authority with strategist support after 17 rounds.
Rationale record: `raw/internal/decisions/2026-07-13-extraction-specs-r17-founder-disposition.md`.

| # | Sev | Source | Where | Disposition | Rationale / patch |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC2/AC6 emit-source-inventory --git | patched | Tool refuses any --git not equal/resolving to literal /usr/local/bin/git before spawn. |
| 2 | HIGH | codex | AC6 parity rewrite policy | patched | Rewritten row binds source OID + target OID + deterministic byte diff + replay command; authored whole-blob replacement fails. |
| 3 | MED | codex | AC3 source parity install/launch | patched | Source-side install/launch bound to AC7 envelope (sanitized env, offline-after-cache-fill, deny-network); clock/random/ID injection hash-bound in provenance. |
| 4 | HIGH | codex | AC3/AC8 stdio/service output caps | rejected | Out of threat model: attended run of first-party code on synthetic fixtures; per-case timeouts already bound the harness. Flood-containment is process-containment infrastructure (AC1 exclusion). |
| 5 | HIGH | codex | AC7 cache/native lifecycle deadlines | rejected | Same class as #4: hangs are founder-visible in an attended build; "any command failure stops the attended build" already governs. |
| 6 | MED | codex | AC1/AC7 Git env allowlist | patched | env -i allowlist aligned with 133's launcher (GIT_DIR/WORK_TREE/COMMON_DIR/OBJECT_DIRECTORY/ALTERNATES/NAMESPACE/EXEC_PATH/CONFIG_COUNT rejected; local includes rejected; injected-env fixtures). |
| 7 | HIGH | codex | AC8 handoff state machine | patched | Rerun-AC1/AC8 recursion replaced with explicit read-only verification list; reviewer never mutates target; detached-worktree/lease/head_sha handoff specified. |
| 8 | HIGH | codex-ops | AC8 reviewer verification executability | patched | Same patch as #7. |
| 9 | HIGH | codex-ops | AC8 reviewer worktree/push | patched | Same patch as #7 (detached HEAD, two-path delta, explicit child OID, expected-old lease, no-retry stop with durable OIDs). |
| 10 | HIGH | codex-ops | AC3/AC8 MCP/service child I/O caps | rejected | Same class as #4. |
| 11 | HIGH | codex-ops | AC7 command deadlines/cleanup | rejected | Same class as #5. |
| 12 | HIGH | codex-ops | AC3 pinned-source install binding | patched | Same patch as #3. |
| 13 | MED | codex-ops | AC7 sandbox probes positive control | patched | Loopback control listener (accept-outside/deny-inside, both halves required). |
| 14 | MED | codex-ops | AC2 literal process-launch class | patched | repository_literal_process_launch added to the closed grammar; computed launches still fail. |
| 15 | MED | codex-ops | AC7 observation projection | patched | Projection normalizes clone-local paths to root tokens, excludes schema-enumerated volatile fields, native artifacts compared by content hash — one deterministic pass condition. |

Cross-spec additions (import-graph analysis, not reviewer-raised): roots extended 18->20 (src/guards.ts + tests/fixtures; counts 211/109/102 -> 217/110/107; inventory SHA e1fde9ae -> 8b028066, independently recomputed); escape-importer disposition policy (mcp coord/product tools, enrich product files, wizard->daemon); enrich double-claim clause vs item 133 (excluded-or-recorded-duplication, never silent).

## Convergence call

Founder disposition: patches applied at 19fe3ae2e9e41ac01ee5695959c3834b18038d49. Optional fenced r18 (verify patched zones only); otherwise CONVERGED by founder authority. No r19 under any outcome.
