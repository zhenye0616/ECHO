---
item_id: 2026-05-25-073-onboarding-wizard
round: 2
combined_at: '2026-05-26T03:02:22Z'
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

Note: again findings 1+4, 2+5, 3+6 are logically convergent across codex / codex-ops; divergent classification is line-range artifact only. Three logical groups.

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:151,188-192,208; src/storage/interface.ts:12-15; src/mcp/util/source-app.ts:17-23; src/capture/extractors/codex.ts:801; src/capture/extractors/claude-code.ts:583; src/capture/extractors/cursor.ts:1342 | accepted — patched | r2 spec patch: AC1.3 rewritten to use `buildSourceAppMap()` from `src/mcp/util/source-app.ts` (canonical AgentKind→SourceApp→FS-prefix map) + `Storage.query({ source_prefix: ... })` matching. AC2.2 adds source classification via the same map for `sourceBreakdown` keyed by `SourceApp \| 'other'`. Added `signals.atomCountSaturated: boolean` to `DetectedAgentSignals` for the 50k bounded-scan path. AC8.1 cases 1 + 4 + 7 + 9 + 10 + AC8.2 use realistic FS-prefixed sources. spec_refs gains the source-app.ts + per-extractor refs as motivating evidence. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:39,153-165,469,478; src/daemon/index.ts:20-24; src/daemon/lifecycle.ts:18-22 | accepted — patched | r2 spec patch: AC1.3 "Production opener" gains a new "DB path resolution must mirror the daemon" subsection pinning the `ECHO_DB_PATH > ECHO_DATA_DIR > Application Support default` precedence. Builder is instructed to promote daemon-private `resolveDbPath()` to an exported `src/daemon/lifecycle.ts` helper (alongside `resolveDataDir`) and the wizard imports from there. AC8.1 case 10 (new) pins the `ECHO_DB_PATH` env-override path. spec_refs updated. |
| 3 | MEDIUM | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:355-359,508; backlog/claimed/2026-05-25-072-adapter-sync-engine.md:305,346-357,620 | accepted — patched | r2 spec patch: AC8.5 case 11 → 11a, with the lock-failure fixture corrected to 072 AC9 case 11's actual shape (`code: 'RETRY_CONFLICT'`, `file: '<tmp>/state/adapter-sync.lock'`, shell-quoted `rm` message). Cross-spec consistency note added: "if the fixture drifts from 072 AC9 case 11, this test fails" — deliberate guard. |
| 4 | HIGH | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:151; src/storage/interface.ts:12-17,104-110; src/mcp/util/source-app.ts:17-23 | accepted — patched (same as finding 1) | Same AC1.3 + AC2 patches cover codex-ops's HIGH on prefix matching. |
| 5 | MEDIUM | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:36-39,153-165; src/daemon/index.ts:19-25; src/daemon/lifecycle.ts:18-22 | accepted — patched (same as finding 2) | Same `resolveDbPath()` promotion + AC8.1 case 10 covers codex-ops's MED on env precedence. |
| 6 | MEDIUM | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:340-361; backlog/claimed/2026-05-25-072-adapter-sync-engine.md:286-288,346-361,364-379 | accepted — patched | r2 spec patch: AC5.7 expanded to short-circuit on ALL THREE 072 top-level no-dispatch sentinels (`syncLock || repoRoot || directorySymlink`). New AC8.5 cases 11b (repoRoot) + 11c (directorySymlink) added with fixtures mirroring 072 AC9 cases 22 + 30. AC5 DoD line updated to reference all three sentinels. |

## Convergence call

needs R3 — focus_hints: Verify (1) AC1.3 source-matching: `Storage.query({source_prefix: ...})` using `buildSourceAppMap()`, `signals.atomCountSaturated` flag, all three FS prefixes resolve correctly; (2) AC2.2 sourceBreakdown classification via the same map, keyed by `SourceApp \| 'other'`; (3) AC1.3 "DB path resolution must mirror the daemon" subsection — `resolveDbPath()` precedence + builder promotion step to `src/daemon/lifecycle.ts`; (4) AC5.7 covers `syncLock || repoRoot || directorySymlink` (all three top-level no-dispatch sentinels per 072 AC6 + AC6a); (5) AC8.5 cases 11a / 11b / 11c fixture shapes match 072 AC9 cases 11 / 22 / 30 byte-for-byte; (6) AC8.1 cases 1 + 4 + 7 + 9 + 10 use realistic FS-prefixed sources; (7) Tests-section + DoD test totals updated to 52 (10+6+6+4+13+8+5); (8) no regression elsewhere from terminology shift (Storage / source / timestamp / source_prefix).

