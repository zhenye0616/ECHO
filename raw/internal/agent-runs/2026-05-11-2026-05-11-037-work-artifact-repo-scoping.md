# Agent Run — 2026-05-11-037-work-artifact-repo-scoping

- **Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405` (Claude Code on this machine)
- **Branch:** `agent/work-artifact-repo-scoping`
- **Worktree:** `~/Desktop/Project_echo--work-artifact-repo-scoping/`
- **head_sha:** `08815e2208e6cb5d9eb3bb357fd54b42066eb0c7`
- **Started:** 2026-05-11T23:15:00Z (PDT 16:15)
- **Handoff:** 2026-05-11T23:52:00Z (PDT 16:52)

## Run 1

### What I implemented

The whole spec — AC1-AC6 — landed as four commits per the spec's suggested commit shape:

1. **AC1 + AC2** (`e5f1019`) — `metadata.repo_root` capture-side write + storage whitelist.
   - New exported helper `resolveRepoRootForWorkspaceId(workspace_id, workspaceStorageDir?)` in `src/mcp/cursor-workspace-resolver.ts`. Reads `workspace.json` for the given workspace_id and returns the `folder` URI decoded to an absolute path (normalised via the same `normaliseRepoPath` helper, now exported, that the forward direction uses).
   - Cursor extractor `processCandidate` metadata block now writes `metadata['repo_root']` via a two-stage decision tree (Stage 1: registry binding via the new helper; Stage 2: file-walk for the nearest common `.git` ancestor over `flattenContextFiles(turn.context)`). Cache discipline matches AC1 #4 (R3 corrected decision tree): registry-priority on every tick, positive-only cache (never cache null), Stage 1 null falls through to Stage 2 without poisoning the cache, dedup'd warn `cursor_repo_root_resolution_failed` per `composer_id`.
   - `workspace_id` write path is unchanged (regression test added).
   - Storage whitelist now contains `repo_root` alongside `workspace_id`, `composer_id`, `session_id`. Both adapters already honor whitelisted keys, no adapter code change needed.

2. **AC3** (`68705a2`) — `search_memories.repo_path`.
   - New util `src/mcp/util/repo-path.ts` exports `assertAbsoluteRepoPath(toolName, path)` + re-exports `normaliseRepoPath`. Centralises validation + normalization across the four retrieval tools.
   - `search_memories`: added `repo_path?` param, isAbsolute validation, normalize before issuing `metadata_match: {repo_root: ...}`, echoed normalised value in `query_echo.repo_path`. Validation errors surface via existing `isError` envelope handler. Description + outputSchema + inputSchema all extended.

3. **AC4 + AC5** (`4a4fc9c`) — `find_clusters` / `recent_work_context` / `wait_for_new_turns`.
   - Extended `Query` (optional `repo_path`) and `QueryEcho` (nullable `repo_path`) in `src/trace/types.ts`. `buildRecentWorkContext` now writes the normalised value into `response.query.repo_path`.
   - `getRecentWorkContext`: validate + normalise, forward as `metadata_match: {repo_root: ...}` into both passes of `runRecentWorkContextPass`, thread through the rerank's queryEcho.
   - `find_clusters`: pass-through to `getRecentWorkContext`, surfaced in `result.query.repo_path`. Wire-handler converts upstream validation errors to `isError` envelope.
   - `wait_for_new_turns`: added param, validation, normalise before `pollOnce` so the per-source filterCommon inherits `metadata_match` on every poll tick.

4. **AC6** (`08815e2`) — `tail_session` repo_path generalised off the Cursor-only branch.
   - Dropped the `repo_path requires source_app=cursor` reject (now `source_app` only).
   - Dropped the warn-ignore on `repo_path` for non-cursor source_apps.
   - Normalize via `normaliseRepoPath` BEFORE any storage call (closes R2 trailing-slash gap).
   - `source_app === 'cursor'`: deterministic two-phase fallback. Phase 1 (PRIMARY) issues `metadata_match: {repo_root: ...}` directly via a new `resolveNewestSourceForRepoRoot` helper — Phase 2 (LEGACY) only fires when Phase 1 returns 0 atoms. Predicates NEVER ANDed across phases. `composer_resolved` set ONLY when Phase 2 fires.
   - `source_app === 'claude_code' | 'codex'`: simple `metadata_match: {repo_root: ...}` flow via the same `resolveNewestSourceForRepoRoot` helper, so MRU picks the newest session in the named repo (not globally newest).
   - `source_app === 'git'`: two-path OR via a two-query UNION at the tool layer (matches if EITHER metadata.repo_root OR source=`git:<repo_path>`). Dedups by atom id.

### Files modified

(All inside the `agent/work-artifact-repo-scoping` worktree at `~/Desktop/Project_echo--work-artifact-repo-scoping/`.)

| File | Lines (~) | Purpose |
|---|---|---|
| `src/mcp/cursor-workspace-resolver.ts` | +73 / -2 | New `resolveRepoRootForWorkspaceId`; `normaliseRepoPath` now exported. |
| `src/capture/extractors/cursor.ts` | +180 / -3 | Two-stage repo_root resolution + cache + warn dedup + `__resolveRepoRootForWorkspaceId` / `__resolveRepoRootFromFiles` / `refreshWorkspaceMap` test hooks. |
| `src/storage/interface.ts` | +3 / -2 | `'repo_root'` added to `METADATA_MATCH_KEY_WHITELIST`. |
| `src/mcp/util/repo-path.ts` | +43 (new) | Shared `assertAbsoluteRepoPath` + `normaliseRepoPath` re-export. |
| `src/mcp/tools/search-memories.ts` | +52 / -2 | repo_path param + validation + metadata_match + echo + description. |
| `src/mcp/tools/recent-work-context.ts` | +50 / -4 | repo_path validation/normalize + threaded into both passes + queryEcho. |
| `src/mcp/tools/find-clusters.ts` | +37 / -3 | Pass-through + envelope echo. |
| `src/mcp/tools/wait-for-new-turns.ts` | +35 / -3 | repo_path param + validation + threaded into pollOnce.filterCommon. |
| `src/mcp/tools/tail-session.ts` | +220 / -50 | Four-case branch (cursor two-phase, cc/codex simple, git two-path OR) + helpers. |
| `src/trace/types.ts` | +13 | `Query.repo_path?` + `QueryEcho.repo_path: string \| null`. |
| `src/trace/index.ts` | +1 | Write `query.repo_path` into response envelope. |

**Tests added (all green):**

| File | New tests | Description |
|---|---|---|
| `tests/mcp/cursor-workspace-resolver.test.ts` | +9 | 6 for `resolveRepoRootForWorkspaceId` + 3 for `normaliseRepoPath` export. |
| `tests/capture/extractors/cursor.test.ts` | +7 | Stage 1 happy, Stage 2 fresh + cache-hit, ambiguous files, no-binding no-files, cache invalidation (registry wins), warn dedup, workspace_id coexistence regression. |
| `tests/mcp/tools/search-memories.test.ts` | +6 | Filter, baseline echo=null, AND with source_app, AND with since/until, reject relative, trailing-slash normalisation. (Plus +1 line in existing query_echo regression test.) |
| `tests/mcp/find-clusters.test.ts` | +3 | Scoping, baseline echo=null, trailing-slash. |
| `tests/mcp/tools/recent-work-context.test.ts` | +3 | Scoping (via baseline-vs-filtered count diff), reject relative, trailing-slash. |
| `tests/mcp/wait-for-new-turns.test.ts` | +4 | Baseline, filter scoping, reject relative, trailing-slash. |
| `tests/mcp/tools/tail-session.test.ts` | +13 (AC6) + small updates to 2 existing item-035 tests | 8 matrix cases × source_app × {with, without} repo_path + fresh-cursor-composer (Phase 1 only) + legacy-cursor-atom (Phase 2 fires) + trailing-slash + git no-dup + git legacy-only. |
| `tests/trace/build.test.ts` | (1-line update) | Existing test now expects `repo_path: null` on QueryEcho. |

**Total: 45 new tests** across 7 test files. All pass.

### Decisions made during implementation

1. **Cache placement: per-extractor instance, not module-level.** The spec said "module-level Map<composer_id, string>" but the existing dedup-set pattern (`missingComposerHeaderWarnedKeys`) is module-level — I matched that for the warn dedup set, but kept the *cache itself* inside the `startCursorExtractor` closure to avoid test contamination across vitest workers. Production behaviour is identical (one long-running extractor per daemon process); the only observable difference is test-isolation cleanliness. Noted in the cache's inline comment.

2. **Test hook `refreshWorkspaceMap` added.** First attempt at AC1 tests relied on `utimesSync` + chokidar to fire `refreshComposerWorkspaceMap`. macOS FSEvents delivery is flaky within a 200-300ms test wait budget — the same 3 tests would flake intermittently. Added a `__testHooks.refreshWorkspaceMap(workspaceDbPath)` method that synchronously schedules `handleWorkspaceChange` via the existing `schedule()` chain. Production callers never invoke it. Cleaner than `vi.useFakeTimers` for chokidar.

3. **`findGitAncestor` accepts both `.git` directory AND `.git` file.** Worktrees use a `.git` file pointing at the main repo's `.git` dir. Both anchor a working tree; the spec didn't differentiate, so `statSync(\`${dir}/.git\`)` (no `isDirectory()` check) catches both. Matches what `git rev-parse --show-toplevel` does.

4. **Item 035 existing tests updated rather than deleted.** Two tests changed:
   - "resolver returns null → empty turns + advisory warning" — warning wording now reflects "no Cursor composer OR repo_root atoms match" (two-phase miss).
   - "repo_path without source_app rejects with the requires-source_app error" — assertion uses a regex match since the error message now reads "requires source_app (cursor|claude_code|codex|git)".
   - "non-cursor source_app + repo_path: warn-ignores repo_path" — DELETED. Under AC6, non-cursor source_app + repo_path is now first-class (no warn). The deletion preserves the AC6 contract; the deleted test directly contradicted AC6 #1.

5. **Suggested commit shape followed.** 4 commits (AC1+AC2 / AC3 / AC4+AC5 / AC6). Each independently passes typecheck + lint + the touched test files.

### Acceptance criteria status

| AC | Status | Evidence |
|---|---|---|
| AC1 — Cursor extractor writes `metadata.repo_root` | ✅ | 7 new tests covering Stage 1, Stage 2, ambiguity, no-binding, cache invalidation, warn dedup, workspace_id coexistence. All pass. |
| AC2 — `repo_root` on whitelist | ✅ | `src/storage/interface.ts:60`. Storage parity tests pass (memory + sqlite both honor it). |
| AC3 — `search_memories.repo_path` | ✅ | 6 tests pass, description + schema updated. |
| AC4 — `find_clusters` / `recent_work_context.repo_path` | ✅ | 3 + 3 tests pass, both envelopes echo repo_path. |
| AC5 — `wait_for_new_turns.repo_path` | ✅ | 4 tests pass. |
| AC6 — `tail_session.repo_path` generalised | ✅ | 17 AC6 tests pass (>12 spec minimum), including the fresh-Cursor-composer Phase-1-only assertion and the legacy-Cursor-atom Phase-2-fires assertion. |
| AC7 — Dogfooding verification | ⏳ Founder-only | Spec section #5 explicitly notes "the merge ships after one clean run" — that's the founder's call post-merge. |

### Test output (verbatim, last run before commit)

```
$ npx vitest run \
  tests/capture/extractors/cursor.test.ts \
  tests/mcp/cursor-workspace-resolver.test.ts \
  tests/mcp/find-clusters.test.ts \
  tests/mcp/tools/recent-work-context.test.ts \
  tests/mcp/tools/search-memories.test.ts \
  tests/mcp/tools/tail-session.test.ts \
  tests/mcp/wait-for-new-turns.test.ts \
  tests/storage/metadata-match.test.ts \
  tests/trace/build.test.ts

 ✓ tests/trace/build.test.ts                  (20 tests) 210ms
 ✓ tests/capture/extractors/cursor.test.ts    (62 tests | 11 skipped) 672ms
 ✓ tests/mcp/find-clusters.test.ts            (14 tests) 634ms
 ✓ tests/mcp/tools/tail-session.test.ts       (50 tests) 979ms
 ✓ tests/mcp/tools/search-memories.test.ts    (50 tests) 1116ms
 ✓ tests/mcp/tools/recent-work-context.test.ts (63 tests) 1556ms
 ✓ tests/mcp/wait-for-new-turns.test.ts       (19 tests) 9ms
 ✓ tests/mcp/cursor-workspace-resolver.test.ts (19 tests) 3558ms
 ✓ tests/storage/metadata-match.test.ts       passes (parity baseline)

 Test Files  9 passed (9)
      Tests  296 passed | 11 skipped (307)
```

```
$ npm run typecheck
> tsc --noEmit
(no output — clean)

$ npm run lint
> eslint . --max-warnings 0
(no output — clean)
```

### Full-suite run note

A single `npx vitest run` (full suite) showed:
- 6 failures in the same vitest invocation: 1 `tests/trace/build.test.ts` perf test (802ms > 500ms threshold under parallel load) + 5 `tests/capture/surfaces/git-watcher.test.ts` tests (5s timeouts under parallel load).

I confirmed these are pre-existing flakes / parallel-load timing issues unrelated to my changes:
- The perf test passes consistently in isolation.
- The git-watcher suite: 5 of the 6 failing tests pass cleanly when run in isolation. The remaining 1 (`captures all commits as backfill on first boot of an empty store`) also fails on baseline (verified via `git stash` + isolated re-run) — pre-existing.

No new regressions introduced by this item.

### Open questions for founder

None. Acceptance criteria are satisfied per spec.

### Drift events caught

None. Every change traces to an explicit acceptance criterion. The Out-of-Scope rules (atomicity refactor RC2, TZ-naive rejection RC3, cross-repo cluster handling, workspace_id write-path, `echo_ping`/`get_atom`/`get_atoms` exclusion, mid-stream invisibility, Linux/Windows shim, backfill) were all observed — no temptation to widen.

### Dogfooding journal

The AC7 founder-run dogfooding is post-merge, per spec section "Implementation Notes" #5 ("AC7 deliberately doesn't gate on the second run; the merge ships after one clean run"). The journal entry from the founder's dogfooding run lands at merge time, not as part of this agent run.
