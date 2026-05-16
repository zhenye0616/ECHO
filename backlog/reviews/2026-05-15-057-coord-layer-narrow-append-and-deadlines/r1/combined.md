---
item_id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
round: 1
combined_at: '2026-05-16T03:37:11Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: 2
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
| 1 | HIGH | codex | AC0 lines 111-117; tools/review-queue/request.py lines 114-119; skills/review-queue-watch.md lines 116-126 and 146 | accepted; AC0 trigger moved into watcher Step 3 (b) post-push hook; request.py only does best-effort coord_invoke after request.md write but the load-bearing invoke fires from the watcher; review-queue-watch.md added to files_to_modify | patched at r1 spec commit + r2 verifies |
| 2 | HIGH | codex | AC0 lines 113-114; AC2 lines 144-160; AC5 line 186; tools/review-queue/reviewers.json lines 5-23; tools/review-queue/_run_reviewer.sh lines 23 and 49-53 | accepted; AC2 coord-roles.json canonical naming = reviewer slug (codex/codex-ops/claude/cursor); headless + invoke_command required for headless roles; coord_invoke refuses IDE-mode entries with structured error | patched at r1 spec commit + r2 verifies |
| 3 | MEDIUM | codex | AC2 lines 159-160; tools/review-queue/schemas/reviewers-config.schema.json lines 1-3; tools/review-queue/_reviewers.py lines 92-108 | accepted; cross-field max>default validation moved from JSON Schema to Python loader at tools/review-queue/_coord_roles.py; bad-config rejection fixture added to tests/coord/coord-roles-validation.test.ts | patched at r1 spec commit + r2 verifies |
| 4 | MEDIUM | codex | AC5 lines 184-188; AC7 lines 207-211; src/mcp/server.ts lines 103-136 | accepted; V1 emission scoped to wrapper paths (curl-style HTTP with X-Echo-Role); Cursor IDE-mode emission deferred to V1.5+ along with native-MCP identity path; existing Cursor file-side review path preserved unchanged | patched at r1 spec commit + r2 verifies |
| 5 | MEDIUM | codex | AC3 lines 167-170; src/storage/interface.ts lines 50-62 | accepted; convergent with codex-ops F9 — idempotency key now sha256(correlation_id + role + event_type + deadline_missed); lookup via in-memory side-cache scan of recent coord:deadline_missed atoms over max-deadline horizon; metadata_match storage-filter extension deferred to V1.5+ | patched at r1 spec commit + r2 verifies |
| 6 | MEDIUM | codex | AC1 lines 135-139; AC4 lines 176-179; files_to_modify lines 24-38; src/mcp/util/fs-exclusion.ts lines 16-28; src/mcp/tools/wait-for-new-turns.ts lines 144-162; src/mcp/tools/search-memories.ts lines 232-239 | accepted; coord non-pollution lives in dedicated filter at search-memories.ts level (NOT the shared withFsExclusion helper) — wait_for_new_turns does NOT apply coord-default-exclude; three-way contract fixture added (tests/coord/non-pollution-three-way.test.ts) | patched at r1 spec commit + r2 verifies |
| 7 | HIGH | codex-ops | backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:113-122,167-169,207,219 | accepted (load-bearing — closes the exact failure mode 057 is built to catch); AC0 + AC3 add daemon-emitted coord:reviewer_invoked atom at spawn-time with pre-spawn deadline; opens deadline BEFORE wrapper has chance to die; tests/coord/pre-spawn-deadline-fires.test.ts is merge-blocking | patched at r1 spec commit + r2 verifies |
| 8 | HIGH | codex-ops | backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:114-117,207 | accepted; AC0 best-effort emission contract — short timeouts (2s connect / 5s total) + curl ... || true guard at wrapper-side; request.py coord_invoke failure non-fatal; tests/coord/daemon-down-tolerance.test.ts asserts queue survives | patched at r1 spec commit + r2 verifies |
| 9 | MEDIUM | codex-ops | backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:113-118,167-169,195-199 | accepted; convergent with codex F5 — same patch (idempotency key includes role + event_type); tests/coord/idempotency-per-role.test.ts covers two-reviewer-same-correlation_id miss | patched at r1 spec commit + r2 verifies |

## Convergence call

needs R2 — focus_hints: verify r1 9-fix set on the new spec sha; key load-bearing invariants: (a) AC0 active trigger fires from watcher post-push not request.py; pre-spawn deadline via daemon-emitted coord:reviewer_invoked atom; (b) best-effort emission contract (short timeouts + curl ... || true) preserves queue durability when daemon down; (c) coord-roles.json canonical naming = reviewer slug; headless required for coord_invoke targets; cursor IDE-mode entries refused by coord_invoke; (d) cross-field validation in Python loader; (e) V1 emission wrapper-scoped only (native-MCP Cursor emission deferred to V1.5+); (f) idempotency key per-role-per-event-type; (g) non-pollution three-way contract — search_memories() excludes coord; search_memories(source_prefix=coord:) returns coord; wait_for_new_turns(source_prefix=coord:) returns coord. Decay-curve note: this is a structural-reform spec; r1 produced 9 findings; expecting decreasing fan-out r2-r6 per 049 precedent.

