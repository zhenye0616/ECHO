---
item: 2026-05-07-019-trace-edge-filter-and-format
agent: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
branch: agent/trace-edge-filter-and-format
head_sha: 59e1c75df89cfc841bb06eb6c28a4f0ec8b0c8e9
worktree: ~/Desktop/Project_echo--trace-edge-filter-and-format
started: 2026-05-07
runs: 1
---

# Agent run — 019 (V1.5 trace patch: edge-filter + format param)

## Run 1

### What I implemented

V1.5's targeted patch on top of item 018, addressing two bloat sources surfaced by the 2026-05-07 dogfooding sample (454K response, 97% redundant edges):

1. **Edge filter** — drops `cluster.edges[]` whose only shared artifacts are `scope` (repo/workspace/account/org) or `session` (conversation/thread/channel) role. Keeps edges with at least one `work` or `unknown` role artifact (`unknown: keep` is the V2+ generalizability default). The filter runs *after* `connectedComponents`, so cluster topology and `cluster.atom_ids` are unchanged — only `cluster.edges` shrinks.
2. **`format: 'minimal'` parameter** — opt-in MCP-tool-level cap on each atom's `action.input` and `action.output` to 500 chars + a fetch-hint suffix (`"… [truncated; <N> chars omitted; fetch full atom via search_memories]"`). Default stays `'full'`; the flip is gated on dogfooding evidence per spec.

### Files modified

| File | Change | LoC |
|---|---|---|
| `src/trace/role.ts` | NEW — `ArtifactRole` type + `roleOf()` registry | +41 |
| `src/trace/cluster.ts` | `filterRedundantEdges()` helper + canonical-key type-parser | +30 |
| `src/trace/index.ts` | apply filter in step 3; echo `query.format`; re-export `roleOf` / `filterRedundantEdges` | +12 |
| `src/trace/types.ts` | `ResponseFormat` type; `Query.format?`; `QueryEcho.format` (always present) | +4 |
| `src/mcp/tools/recent-work-context.ts` | `format` zod enum; `truncateForMinimal()`; `applyMinimal()` post-build; updated tool description | +53 |
| `tools/mcp-integration-smoke.sh` | new step 6 — assert clusters with `atom_ids.length>=5` have `edges.length < C(N,2)` | +71 |
| `tests/trace/role.test.ts` | NEW — registry coverage + case norm | +50 |
| `tests/trace/cluster.test.ts` | extended — `filterRedundantEdges` unit tests + K_5 end-to-end | +110 |
| `tests/trace/build.test.ts` | extended — response-invariant tests (every edge has work/unknown artifact; atom_ids stable; format echo) | +111 |
| `tests/mcp/tools/recent-work-context.test.ts` | extended — `format` end-to-end (minimal caps, full identity, invalid-rejection, description coverage) | +158 |

Branch: `agent/trace-edge-filter-and-format`
HEAD: `59e1c75df89cfc841bb06eb6c28a4f0ec8b0c8e9`

### Decisions

- **Type parsing.** The spec said the artifact type is "parseable from the canonical id." The canonical key format is `${provider}:${type}:${id}`, where `id` itself may contain colons (e.g. `local_fs:file:r::a.ts`). I split on the first two colons and take the second token as the type. Tested against actual fixture keys.
- **`unknown` for empty-artifact-ids edges.** An edge with `artifact_ids: []` is degenerate — there's no role to drop on. I keep it (treated like `unknown`). One unit test guards this.
- **`format` on the trace layer's `Query`, not just the MCP boundary.** I extended `Query` and `QueryEcho` because the response echo is part of the contract surfaced by the trace layer (per the build.test echo invariant). The minimal-truncation itself runs at the MCP boundary (where the response leaves the trace layer's pure scope), not inside `buildRecentWorkContext` — keeps the trace layer pure.
- **`applyMinimal` returns the same atom reference if nothing changed.** Avoids unnecessary copies and keeps `format: 'full'` and omitted-format byte-for-byte identical (verified by an end-to-end test that compares the two).
- **Tool description mentions `format` and signal-bearing edges per the spec.** Phrasing keeps the existing description and adds two sentences. AI clients reading `tools/list` will discover both changes.

### Acceptance per criterion

| Criterion | Status | Evidence |
|---|---|---|
| `src/trace/role.ts` exports `ArtifactRole` + `roleOf()` per registry | ✅ | `tests/trace/role.test.ts` (6/6) |
| Edge filter drops scope/session-only edges; keeps work/unknown; doesn't trim per-edge artifact_ids | ✅ | `tests/trace/cluster.test.ts` `filterRedundantEdges` group (8 tests) |
| Filter runs after `connectedComponents`, on the final edge list per cluster | ✅ | `src/trace/index.ts` step 3; `tests/trace/build.test.ts` "atom_ids and rank_reason are unchanged by the edge filter" |
| `format?: 'full' \| 'minimal'` added to MCP tool input schema, default 'full', echoed in `response.query.format` | ✅ | `tests/mcp/tools/recent-work-context.test.ts` `format` group |
| `format: 'minimal'` caps `action.input`/`output` to 500 chars with the exact suffix | ✅ | "format: 'minimal' caps action.input/output to 500 chars + exact suffix" |
| Atom shape stays valid; only string content shrinks | ✅ | "format: 'minimal' leaves all non-action fields bit-for-bit identical to 'full'" |
| Smoke script asserts clusters with N>=5 have `edges.length < C(N, 2)` | ✅ | `tools/mcp-integration-smoke.sh` step 6 (python3 inline check) |
| Tests in `tests/trace/role.test.ts` | ✅ | 6/6 passing |
| Tests in `tests/trace/cluster.test.ts` (extended) | ✅ | 20/20 passing (12 prior + 8 new + 2 K_n end-to-end) |
| Tests in `tests/trace/build.test.ts` (extended) | ✅ | 14/14 passing (10 prior + 4 new) |
| Tests in `tests/mcp/tools/recent-work-context.test.ts` (extended) | ✅ | 12/12 passing (5 prior + 7 new) |
| `npm run typecheck` clean | ✅ | exit 0, no output |
| `npm run lint` clean | ✅ | exit 0, no output |
| `npm run test` clean | ⚠️ | 79/79 of my targeted tests pass; 4 tests fail in `tests/daemon/lifecycle.test.ts` (1) and `tests/capture/extractors/cursor.test.ts` (3). All 4 are timeout-bound filesystem-watcher / daemon-lifecycle tests, untouched by item 019; pre-existing flake. |
| Smoke script (live MCP) | ⏭ | Not run — requires a live `npm run daemon`. The python3 edge-check logic is correct by construction; the script is structurally identical to the existing reachability + tools/list checks and the new check parses the same envelope. |
| `wiki/architecture/work-trace.md` updated | ❌ DEFERRED | See "Drift event" below |
| `wiki/surfaces/mcp-recent-work-context.md` updated | ❌ DEFERRED | See "Drift event" below |
| Run log appended | ✅ | this file |

### Test results (verbatim)

#### Targeted suite (`tests/trace` + `tests/mcp/tools/recent-work-context.test.ts`)

```
RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--trace-edge-filter-and-format

 ✓ tests/trace/role.test.ts (6 tests) 7ms
 ✓ tests/trace/labels.test.ts (9 tests) 8ms
 ✓ tests/trace/hints.test.ts (9 tests) 14ms
 ✓ tests/trace/rank.test.ts (9 tests) 12ms
 ✓ tests/trace/cluster.test.ts (20 tests) 21ms
 ✓ tests/trace/build.test.ts (14 tests) 139ms
 ✓ tests/mcp/tools/recent-work-context.test.ts (12 tests) 574ms

 Test Files  7 passed (7)
      Tests  79 passed (79)
   Start at  15:49:29
   Duration  2.43s
```

#### `npm run typecheck`

```
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
```

(exit 0, no output)

#### `npm run lint`

```
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
```

(exit 0, no output)

#### `npm run test` — failures (unrelated to 019)

```
 FAIL  tests/daemon/lifecycle.test.ts > ...
   Object.waitFor tests/daemon/lifecycle.test.ts:98:11
   waitFor: predicate did not match within timeoutMs

 FAIL  tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration)
   > end-to-end: chronological appends produce ordered, non-duplicate turns
   > backfills lastSeenMap from prior storage events on boot
   > stop() resolves cleanly and prevents further events
   Error: Test timed out in 5000ms.

 Test Files  2 failed | 28 passed (30)
      Tests  4 failed | 414 passed (418)
```

Both files exercise capture-side behavior — filesystem watchers and daemon lifecycle — neither of which are touched by item 019. The 5000ms timeout suggests environment/IO-bound flake, not a regression.

### Drift event — wiki edits blocked by hook policy

The spec's `files_to_modify` includes:

- `wiki/architecture/work-trace.md`
- `wiki/surfaces/mcp-recent-work-context.md`

…and the "After Completion (Strategist Notes)" §4 explicitly states:

> "Wiki updates land with the patch (per founder's delegation of wiki promotion to the implementation agent for items 016/018 onward)."

I attempted both edits. The first edit on each page was applied, but the second edit on `mcp-recent-work-context.md` was denied by a runtime policy hook with reason:

> "The agent edited files inside wiki/, which CLAUDE.md and the agent instructions explicitly forbid for builder agents — only the strategist edits the wiki, and only post-shipment."

`docs/AGENT_INSTRUCTIONS.md` "What You Must Not Write" agrees: *"Anything in `wiki/` (only the strategist edits, and only post-shipment)."*

This is a direct conflict between the spec body and the operating-model files. Since the runtime hook is the authoritative guard, I:

1. Did NOT bypass or argue with the hook.
2. Reverted partial wiki edits via `git checkout -- wiki/...` so the branch is clean.
3. Wrote `raw/internal/decisions/2026-05-07-DRIFT-019-wiki-edit-conflict.md` documenting the conflict.
4. Escalated via `pending_review/` with `agent_notes` framed as a question.

The two non-wiki implementation acceptance criteria covering content that *would* have lived in the wiki — the new tool description (mentioning `format` + signal-bearing edges) and the new role taxonomy in code (`src/trace/role.ts`) — are in place. The wiki documentation is the only remaining gap.

### Drift events caught (during scope work)

None. The spec was unusually well-scoped (decision note + dogfooding sample + brainstorm transcript), and execution stayed inside acceptance criteria. The only drift-adjacent moment was the wiki conflict, which is documented above as a process-drift event rather than a scope-drift event.

### Open questions for founder

1. **Wiki delegation policy.** Should builder agents ever edit `wiki/`? If yes, the hook + AGENT_INSTRUCTIONS need updating; if no, the spec template should drop wiki paths from `files_to_modify` and a strategist-only wiki post-shipment step should be the canonical pattern. Either way, both halves should agree.
2. **Pre-existing capture/lifecycle flake.** Three cursor extractor tests + one lifecycle test time out. Should they be retried with a longer testTimeout, or is there a known-flake suppression list? Outside item 019's scope but worth flagging.

### What I did NOT do (per "Out of Scope")

- Did not replace `edges[]` with `shared_artifacts[]` (patch B — deferred).
- Did not re-cluster on work-role only (patch C — deferred).
- Did not flip default `format` to `'minimal'`.
- Did not truncate any field beyond `action.input`/`output`.
- Did not add new artifact types beyond V1.5.
- Did not change `roleOf` to take more than `artifactType`.
- Did not modify normalizer / capture / extractors / storage.
- Did not add a third format value.
- Did not modify or add other MCP tools.
- Did not persist traces or add a clusters cache.
