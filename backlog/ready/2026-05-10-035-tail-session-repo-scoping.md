---
id: 2026-05-10-035-tail-session-repo-scoping
title: `tail_session` repo-scoping for Cursor — workspace-aware MRU resolution (M1-1 sub-gap C)
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-10
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/mcp/tools/tail-session.ts                # Where the resolver currently picks the wrong composer for Cursor
  - src/capture/extractors/cursor.ts             # workspace_id metadata is already populated here; this item is purely consumer-side
  - src/storage/interface.ts                     # QueryFilter — extended with metadata_match for the storage-level equality filter
  - src/storage/sqlite.ts                        # SQL implementation; exclude_metadata_surface precedent for json_extract-based filtering
  - tests/mcp/tools/tail-session.test.ts         # Existing tail_session tests (extend)
  - backlog/ready/2026-05-10-034-cursor-capture-coverage.md  # Sibling M1-1 item (sub-gaps A+B); 035 closes sub-gap C
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
- When `repo_path` is set AND neither `source` nor `source_app` is set: reject with an explicit error (`'tail_session: repo_path requires source_app=cursor'`). Don't silently fan out to "search all cursor composers in this repo" — the no-args + repo_path combination is ambiguous and not load-bearing for the M1-1 demo.
- When `repo_path` is unset: 100% backwards-compatible with today's behavior.
- The parameter accepts an absolute path only. Relative paths reject with `'tail_session: repo_path must be absolute'`. Trailing slash normalized away (the resolver match is path-equality after `path.normalize`).

Description string for the tool (added to `TAIL_SESSION_DESCRIPTION`): one sentence after the existing `source_app` paragraph — `'For source_app=cursor, optionally pass repo_path=<absolute repo root> to scope the tail to the Cursor composer active in that project. Without repo_path, the MRU resolution returns the most-recently-active Cursor composer globally (which is often a different project than the caller intends).'`

### AC2 — Server-side workspace resolver

Add a new helper next to the cursor source-resolution code in `tail-session.ts` (or a new `src/mcp/cursor-workspace-resolver.ts` if it grows past ~40 lines):

```ts
async function resolveCursorWorkspaceFromRepoPath(
  repoPath: string,
): Promise<{ workspace_id: string; workspace_db_path: string } | null>;
```

Implementation:

1. Normalize `repoPath` via `path.normalize` + strip trailing `/`.
2. Read the contents of `~/Library/Application Support/Cursor/User/workspaceStorage/`.
3. For each entry, read its `workspace.json` (skip if absent or unreadable; log warn).
4. Parse the JSON for the `folder` field (Cursor stores `"folder": "file:///Users/.../<repo>"`). Strip the `file://` prefix.
5. If the parsed folder matches the normalized `repoPath`, return `{workspace_id: <dir hash>, workspace_db_path: <full path to workspaceStorage/<hash>/state.vscdb>}`.
6. Return `null` if no workspace matches (e.g., the caller's project isn't open in Cursor at all).

The Cursor `globalStorage/state.vscdb` workspace path is derived from `~` expansion at request time. The workspaceStorage prefix is hardcoded relative to `~/Library/Application Support/Cursor/User/workspaceStorage/` for V1 (matching the existing extractor constants). Cross-platform (Linux: `~/.config/Cursor/User/`, Windows: `%APPDATA%/Cursor/User/`) is **out of scope** — file an extension item if a non-macOS contributor reaches this gap.

If multiple workspaces match the same `repoPath` (rare — multiple workspace.json files pointing at the same folder), return the most-recently-modified one (`mtime` of the workspace's `state.vscdb`, or fallback to lexically first if mtimes are equal). The duplicate-workspace case is a Cursor-side anomaly; the deterministic choice is sufficient.

### AC3 — `QueryFilter.metadata_match` storage extension

Extend `QueryFilter` in `src/storage/interface.ts` and `src/storage/sqlite.ts` with an optional positive-equality metadata filter:

```ts
// Restrict results to rows whose JSON metadata matches the given key→value pairs
// using string equality (each entry implies an AND clause). Mirrors the existing
// exclude_metadata_surface pattern (which is set-membership on a single key);
// this is general key/value equality across N keys. Used by tail_session's
// repo_path filter to restrict cursor atoms to a specific workspace_id +
// composer_id pair. Each entry value is matched with string equality
// (json_extract returns the underlying type; storage normalises numeric/boolean
// to JSON.stringify if needed — but for the M1-1 use case all values are strings).
metadata_match?: Record<string, string>;
```

Implementation in `src/storage/sqlite.ts`:

- For each `(key, value)` pair, emit `AND json_extract(metadata, '$.<key>') = ?`.
- Use prepared-statement binding (no string interpolation of either keys or values).
- **Key whitelist:** to prevent caller-supplied keys from probing arbitrary metadata fields, restrict to a known-safe set: `['workspace_id', 'composer_id', 'session_id']`. Any other key in the input rejects the query at the storage seam with a clear error. The whitelist is enforced in the storage adapter, NOT the MCP tool — defense in depth.
- Empty `metadata_match: {}` is a no-op (no filter applied; equivalent to omitted parameter).
- Applies to both `query()` and any downstream tools that take `QueryFilter`.

This is a **generic** filter that other tools may use in the future. Item 035's only consumer is `tail_session`'s repo-scoping path.

### AC4 — `tail_session` workspace-scoped resolution path

Inside `tail_session`, when `source_app === 'cursor' && repo_path !== undefined`:

1. Call `resolveCursorWorkspaceFromRepoPath(repo_path)`. If `null`, return `{turns: [], next_cursor: null, source_resolved: null, warnings: ['tail_session: no Cursor workspace matches repo_path=<path>; verify the project is open in Cursor and workspaceStorage has been populated']}`.
2. With the resolved `workspace_id`, query storage for the newest atom in `fs:/Users/.../globalStorage/state.vscdb` source whose `metadata.workspace_id` matches: `storage.query({source_prefix: <vscdb prefix>, metadata_match: {workspace_id: resolved.workspace_id}, exclude_metadata_surface: ['fs'], limit: 1})`. Extract the atom's `metadata.composer_id`.
3. If no atom is found (composer captured 0 atoms for this workspace), return the same empty-result + warning shape.
4. Tail the resolved composer: `tailExactSource(storage, source='fs:/Users/.../globalStorage/state.vscdb', count, before)` BUT with an additional `metadata_match: {composer_id: <resolved composer_id>}` filter applied via the storage extension above. (Refactor `tailExactSource` to optionally accept and pass through `metadata_match`.)
5. Return the result with `source_resolved` populated as the `.vscdb` path AND a new optional field `composer_resolved: <composer_id>` so the caller can verify the right composer was picked.

The `source_app_resolved` field stays as `'cursor'`. No changes to other source_app paths.

### AC5 — Test coverage

- **Unit test (workspace resolver):** mock-fs fixture with three `workspaceStorage/<hash>/workspace.json` files, two pointing at unrelated repos and one pointing at `/tmp/test-repo`. Assert `resolveCursorWorkspaceFromRepoPath('/tmp/test-repo')` returns the correct `workspace_id` + path. Counter-test: `resolveCursorWorkspaceFromRepoPath('/tmp/no-such-repo')` returns `null`. Edge case: workspace.json malformed JSON or missing `folder` field — skip gracefully, log warn, don't crash.
- **Unit test (QueryFilter.metadata_match):** storage-layer test with three atoms in memory: A (workspace_id='WS1'), B (workspace_id='WS2'), C (workspace_id='WS1', composer_id='COMP-X'). Assert `query({metadata_match: {workspace_id: 'WS1'}})` returns A+C in newest-first order; `query({metadata_match: {workspace_id: 'WS1', composer_id: 'COMP-X'}})` returns only C. Whitelist-rejection test: `query({metadata_match: {arbitrary_field: 'X'}})` throws a clear error at storage seam.
- **Integration test (tail_session repo-scoped):** seed storage with 6 cursor atoms across 3 composers in 2 workspaces (`WS-PROJECT-ECHO`: composer A with 3 atoms, composer B with 1 atom; `WS-OTHER`: composer C with 2 atoms; mixed timestamps such that the most-recent atom is in `WS-OTHER`). Also seed the mock-fs with the workspaceStorage files. Call `tail_session(source_app='cursor', repo_path='/tmp/project-echo', count=5)`. Assert returned turns are all from composer A (newest-first, count=3), `source_resolved=<vscdb-path>`, `composer_resolved='A'`, `source_app_resolved='cursor'`. Counter-test: same setup, no `repo_path` — assert returned turns include the wrong-project composer C's most-recent atom at position 0 (proves the gap is present without 035 and absent with it).
- **Unit test (parameter validation):** `tail_session(source_app='claude_code', repo_path='/tmp/repo')` returns a warning + ignores repo_path. `tail_session(repo_path='/tmp/repo')` (no source_app, no source) rejects with the documented error. `tail_session(source_app='cursor', repo_path='relative/path')` rejects with the absolute-path error.

Total expected test additions: 6-9 new test cases.

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

- [ ] **Gate 1 — Diff vs precedent.** Compared against 030 (atomic toolkit decomposition — `tail_session` extended in-place per the pattern), 032 (explicit-over-implicit parameter additions — `repo_path` is opt-in, no-args path unchanged), 034 (capture-layer counterpart in M1-1 — 035 stays read-side only). The `metadata_match` storage extension mirrors the existing `exclude_metadata_surface` shape.
- [ ] **Gate 2 — Out-of-scope drift.** Eight "do NOT" rules covering find_clusters/search_memories extensions, new tools, capture-layer changes, other source_apps, caller-identity, cross-platform paths, caching, multi-repo queries.
- [ ] **Gate 3 — Falsifiable ACs.** AC5 has 4 falsifiable test families. AC6 has a counter-test that proves the gap is present without 035 (sanity check against accidental no-op). AC4 step 4's composer_id filter is testable in isolation (skip the workspace_id step, verify composer_id alone works).
- [ ] **Gate 4 — Cross-reference consistency.** All references use symbol names (no line numbers). M1-1 sub-gap C taxonomy lines up with the 2026-05-10 dogfooding journal entries (16:08 / 22:11 / 22:25 / 22:45 PDT). Sibling items 034 (M1-1 A+B), 029 (cursor capture diagnosis correction), 031 (deprecation gate) all referenced with current IDs.

# Review history

*This spec is V1 (initial draft). If cross-tool review surfaces revisions, append R1 / R2 / etc. sections here per the operating-model convention.*

**Pre-R1 strategist note:** 035 was specced in parallel with 034 implementation (per founder direction 2026-05-10 22:55 PDT) precisely because the M1-1 sub-gap C evidence reached structural certainty during 034's own review cycles (4 in-the-moment dogfooding hits today). Skipping the "≥3 hits before specing" gate that the 034 spec hedged is deliberate; the gate was a precaution, not a requirement.
