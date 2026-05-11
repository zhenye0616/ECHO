---
id: 2026-05-10-035-tail-session-repo-scoping
title: `tail_session` repo-scoping for Cursor — workspace-aware MRU resolution (M1-1 sub-gap C)
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-10
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-11T06:05:00Z"
branch: "agent/tail-session-repo-scoping"
worktree: "/Users/zhenye/Desktop/Project_echo--tail-session-repo-scoping"
head_sha: "51fdf45b83274833cced73a5bb811ce8ef620a70"
pr_url: ""
agent_notes: |
  Implemented AC1-AC5 of item 035 read-side-only per the R1-patched spec.
  - AC1: `tail_session` now accepts `repo_path?: string` (Zod input + output
    `composer_resolved?: string`); description string extended; three
    validation gates throw plain `tail_session: …` errors that the wire
    handler surfaces via isError (same pattern as CursorDecodeError).
    Smoke script asserts the tools/list description mentions `repo_path`.
  - AC2: new `src/mcp/cursor-workspace-resolver.ts` derives a single
    `composer_id` from Cursor's own workspaceStorage + globalStorage —
    eliminates the R1-found dependency on best-effort `metadata.workspace_id`.
    Node `fileURLToPath` for percent-decode; non-`file:` shapes skipped.
  - AC3: `QueryFilter.metadata_match` lives in BOTH SqliteStorage (json_extract
    + prepared-statement cache keyed on SQL text, documented inline) and
    MemoryStorage with the same `[workspace_id, composer_id, session_id]`
    whitelist enforced at the storage seam. Empty `{}` is a no-op in both.
  - AC4: cursor + repo_path path resolves via AC2, tails the cursor `.vscdb`
    with `metadata_match: {composer_id}`, returns `composer_resolved`.
    Pagination unchanged (composite cursor; metadata_match adds to the same
    query). Non-cursor source_app + repo_path warn-ignores.
  - AC5: 18 new tests — 8 resolver, 10 dual-adapter parity via `describe.each`,
    9 tail_session unit/integration + 1 wire-level isError. Full suite:
    679 pass / 21 skipped. Lint + typecheck clean.

  AC6 dogfooding verification is the post-merge founder/strategist step —
  not buildable from this run.

  Branch `agent/tail-session-repo-scoping` pushed; head_sha 51fdf45.
review_notes: |
  Merged 2026-05-11 via founder reconciliation. Reviewer (Claude code-reviewer
  subagent) verdict: merge as-is. Sidecar at
  backlog/pending_review/<id>.review.md (consumed in this merge).

  Conflicts resolved: none — clean three-way merge. Branch base fc52f22 was
  pre-034; main was post-034 (6743d2b). 034's modified files
  (src/capture/extractors/cursor.ts, tests/capture/extractors/cursor.test.ts,
  tests/fixtures/cursor-globalstorage.ts) did not intersect this branch's
  set, so no code conflicts arose.

  Fixups applied: none (verdict was merge as-is; reviewer surfaced 0
  pre-merge fixups).

  Fixups deferred to follow-up items: none.

  Verify: 698/698 tests pass (21 pre-existing skips, 1 file skipped); lint
  and typecheck clean post-merge. Test count above worktree's 679 reflects
  034's tests now visible after the three-way merge.

  Follow-up items (non-blocking, filed in backlog/_followups.md):
  - AC6 dogfooding verification (post-merge founder/strategist; two
    consecutive successful runs on different days close M1-1 sub-gap C).
  - Wiki promotion pass per the After-Completion section: surfaces/
    mcp-tail-session.md, operating-model/cross-tool-spec-review.md,
    backlog/_followups.md resolved subsection.
  - Plan item 031 deprecation-removal strategist conversation ~1 week
    after 035 dogfooding lands.
  - Linux/Windows path-resolver shim when a non-macOS contributor needs it
    (per Out-of-Scope rule 6).
  - Resolver-caching audit after AC6 dogfooding produces real timing data
    (spec expectation: < 10ms; confirm before adding cache).
  - Tighten "no cursor atoms" warning at src/mcp/tools/tail-session.ts:242
    when resolver succeeds but storage is empty for that composer.
spec_refs:
  - src/mcp/tools/tail-session.ts                # Where the resolver currently picks the wrong composer for Cursor
  - src/capture/extractors/cursor.ts             # composer_id metadata is reliably populated (workspace_id is best-effort only — see R1 Finding 1)
  - src/storage/interface.ts                     # QueryFilter — extended with metadata_match for the storage-level equality filter
  - src/storage/sqlite.ts                        # SQL implementation; exclude_metadata_surface precedent for json_extract-based filtering
  - src/storage/memory.ts                        # MemoryStorage — must implement metadata_match in parity with SQLite (R1 Finding from both reviewers)
  - tests/mcp/tools/tail-session.test.ts         # Existing tail_session tests (extend)
  - 2026-05-10-034-cursor-capture-coverage       # Sibling M1-1 item (sub-gaps A+B); 035 closes sub-gap C — refer by ID only; the file's directory (ready/ → claimed/ → complete/) changes as 034 progresses
  - raw/internal/dogfooding/mcp-interactions-journal.md  # 4 in-the-moment hits today (16:08 / 22:11 / 22:25 / 22:45 PDT) showing M1-1 sub-gap C firing live during 034's own review cycles
suggested_builder: any  # Pure MCP-resolver + storage work; not Cursor-domain specific. Either Cursor's Claude or another agent works.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
---

# Context

`tail_session(source_app='cursor')` is structurally broken for cross-tool spec review because **all Cursor composers share a single SQLite file** at `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`. The current resolver in `src/mcp/tools/tail-session.ts` picks the source by "newest atom under this prefix" — which always resolves to the same `.vscdb` path regardless of which composer the calling project actually wants. The subsequent tail then returns the newest atoms from across **all** composers in that file, so a project the user touched in another Cursor window 10 minutes ago outranks the project the user is actively reviewing.

This is **M1-1 sub-gap C** — distinct from sub-gaps A (cadence) and B (tool-call parsing) that item 034 closes at the capture layer. Sub-gap C is purely consumer-side: the data is already captured correctly (per item 029's diagnosis correction and 034's AC1+AC2), and the cursor extractor already populates `metadata.workspace_id` and `metadata.composer_id` on each emitted atom (per `src/capture/extractors/cursor.ts` `refreshComposerWorkspaceMap` + the `composer_id`/`workspace_id` writes in `handleGlobalChange`). The fix is to plumb a workspace filter through the MCP resolver so calls can specify "the Cursor composer for THIS project."

**Evidence base — 4 in-the-moment dogfooding hits today, all on cross-tool spec review:**

- Journal 2026-05-10 16:08 PDT: Cursor Claude's session tail returned `isr-demo-mohsen` (unrelated project) instead of the active Project_echo composer.
- Journal 2026-05-10 22:11 PDT: Strategist's `tail_session(source_app='cursor')` for item 034 R1 resolved to the same wrong project; recovery required direct SQLite probe.
- Journal 2026-05-10 22:25 PDT: Same gap fired on the corrective re-check; recovery required the workspace-hash-to-composer-id chain (grep `workspace.json` → `composerData WHERE lastUpdatedAt > cutoff` → bubble probe). **This is the chain item 035 must make unnecessary.**
- Journal 2026-05-10 22:45 PDT: Same gap fired AGAIN on item 034's R2 review; same SQLite recovery chain required.

The cross-tool spec-review pattern (`wiki/operating-model/cross-tool-spec-review.md`) is now structurally dependent on the SQLite-probe workaround for the Cursor side of every review cycle. That workaround is non-trivial to keep running, leaks Cursor implementation detail into strategist workflow, and silently degrades when ECHO is supposed to be the unified surface. **Item 035 is the smallest fix that closes this gap end-to-end at the MCP boundary.**

# Goal

`tail_session(source_app='cursor', repo_path='/Users/<user>/Desktop/Project_echo')` returns the most-recent turns from the active Cursor composer in that project — NOT the global-MRU composer across all Cursor windows. Demo bar: strategist or any AI client running cross-tool review for Project_echo can call `tail_session(source_app='cursor', repo_path='<repo_root>')` and get the right composer's tail without knowing the workspace hash, composer ID, or composer's `lastUpdatedAt` timestamp.

The fix is read-side only. No changes to the cursor extractor, no changes to capture cadence, no changes to bubble-parse semantics. The metadata 035 reads (`workspace_id`, `composer_id`) is **already populated** by the existing extractor; 035 just plumbs a filter through the MCP resolver and the storage layer.

# In Scope (Acceptance Criteria)

### AC1 — `tail_session` accepts `repo_path` parameter

`src/mcp/tools/tail-session.ts` adds a new optional parameter:

```ts
repo_path?: string;  // Absolute filesystem path to a repo root (e.g., '/Users/.../Project_echo')
```

Behavior:

- When `repo_path` is set AND `source_app === 'cursor'`: enter the workspace-resolved path (AC2-AC4 below).
- When `repo_path` is set AND `source_app !== 'cursor'`: ignore `repo_path` with a `warnings[]` entry: `'tail_session: repo_path is currently honored only for source_app=cursor; ignored for <app>'`. Other apps (claude_code / codex / git) already encode the repo in their source path; no resolver work is needed. Future items may extend repo_path semantics to other apps if a concrete need surfaces.
- When `repo_path` is set AND `source` is set (R1 Finding 3 from Codex / R1 Medium #1 from Cursor — both reviewers caught this): **reject** with `'tail_session: repo_path is incompatible with exact source; use source_app=cursor + repo_path, or omit repo_path'`. The existing "at most one of source/source_app" check stays; this rejection is additive. Reject (not warn-ignore) — combining "exact .vscdb path" with "repo disambiguation" has no coherent meaning.
- When `repo_path` is set AND neither `source` nor `source_app` is set: reject with an explicit error (`'tail_session: repo_path requires source_app=cursor'`). Don't silently fan out to "search all cursor composers in this repo" — the no-args + repo_path combination is ambiguous and not load-bearing for the M1-1 demo.
- When `repo_path` is unset: 100% backwards-compatible with today's behavior.
- The parameter accepts an absolute path only. Relative paths reject with `'tail_session: repo_path must be absolute'`. Trailing slash normalized away (the resolver match is path-equality after `path.normalize`).

Description string for the tool (added to `TAIL_SESSION_DESCRIPTION`): one sentence after the existing `source_app` paragraph — `'For source_app=cursor, optionally pass repo_path=<absolute repo root> to scope the tail to the Cursor composer active in that project. Without repo_path, the MRU resolution returns the most-recently-active Cursor composer globally (which is often a different project than the caller intends).'`

**Zod input + output schema extension (R1 Low #4 from Cursor — per item 025 MCP wire-shape discipline):**

- Input Zod schema: add `repo_path: z.string().optional()` to the existing `TailSessionParamsSchema`. Description string mirrors the prose above.
- Output Zod schema: add `composer_resolved: z.string().optional()` to the existing `TailSessionResultSchema`. Populated only on the cursor + repo_path path. Document in the field's description.
- `outputSchema` exposed via `tools/list` reflects both additions automatically once the schemas are updated; smoke (`tools/mcp-integration-smoke.sh`) gains a one-line assertion that the description string contains `repo_path` (protects against accidental description regression).

### AC2 — Server-side workspace + composer resolver (R1 architecture change — Codex HIGH #1)

**R1 architecture change:** the V1 spec relied on `metadata.workspace_id` to find the composer in ECHO storage. Codex R1 caught that `composerToWorkspace` (the source of `workspace_id` metadata in the extractor) starts empty at extractor start and is only populated by chokidar workspace-DB change events — atoms captured before that map is populated have NO `metadata.workspace_id`, so a `workspace_id` filter would silently drop them. The R1 patch removes the dependence on captured `workspace_id` metadata entirely; instead, the resolver reads Cursor's own workspace storage to derive a single authoritative `composer_id`, then filters ECHO atoms by `composer_id` (which **is** reliably populated by the extractor on every emitted atom — see `src/capture/extractors/cursor.ts` line 576).

Add a single resolver helper (suggested name `resolveCursorComposerForRepoPath`; the implementer may split into smaller helpers as needed). Lives in `src/mcp/tools/tail-session.ts` or a new `src/mcp/cursor-workspace-resolver.ts` if it grows past ~80 lines.

```ts
async function resolveCursorComposerForRepoPath(
  repoPath: string,
  globalDbPath: string,  // injected for testability — matches the extractor pattern
  workspaceStorageDir: string,  // injected for testability
): Promise<{ workspace_id: string; composer_id: string } | null>;
```

Implementation:

1. **Normalize `repoPath`** via `path.normalize` + strip trailing `/`.
2. **Scan `workspaceStorageDir`** (default `~/Library/Application Support/Cursor/User/workspaceStorage/`). For each `<hash>/workspace.json`:
   - Skip if absent / unreadable / non-JSON (`log.warn` with the path; never throw).
   - Parse the `folder` field. **Validate it starts with `file://`** — if not (e.g., remote workspaces, `vscode-remote://`, multi-root workspaces with no single folder), **skip the row** (R1 Finding 2 from Cursor). No comparison against raw non-`file:` shapes.
   - Decode the URL via Node `fileURLToPath` (handles percent-encoding correctly per R1 Finding 5 from Codex / R1 Medium #2 from Cursor — e.g., `/Users/.../My%20Project` ↔ `/Users/.../My Project`). Manual `slice(7)` would mis-handle this.
   - If the decoded folder matches normalized `repoPath`, this is the workspace.
3. If no workspace matches → return `null`.
4. **Resolve the most-recent composer in that workspace.** Open the workspace's `state.vscdb` read-only, read `ItemTable WHERE key = 'composer.composerData'`, parse JSON, extract `allComposers[]` (each entry has at minimum a `composerId` string; this matches the existing pattern in `refreshComposerWorkspaceMap`). Build the list of `composer_id`s.
5. **Pick the most-recently-active composer.** Open the GLOBAL `state.vscdb` (the constant `globalDbPath`), query `cursorDiskKV` for rows where `key IN ('composerData:<id1>', 'composerData:<id2>', ...)` (parameterized — never string-interpolated). For each returned row, parse the JSON `value` and read `lastUpdatedAt` (number, millis since epoch; fallback to `createdAt` if `lastUpdatedAt` is missing — same shape as the strategist's 2026-05-10 22:20 PDT SQLite probe documented in the journal). Pick the composer with max `lastUpdatedAt`.
6. Return `{workspace_id, composer_id}` of the picked composer.

If the workspace exists but no composers are listed in `allComposers[]` (rare — empty workspace) → return `null`.

If multiple workspaces match the same `repoPath` (rare anomaly) → pick the workspace whose `state.vscdb` has the highest `mtime` (most-recently-touched workspace wins). Lexically-first tiebreak if mtimes tie.

The Cursor `globalStorage/state.vscdb` and `workspaceStorage/` paths are hardcoded for macOS. Cross-platform (Linux: `~/.config/Cursor/User/`, Windows: `%APPDATA%/Cursor/User/`) is **out of scope** — file an extension item if a non-macOS contributor reaches this gap.

### AC3 — `QueryFilter.metadata_match` storage extension (BOTH adapters)

Extend `QueryFilter` in `src/storage/interface.ts` with an optional positive-equality metadata filter, and implement it in **both** `src/storage/sqlite.ts` AND `src/storage/memory.ts` (R1 Finding 4 from Codex / R1 Medium #3 from Cursor — both reviewers caught the parity requirement; AC5's in-memory fixtures must exercise the same semantics as production SQLite):

```ts
// Restrict results to rows whose JSON metadata matches the given key→value pairs
// using string equality (each entry implies an AND clause). Mirrors the existing
// exclude_metadata_surface pattern (which is set-membership on a single key);
// this is general key/value equality across N keys. Used by tail_session's
// repo_path filter to restrict cursor atoms to a specific composer_id (035's
// only consumer in V1). Each entry value is matched with string equality.
metadata_match?: Record<string, string>;
```

**SQLite implementation in `src/storage/sqlite.ts`:**

- For each `(key, value)` pair, emit `AND json_extract(metadata, '$.<key>') = ?`.
- Use prepared-statement binding (no string interpolation of either keys or values).
- **Key whitelist:** to prevent caller-supplied keys from probing arbitrary metadata fields, restrict to a known-safe set: `['workspace_id', 'composer_id', 'session_id']`. Any other key in the input rejects the query at the storage seam with a clear error. Whitelist enforced in the storage adapter, NOT the MCP tool — defense in depth.
- **Prepared-statement cache (R1 Low #5 from Cursor):** if the SQLite adapter uses a prepared-statement cache keyed by SQL text, the dynamic `metadata_match` clause changes the SQL text per call shape (different key sets → different SQL). Either include the sorted-keys signature in the cache key OR generate prepared statements on demand without caching the metadata_match variants. Implementer's call — document the choice in a one-line code comment so a future reader knows whether to expect cache misses on varied call shapes.

**MemoryStorage implementation in `src/storage/memory.ts`:**

- Filter `events` in memory by walking each event's `metadata` object and checking every required key/value match.
- Same whitelist enforcement at the entry of the function (throw before iterating).
- Same `{}` no-op semantics.

Empty `metadata_match: {}` is a no-op (no filter applied; equivalent to omitted parameter) in both adapters.

This is a **generic** filter that other tools may use in the future. Item 035's only consumer is `tail_session`'s repo-scoping path.

### AC4 — `tail_session` workspace-scoped resolution path (R1 simplified — no `metadata.workspace_id` dependency)

Inside `tail_session`, when `source_app === 'cursor' && repo_path !== undefined`:

1. Call `resolveCursorComposerForRepoPath(repo_path)` (AC2). If `null`, return `{turns: [], next_cursor: null, source_resolved: null, warnings: ['tail_session: no Cursor composer matches repo_path=<path>; verify the project is open in Cursor and the workspace has at least one composer']}`.
2. Tail the resolved composer: `tailExactSource(storage, source='fs:/Users/.../globalStorage/state.vscdb', count, before)` with an additional `metadata_match: {composer_id: resolved.composer_id}` filter passed through. (Refactor `tailExactSource` to optionally accept and pass through `metadata_match`.)
3. **Pagination consistency (R1 Low #6 from Cursor):** the existing `before` / `emitCursor` rules continue to apply unchanged — the `metadata_match` filter is added to the same query that constructs the pagination cursor. Repo-filtered tails paginate exactly like non-repo-filtered tails; the cursor encodes `(timestamp, id)` regardless of metadata filters.
4. Return the result with `source_resolved` populated as the `.vscdb` path AND a new optional field `composer_resolved: <composer_id>` so the caller can verify the right composer was picked.

The `source_app_resolved` field stays as `'cursor'`. No changes to other source_app paths.

**Why this is simpler than the V1 design:** V1 (pre-R1) had a 4-step resolver chain that included an ECHO query filtered by `metadata.workspace_id`. R1 (Codex HIGH #1) showed `metadata.workspace_id` is best-effort only — it may be absent on atoms captured before the extractor's workspace-watch map was populated. The new design queries Cursor's own storage to derive the composer_id directly, then only relies on `metadata.composer_id` (which the extractor populates on every emitted atom — line 576 of `src/capture/extractors/cursor.ts`).

### AC5 — Test coverage

- **Unit test (workspace + composer resolver):** mock-fs fixture with three `workspaceStorage/<hash>/workspace.json` files, two pointing at unrelated repos and one pointing at `/tmp/test-repo` (URL-encoded as `file:///tmp/test-repo`). Mock workspace state.vscdb for the matching hash with `composer.composerData = {allComposers: [{composerId: 'C1'}, {composerId: 'C2'}]}`. Mock global state.vscdb with `composerData:C1` (`lastUpdatedAt: 100`) and `composerData:C2` (`lastUpdatedAt: 200`). Assert `resolveCursorComposerForRepoPath('/tmp/test-repo', ...)` returns `{workspace_id: <hash>, composer_id: 'C2'}` (max lastUpdatedAt wins). Counter-tests:
  - `resolveCursorComposerForRepoPath('/tmp/no-such-repo', ...)` returns `null`.
  - URL-decoding test: workspace.json `folder: 'file:///tmp/My%20Project'` matches `repoPath='/tmp/My Project'` (R1 Findings on URL handling).
  - Non-`file:` workspace.json `folder: 'vscode-remote://...'` is skipped (no match).
  - workspace.json malformed JSON or missing `folder` field — skip gracefully, log warn, don't crash.
  - Workspace exists but `allComposers[]` is empty — returns `null`.
- **Unit test (QueryFilter.metadata_match) — RUN AGAINST BOTH SQLiteStorage AND MemoryStorage:** storage-layer test with three atoms: A (composer_id='COMP-1'), B (composer_id='COMP-2'), C (composer_id='COMP-1', session_id='S-X'). Assert `query({metadata_match: {composer_id: 'COMP-1'}})` returns A+C in newest-first order; `query({metadata_match: {composer_id: 'COMP-1', session_id: 'S-X'}})` returns only C. Whitelist-rejection test: `query({metadata_match: {arbitrary_field: 'X'}})` throws a clear error at storage seam. Use a parameterised test loop (`describe.each`) so the same fixtures run against both adapter implementations — protects against drift.
- **Integration test (tail_session repo-scoped):** seed BOTH the mock-fs workspaceStorage AND the mock global state.vscdb consistent with two workspaces:
  - workspace `WS-PROJECT-ECHO` (folder `file:///tmp/project-echo`): composers `A` (3 atoms in storage, lastUpdatedAt: 500) and `B` (1 atom, lastUpdatedAt: 200).
  - workspace `WS-OTHER` (folder `file:///tmp/other`): composer `C` (2 atoms, lastUpdatedAt: 800 — newest globally).
  
  Call `tail_session(source_app='cursor', repo_path='/tmp/project-echo', count=5)`. Assert returned turns are all from composer A (newest-first, count=3), `source_resolved=<vscdb-path>`, `composer_resolved='A'`, `source_app_resolved='cursor'`. Counter-test: same setup, no `repo_path` — assert returned turns include the wrong-project composer C's most-recent atom at position 0 (proves the gap is present without 035 and absent with it).
- **Unit test (parameter validation):** `tail_session(source_app='claude_code', repo_path='/tmp/repo')` returns a warning + ignores repo_path. `tail_session(repo_path='/tmp/repo')` (no source_app, no source) rejects with the documented error. `tail_session(source='fs:/some/path', repo_path='/tmp/repo')` rejects with the "incompatible with exact source" error (R1 Finding 3 from Codex / R1 Medium #1 from Cursor). `tail_session(source_app='cursor', repo_path='relative/path')` rejects with the absolute-path error.

Total expected test additions: 9-12 new test cases (the dual-adapter parity adds ~3 vs the V1 spec's 6-9 count).

### AC6 — Dogfooding verification (post-merge, founder/strategist)

After merge + daemon kickstart, the strategist or founder runs the failing reproduction from today and logs to `raw/internal/dogfooding/mcp-interactions-journal.md` per the 6-field template:

1. Verify Cursor is open with an active Project_echo composer AND another project (e.g., `isr-demo-mohsen`) with a more-recently-touched composer.
2. Call `mcp__echo__tail_session(source_app='cursor', repo_path='/Users/<user>/Desktop/Project_echo', count=5)`.
3. Expected: turns from the Project_echo composer (NOT from the other project). `composer_resolved` in the response.
4. Counter-call (sanity): `mcp__echo__tail_session(source_app='cursor', count=5)` (no `repo_path`). Expected: turns from the other-project composer (matches today's broken behavior; proves 035 didn't accidentally change the no-args path).

Two consecutive successful dogfooding runs (different days, different cross-project juxtapositions) close M1-1 sub-gap C. If either fails, agent stops and files a follow-up — does not silently re-tune.

# Out of Scope (Don't Drift)

- **Do NOT extend `find_clusters` or `search_memories` with `repo_path`.** The R1/R2 dogfooding evidence pinpoints `tail_session` as the load-bearing resolver. If a future cross-tool review uses `find_clusters(repo_path=)` patterns at scale, that's a separate item. Today's demo bar is the `tail_session` chain.
- **Do NOT add a new MCP tool (e.g., `cursor_sessions_for_workspace`).** The 22:25 PDT conjecture entry floated this; the parameter-extension approach is smaller, fits the existing toolkit decomposition, and meets the demo bar.
- **Do NOT touch `src/capture/extractors/cursor.ts`.** Item 034 owns capture-layer fixes. Item 035 reads what 034 (and 029) already captured; the workspace_id and composer_id metadata fields are existing extractor output.
- **Do NOT extend `repo_path` semantics to `claude_code` / `codex` / `git`.** Their source paths already encode the project — claude_code uses `~/.claude/projects/<encoded-project>/<session>.jsonl`, codex uses dated rollout JSONLs whose `metadata.cwd` field encodes the repo, git uses the repo path as the source. None need a separate resolver. If a concrete cross-app demo bar surfaces later (e.g., "I want my last 10 turns across cursor + claude_code in this project"), that's a separate strategist conversation.
- **Do NOT introduce caller-session-identity.** The MCP request shape stays caller-agnostic; `repo_path` is an explicit parameter, not a deduced one. True caller identity is V2+ territory.
- **Do NOT add cross-platform path resolution.** `workspaceStorage` is read from `~/Library/Application Support/Cursor/User/workspaceStorage/` (macOS only). Linux + Windows paths are out of scope; file an extension item when a non-macOS contributor needs it.
- **Do NOT add a workspace_id-to-repo-path reverse cache.** Each tool call does the disk scan fresh. The scan is cheap (≤ ~50 workspace.json files, each ≤ a few KB). If a cache becomes necessary based on profiling, that's a separate perf item.
- **Do NOT introduce repo-globbing or multi-repo queries** (e.g., `repo_paths: string[]`). Single repo per call; the M1-1 demo is one project at a time.

# Implementation Notes

- The new `metadata_match` filter is a generic storage primitive but is initially used by exactly one consumer (`tail_session`'s repo-scoping path). The key whitelist is the defense-in-depth: even if a future MCP tool exposes `metadata_match` to callers, only the three named fields (`workspace_id`, `composer_id`, `session_id`) are reachable. Adding new whitelist entries is a deliberate decision, not an oversight.
- `resolveCursorWorkspaceFromRepoPath` should NOT cache results across calls (per Out of Scope rule). A single call reads at most ~50 small files; benchmark expectation is < 10 ms total even on a cold disk.
- The cursor extractor's existing `workspace_id` metadata write happens in `handleGlobalChange` via the `composerToWorkspace` map — see `refreshComposerWorkspaceMap` for the population path. **Note: not every captured atom will have `metadata.workspace_id` set** — it's optional, populated only when the composer-to-workspace map was hit at capture time. If the dogfooding verification shows < 90 % of Project_echo cursor atoms have workspace_id, file a follow-up against the cursor extractor's workspace-mapping initialization order; 035 doesn't claim to fix that.
- The composer_id filter at AC4 step 4 is essential because the resolved `source_resolved` is still the shared `.vscdb` path. Without the composer_id filter, the tail would return atoms from across all composers in the workspace (rare but possible — most workspaces have one active composer, some have multiple).
- Description string changes go in `TAIL_SESSION_DESCRIPTION` at the existing constant in `tail-session.ts`. One additional sentence; do NOT rewrite the whole description.
- `tools/mcp-integration-smoke.sh` should add an assertion that `tail_session`'s tool description mentions `repo_path` — protects against accidental description regression.
- Test isolation: the unit test for `resolveCursorWorkspaceFromRepoPath` should mock the workspaceStorage directory via a `WORKSPACE_STORAGE_DIR` env var or a constructor injection (mirror the existing `globalDbPath` injection pattern in the extractor). Do NOT call `os.homedir()` directly in a way that's untestable.
- The integration test in AC5 needs an in-memory or temp-dir storage adapter that supports `metadata_match` queries; use the existing test storage harness pattern.

# After Completion (Strategist Notes)

**Wiki promotion pass after item lands in `complete/`:**

1. `wiki/surfaces/mcp-tail-session.md` — add a "Repo-scoped Cursor resolution" subsection documenting the `repo_path` parameter, the resolver chain, and when to use it (cross-tool spec review pattern).
2. `wiki/architecture/system-architecture.md` — minor update if MCP toolkit section enumerates per-tool params (likely doesn't; capture-layer fix below the diagram's resolution).
3. `wiki/operating-model/cross-tool-spec-review.md` — replace the "SQLite-probe-with-workspace-hash recovery chain (R1/R2 2026-05-10 entries)" workaround text with a one-liner pointing at `tail_session(source_app='cursor', repo_path=...)` as the now-canonical path.
4. `backlog/_followups.md` — move "M1-1 sub-gap C" tracking from informal journal references to a "Resolved (V1.6 wave — items 030 + 032 + 033 + 034 + 035)" subsection with this item's merge SHA + AC6 dogfooding entry timestamp.
5. **Strategic re-evaluation:** with M1-1 sub-gaps A+B+C all closed (034 + 035 shipped), the M1-1 friction is empirically done. The item 031 deprecation-removal gate has both dimensions un-blocked (recovery via `get_atom` works AND atoms exist via 034+035). Plan the 031 strategist conversation for ~1 week post-035 dogfooding.

**M1-2 unblocked for strategist conversation:** the only remaining M1/M2 friction is M1-2 (semantic ranking, "saved till the end"). With M1-1 done, the substrate is finally ready to evaluate ranking against. Don't open it before the AC6 dogfooding confirms 035 works; M1-2 is design-heavy and benefits from a clean baseline.

# Cross-tool review checklist (pre-claim)

- [x] **Gate 1 — Diff vs precedent.** Compared against 030 (atomic toolkit decomposition — `tail_session` extended in-place per the pattern), 032 (explicit-over-implicit parameter additions — `repo_path` is opt-in, no-args path unchanged), 034 (capture-layer counterpart in M1-1 — 035 stays read-side only). The `metadata_match` storage extension mirrors the existing `exclude_metadata_surface` shape; post-R1, the Zod schema discipline mirrors item 025's wire-shape standards.
- [x] **Gate 2 — Out-of-scope drift.** Eight "do NOT" rules covering find_clusters/search_memories extensions, new tools, capture-layer changes, other source_apps, caller-identity, cross-platform paths, caching, multi-repo queries.
- [x] **Gate 3 — Falsifiable ACs.** Post-R1: AC5 has 5 falsifiable test families. AC6 has a counter-test that proves the gap is present without 035 (sanity check against accidental no-op). The new dual-adapter parity test (SQLite + MemoryStorage via `describe.each`) protects against the V1-design risk where AC4 silently behaved differently on in-memory vs prod storage. AC2 step 4-5 separation makes "workspace resolves but no composers exist" and "composers exist but lastUpdatedAt-pick fails" testable independently.
- [x] **Gate 4 — Cross-reference consistency.** All references use symbol names (no line numbers). M1-1 sub-gap C taxonomy lines up with the 2026-05-10 dogfooding journal entries (16:08 / 22:11 / 22:25 / 22:45 PDT). Sibling items 034 (M1-1 A+B), 029 (cursor capture diagnosis correction), 031 (deprecation gate) referenced by ID only (not directory path — per R1 Finding 2 from Codex, paths drift as items move through `ready/ → claimed/ → complete/`).

# Review history

## R1 — 2026-05-10 22:46 PDT (Codex) + 22:47 PDT (Cursor, recovered via SQLite probe AGAIN) — patched 2026-05-10 23:00 PDT by strategist

**Recovery shape:** Same M1-1 sub-gap A + C firing for the THIRD consecutive review cycle. Codex's R1 turn was captured-but-elided (atom `9d70156d-...`, `bytes_elided: 1562`), recovered via `get_atom` (5441 bytes envelope, `atom_size_bytes: 5441`). Cursor's R1 (4497 chars in bubble `bdb29bcb-...`) was NOT captured by ECHO at all — recovered via the same SQLite-probe chain (rowid > 134191 from R2 of 034). **This is the SIXTH time today the very gap 035 fixes bit during 035's own review** (or its sibling 034's). The dogfooding loop is now structurally unmissable.

**R1 findings + dispositions (8 unique, 3 convergent):**

| # | Reviewer | Severity | Finding | Disposition in R1 patch |
|---|---|---|---|---|
| 1 | Codex | **HIGH** | **AC4's V1 design relied on `metadata.workspace_id`, but the extractor's `composerToWorkspace` map starts empty and is only populated by chokidar workspace-DB events.** Bubbles captured before the map populates have no `workspace_id`, so a workspace_id filter would silently drop them. | **Fixed (architecture change).** AC2 + AC4 rewritten to derive `composer_id` directly from Cursor's own storage (workspace `state.vscdb` `allComposers[]` + global `state.vscdb` `composerData:<id>.lastUpdatedAt` → pick max). Atoms are filtered by `metadata.composer_id`, which the extractor reliably populates on every emitted atom (line 576 of `src/capture/extractors/cursor.ts`). The dependence on best-effort `workspace_id` is eliminated. |
| 2 | Codex | Medium | `spec_refs` pointed at `backlog/ready/2026-05-10-034-cursor-capture-coverage.md`, but 034 already moved to `backlog/claimed/`. Future moves to `complete/` would break the ref again. | **Fixed.** `spec_refs` now references 034 by **ID only** (no directory path); a builder following the spec can `find backlog -name '<id>*.md'` to locate it regardless of pipeline state. |
| 3 | Codex | Medium | `source + repo_path` combination was undefined — schema only rejected `source + source_app`. | **Fixed.** AC1 adds explicit rejection: "tail_session: repo_path is incompatible with exact source". AC5 parameter-validation test covers it. |
| 4 | Codex (Med #4) + Cursor (Med #3) | Medium | **`metadata_match` storage filter must live on the `Storage` contract, not just SQLite.** `MemoryStorage` exists at `src/storage/memory.ts` and AC5's in-memory fixtures will silently diverge from production unless both adapters implement the same semantics. | **Fixed.** AC3 split into SQLite + MemoryStorage sections, both must implement `metadata_match` + the key whitelist. AC5 test uses `describe.each` to run the same fixtures against both adapters — drift protection. |
| 5 | Codex (Low #5) + Cursor (Med #2) | Medium | `file://` prefix stripping was specified as manual `slice(7)`, but percent-encoded paths (e.g., `My%20Project`) would fail. Also non-`file:` shapes (remote, multi-root) shouldn't be compared at all. | **Fixed.** AC2 step 2 uses Node `fileURLToPath` for percent-decoding AND validates `folder.startsWith('file://')` — non-`file:` shapes are skipped (logged, never crash). |
| 6 | Cursor | Low | MCP wire-shape — `outputSchema` / Zod must be extended for `repo_path` (input) and `composer_resolved` (output) per item 025 patterns. | **Fixed.** AC1 grows a "Zod input + output schema extension" sub-paragraph spelling out the additions; smoke gains a one-line description-contains-`repo_path` assertion. |
| 7 | Cursor | Low | `metadata_match` adds a dynamic SQL clause; the SQLite adapter's prepared-statement cache must either include the metadata_match signature in its cache key OR avoid caching the dynamic variants. | **Fixed.** AC3's SQLite implementation paragraph adds the prepared-statement-cache guidance as an explicit "document the choice" note. |
| 8 | Cursor | Low | Pagination consistency for repo-scoped tails — the `before` / `emitCursor` rules must apply unchanged on repo-filtered pages. | **Fixed.** AC4 step 3 makes the pagination guarantee explicit: "the existing `before` / `emitCursor` rules continue to apply unchanged — the `metadata_match` filter is added to the same query that constructs the pagination cursor." |
| Cursor (cosmetic) | — | The four `# Cross-tool review checklist` boxes were still `[ ]`; strategist should tick them post-review. | **Done.** All four boxes now `[x]` with R1 patch notes inline. |

**Strategist self-finding (added during R1 patch authoring):**

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 9 | Low | The R1 cycle is itself the SIXTH consecutive M1-1 dogfooding hit today; the structural certainty of the gap is now documented and load-bearing for the wiki promotion. | **Added implicitly.** Review-history-recovery-shape paragraph above cites the count; no further Context section change needed beyond R2's already-added one-sentence note on 034. |

**Convergence analysis:**

R1 of 035 shows the **same cross-tool divergence pattern** the journal has been documenting since 030 / 032 / 033 / 034:
- **Codex specializes in implementation correctness** (the load-bearing HIGH on workspace_id-not-backfilled is unambiguously Codex's domain — it required reading the extractor's startup-order semantics carefully).
- **Cursor specializes in contract clarity + wire-shape discipline** (Zod schemas, prepared-statement cache, pagination consistency, non-`file:` folder shapes).
- **Both reviewers converged on three findings** (source+repo_path, MemoryStorage parity, file:// URL decoding) — high-value convergence, different prescription depths (Cursor's was more thorough on URL decoding; Codex's was more focused on the parity issue).

Post-R1 promote-to-wiki recommendation: the convergence-at-severity + divergence-at-prescription + R1-recovery-via-SQLite-probe-from-second-reviewer pattern is now a 5-cycle (030, 032, 033, 034 R1+R2, 035 R1) confirmed signature. Promote to `wiki/operating-model/cross-tool-spec-review.md` post-035 as the canonical example.

### Validation after R1 patch

- `tools/blocked.py --validate` — passes (run after final commit below).
- AC1 + AC2 + AC4 architecture is now coherent — no more dependency on the optional `metadata.workspace_id`. The single resolver derives a single `composer_id` from Cursor's own storage; that composer_id is reliably present on every captured atom.
- AC3 + AC5 parity contract closes the silent-divergence risk between in-memory tests and production SQLite.
- All four cross-tool review gates marked done with R1 patch notes inline.

### What R2 should focus on

- Whether the Cursor `composerData:<id>` row's `lastUpdatedAt` field is guaranteed to be populated, or whether some composers might have `createdAt` only (the R1 patch hedges with a fallback, but R2 should validate against real Cursor data — the strategist's 22:00 PDT SQLite probe confirmed `lastUpdatedAt` exists, but a different Cursor version might omit it).
- Whether the dual-adapter parity test pattern (`describe.each` over [SQLiteStorage, MemoryStorage]) is the established convention in this repo or whether the codebase has a different parametrize-by-adapter idiom worth matching.
- Re-test the recovery pattern: does ECHO still need the SQLite probe for Cursor's R2? Expected YES — 035 still in `ready/`, not built.
