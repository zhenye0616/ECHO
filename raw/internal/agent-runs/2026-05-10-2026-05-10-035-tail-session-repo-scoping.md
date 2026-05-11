---
item: 2026-05-10-035-tail-session-repo-scoping
agent: claude-code
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
worktree: /Users/zhenye/Desktop/Project_echo--tail-session-repo-scoping
branch: agent/tail-session-repo-scoping
head_sha: 51fdf45b83274833cced73a5bb811ce8ef620a70
started_at: 2026-05-11T06:05:00Z
finished_at: 2026-05-11T06:17:00Z
---

# Run 1 (2026-05-10 23:05–23:17 PDT, fresh claim)

## What I implemented

Item 035 — `tail_session` repo-scoping for Cursor (M1-1 sub-gap C). Read-side
only; no changes to capture extractors.

- **AC1 — `repo_path` parameter on `tail_session`**:
  - Added `repo_path?: string` to both `TailSessionParams` and the Zod input
    schema (with description string per item 025 wire-shape discipline).
  - Added `composer_resolved?: string` to both `TailSessionResult` and the
    Zod output schema.
  - Extended `TAIL_SESSION_DESCRIPTION` with one new sentence covering
    the parameter semantics.
  - Param validation gates in the `tailSession()` handler:
    - `repo_path` + `source` → throws `repo_path is incompatible with exact source`
    - `repo_path` without `source_app` → throws `repo_path requires source_app=cursor`
    - `repo_path` not absolute → throws `repo_path must be absolute`
  - The wire-level handler catches messages starting with `tail_session: `
    and surfaces them via the existing `isError` envelope (same pattern as
    `CursorDecodeError`).
  - `tools/mcp-integration-smoke.sh` gained a one-line assertion that
    `tools/list` payload contains `repo_path` (tolerates SSE-escaped form).
- **AC2 — `resolveCursorComposerForRepoPath`**:
  - New file `src/mcp/cursor-workspace-resolver.ts` (~290 lines).
  - Three-step resolution: (1) scan `workspaceStorage/<hash>/workspace.json`
    for a folder URL that decodes (via Node `fileURLToPath`) to the
    normalised repo path — `file://` prefix validated, non-`file:` shapes
    skipped silently; multi-match tiebreak on workspace `state.vscdb`
    mtime then lexical hash. (2) open the matched workspace's `state.vscdb`
    read-only and read `ItemTable.composer.composerData.allComposers[]`.
    (3) open the GLOBAL `state.vscdb` and query `cursorDiskKV` for
    `composerData:<id>` rows; pick the composer with max `lastUpdatedAt`
    (fallback `createdAt`). Returns `{workspace_id, composer_id} | null`.
  - `globalDbPath` and `workspaceStorageDir` injected as default-arg
    parameters for test isolation; defaults exported as
    `DEFAULT_CURSOR_GLOBAL_DB_PATH` / `DEFAULT_CURSOR_WORKSPACE_STORAGE_DIR`.
  - All disk failures (unreadable workspace.json, malformed JSON, missing
    state.vscdb, missing ItemTable / cursorDiskKV) are `log.warn`-ed and
    returned as null — never throw.
- **AC3 — `QueryFilter.metadata_match`**:
  - Added the field + `METADATA_MATCH_KEY_WHITELIST` constant
    (`workspace_id`, `composer_id`, `session_id`) to `src/storage/interface.ts`.
  - SQLite implementation: `json_extract(metadata, '$.<key>') = @<bind>`
    per entry, sorted-key iteration for deterministic SQL text, all values
    bound via named placeholders. Whitelist enforced at function entry.
    The existing prepared-statement cache is keyed on the full SQL text,
    which is bounded by 7 non-empty subsets given 3 whitelisted keys —
    documented inline.
  - MemoryStorage implementation: parity with SQLite — same whitelist
    enforcement, same `{}` no-op semantics, in-memory walk of each
    candidate atom's metadata.
- **AC4 — `tail_session` workspace-scoped resolution path**:
  - When `source_app === 'cursor' && repo_path !== undefined`, the handler
    calls the AC2 resolver via an `injections.resolveCursorComposer` seam
    (defaults to live resolver, tests substitute a mock). Null result
    returns empty turns + advisory warning per spec. Otherwise resolves
    the cursor source via existing `resolveNewestSourceForApp` and tails
    via a new `tailExactSource` overload that accepts `metadata_match`.
    Result includes `composer_resolved`. Pagination uses the existing
    composite cursor unchanged — the `metadata_match` filter is added to
    the same query that constructs the cursor.
  - Non-cursor `source_app` + `repo_path` → warning + ignore (returned
    in result.warnings[]).
- **AC5 — Tests (18 new cases)**:
  - `tests/mcp/cursor-workspace-resolver.test.ts` (NEW) — 8 cases:
    max-lastUpdatedAt pick, no-match→null, URL-decoded percent-encoded
    paths, non-`file:` skip, malformed-JSON / no-folder skip, empty
    allComposers→null, createdAt fallback, trailing-slash normalisation.
    Fixtures use real `better-sqlite3` temp databases (faithful to
    production semantics).
  - `tests/storage/metadata-match.test.ts` (NEW) — 5 cases × 2 adapters
    via `describe.each([MemoryStorage, SqliteStorage])` (10 cases total).
    Single-key match, multi-key AND, whitelist-rejection throw, empty `{}`
    no-op parity with omitted, absent-key skip.
  - Extended `tests/mcp/tools/tail-session.test.ts` (+9 cases):
    repo_path scoping happy path (with mock resolver), counter-test (no
    repo_path → wrong-project composer wins), resolver→null warning,
    non-cursor source_app warn-ignore, three parameter-validation cases
    (no source_app, with source, relative path), wire-level isError
    surface, plus a tools/list description assertion.

## Files modified (in worktree on `agent/tail-session-repo-scoping`)

| File | Change | Lines |
|---|---|---|
| `src/mcp/cursor-workspace-resolver.ts` | new | +292 |
| `src/mcp/tools/tail-session.ts` | modified | +148 -39 |
| `src/storage/interface.ts` | modified | +24 -1 |
| `src/storage/memory.ts` | modified | +39 -1 |
| `src/storage/sqlite.ts` | modified | +43 -2 |
| `tests/mcp/cursor-workspace-resolver.test.ts` | new | +266 |
| `tests/mcp/tools/tail-session.test.ts` | modified | +252 -23 |
| `tests/storage/metadata-match.test.ts` | new | +135 |
| `tools/mcp-integration-smoke.sh` | modified | +12 -0 |

**Head SHA pushed:** `51fdf45b83274833cced73a5bb811ce8ef620a70`
**Branch:** `agent/tail-session-repo-scoping` (pushed to `origin`)

## Decisions made during implementation

1. **New file for the resolver.** The AC2 spec said "a new file if it grows
   past ~80 lines"; the helper landed at ~290 lines (helpers + injection
   defaults + JSDoc). Moved to `src/mcp/cursor-workspace-resolver.ts` so
   `tail-session.ts` stays focused on the MCP toolkit logic.
2. **Injection seam in `tailSession()`.** Spec didn't mandate a specific
   injection shape but tests need to mock the resolver. Added an
   `injections: TailSessionInjections = {}` 4th argument with a single
   optional field `resolveCursorComposer`. The Zod handler doesn't forward
   anything to it (real call path uses live resolver); only unit tests
   substitute. Avoids module-level mock-fs setup, which is fragile.
3. **Wire-level isError surfacing.** The handler now catches
   `Error` instances whose message starts with `tail_session: ` and turns
   them into isError envelopes — same pattern as `CursorDecodeError`.
   Keeps unit-level tests (call `tailSession()` directly, expect a thrown
   Error) and wire-level tests (call via the MCP client, expect isError)
   both ergonomic.
4. **Prepared-statement cache.** Documented the choice inline (key the
   cache on the full SQL text — bounded by the small whitelist, so cache
   size stays small).
5. **createdAt fallback in resolver.** Added test coverage for the case
   where `lastUpdatedAt` is missing — matches the R1 hedge.
6. **Bare-workspace tiebreak.** Workspaces with no `state.vscdb` are still
   match candidates (treated as mtime=0). If they're the only match the
   resolver returns null on the next step (no composers); if a real
   workspace also matches, the real one wins on mtime.

## Acceptance criteria status

| AC | Status |
|---|---|
| AC1 — repo_path parameter on tail_session | ✅ passing |
| AC2 — resolveCursorComposerForRepoPath helper | ✅ passing |
| AC3 — QueryFilter.metadata_match dual-adapter | ✅ passing |
| AC4 — tail_session workspace-scoped resolution | ✅ passing |
| AC5 — Test coverage (≥9 new cases; landed 18) | ✅ passing |
| AC6 — Dogfooding verification (post-merge) | ⏭️ deferred to founder/strategist after merge + daemon kick — not buildable from agent context |

## Test results (verbatim)

```
> echo-daemon@0.0.0 test
> vitest run

 Test Files  43 passed | 1 skipped (44)
      Tests  679 passed | 21 skipped (700)
   Start at  23:15:05
   Duration  15.94s

> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0

(no errors)

> echo-daemon@0.0.0 typecheck
> tsc --noEmit

(no errors)
```

Affected-slice run (used during iteration):
```
✓ tests/storage/memory.test.ts (22 tests)
✓ tests/storage/migrate.test.ts (6 tests)
✓ tests/storage/metadata-match.test.ts (10 tests)
✓ tests/storage/get-by-ids.test.ts (12 tests)
✓ tests/mcp/cursor-workspace-resolver.test.ts (8 tests)
✓ tests/storage/sqlite.test.ts (29 tests)
✓ tests/mcp/tools/tail-session.test.ts (38 tests)

Test Files  7 passed (7)
     Tests  125 passed (125)
```

## Open questions for founder / reviewer

None. Spec was fully unambiguous after the R1 patch; the architecture
change (composer_id-first via Cursor's own storage, no dependence on
optional `metadata.workspace_id`) made implementation straightforward.

## Drift events caught

None. No "while I'm in here" temptations fired — the spec's eight
explicit "Out of Scope" rules covered every adjacent area (find_clusters
extension, new MCP tool, capture-layer changes, other source_apps,
caller-identity, cross-platform paths, caching, multi-repo). The 035
diff is read-side only; `src/capture/extractors/cursor.ts` is untouched.

## What previous-attempt state was kept vs discarded

N/A — fresh claim, no prior run state.
