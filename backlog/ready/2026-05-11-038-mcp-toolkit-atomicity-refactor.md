---
id: 2026-05-11-038-mcp-toolkit-atomicity-refactor
title: MCP toolkit atomicity refactor — subtractive surface reform (RC2)
status: ready
priority: HIGH
estimate: 1.5-2d
created: 2026-05-11
spec_refs:
  - src/mcp/tools/tail-session.ts                # ENTIRE FILE deleted; callers compose echo_resolve_mru + search_memories
  - src/mcp/tools/recent-work-context.ts         # ENTIRE FILE deleted; cluster engine factored into a shared internal helper (see Implementation Notes); 031 deprecation gate fires concurrently per founder direction
  - src/mcp/tools/find-clusters.ts               # Today delegates to getRecentWorkContext at line 190; must be rewritten to call the new internal cluster helper directly
  - src/mcp/tools/wait-for-new-turns.ts          # line 252 — `.map(projectMatch)` bundling removed; new bodyless contract returns IDs only
  - src/mcp/tools/search-memories.ts             # line 142 hardcoded `exclude_metadata_surface: ['fs']` — replaced by shared helper. Caller-side absorbs tail_session's exact-source-tail semantic via existing `source_prefix` + `limit` + DESC order
  - src/mcp/tools/get-atom.ts                    # KEPT — line 139 `content: ev.content` is the only verbatim path; removing reopens item 033's escape-hatch gap. No renames in 038.
  - src/mcp/tools/get-atoms.ts                   # KEPT — cost-bounded summary fetch via projectMatch. No renames in 038.
  - src/mcp/tools/echo-ping.ts                   # KEPT
  - src/mcp/server.ts                            # line 12 — registerTailSession import + registration removed; recent_work_context registration removed
  - src/storage/interface.ts                     # No changes required — QueryFilter shape already supports everything echo_resolve_mru needs (source_prefix + limit + order + exclude_metadata_surface)
  - backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md  # 030 split get_recent_work_context → find_clusters + get_atoms; 031 was the gated removal item that 038 absorbs
  - backlog/complete/2026-05-10-033-full-atom-recovery.md  # WHY get_atom must stay — escape hatch for verbatim content when `truncations: ["content"]` fires
  - backlog/ready/2026-05-11-037-work-artifact-repo-scoping.md  # 037 adds repo_path uniformly across retrieval tools. 038 MUST land after 037 to inherit the new parameter. blocked_by: 037
  - raw/internal/dogfooding/mcp-interactions-journal.md  # 2026-05-11 16:18 + 16:25 + 16:38 + ~16:40 PDT — 4-round cross-tool strategist convergence on Option D scope (Codex + Cursor, with Codex saving get_atom on get-atom.ts:139 evidence)
blocked_by:
  - 2026-05-11-037-work-artifact-repo-scoping
suggested_builder: any  # Pure MCP-server refactor; no app-specific knowledge needed. Largest risk is the find_clusters / recent_work_context untangle (cluster engine factor-out).

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Context

Today's 3-way cross-tool root-cause investigation (2026-05-11; CC session `95d30e5e`, Codex `019e1901`+`019e1955`, Cursor composer `558e2738`+`459e6f6d`) identified **two root causes** behind 7 distinct retrieval-side issues. Item 037 closes RC1 (work-artifact scoping). This item closes RC2.

**RC2 — MCP tools each re-compose `storage.query + filter + projector + resolver` ad-hoc; no retrieval-pipeline abstraction; bodies bundled into discovery surfaces; convention-vs-primitive boundaries blurry.**

Concrete code evidence from the investigation:

| Pattern | Sites | Drift |
|---|---|---|
| `exclude_metadata_surface: ['fs']` hardcoded | `search-memories.ts:142`, `tail-session.ts:112`, `wait-for-new-turns.ts:135`, `recent-work-context.ts:389` | 4 sites, same constant — Bug B fix in 2026-05-08 fired 3 times because each new tool re-hardcoded it |
| `.map(projectMatch)` body-bundling in discovery surface | `search-memories.ts:191`, `tail-session.ts` (`tailExactSource`), `wait-for-new-turns.ts:252` | 3 discovery tools bundle bodies into their envelope; only `find_clusters` correctly returns IDs-only |
| `source_app → source_prefix` resolution | `tail-session.ts:113`, `wait-for-new-turns.ts:117` (`resolveSources`), `search-memories.ts:125` | 3 copies of `buildSourceAppMap()` lookup |
| `tail_session(source=X, count=N)` exact-source mode | `tail-session.ts:183-300` | Subset of `search_memories(source_prefix=X, limit=N)` reverse-chrono. No primitive lost by killing it (Cursor's round-4 finding, verified at code level). |
| `tail_session` compound modes (`source_app`, no-args, repo-scoped) | same file | Need a real MRU resolver primitive; today's "compound discovery + body fetch + resolver-as-side-effect" shape is the e2e tool the founder flagged: *"each tool truly atomic and used in combination... instead of one tool trying to complete a task e2e."* |
| `find_clusters` delegates to `getRecentWorkContext` | `find-clusters.ts:190` | The 030 split partially happened — find_clusters wraps the deprecated `recent_work_context` for its cluster engine. 031 was supposed to remove the now-dead `recent_work_context`. The gate's been open since 030 shipped 2026-05-10 (≥2 days dogfooded). 038 absorbs 031. |
| `wait_for_new_turns` bundled wait+fetch | `wait-for-new-turns.ts:252` | Server-side long-poll + body projection in one envelope. Client-timeout bit ≥3 times today (13:39, 16:00, 16:30 PDT). Bundling the bodies makes the response heavier AND the long-poll wait dimensions both untouched-cost. Atomic separation (return IDs only) shrinks the envelope AND makes the wait outcome cheap to consume. |

**4-round strategist convergence on the spec shape** (full disposition table in raw/internal/dogfooding/mcp-interactions-journal.md ~16:18–16:40 PDT 2026-05-11):

1. Founder reframed RC2 as *"each tool truly atomic and used in combination, instead of one tool trying to complete a task e2e."*
2. CC strategist (me) proposed Option B (additive deprecation, mirrors 030→031 pattern). Codex agreed. Cursor pushed back with Option D (subtractive — kill `tail_session`, kill `get_atom`).
3. Codex pushed back on D's `get_atom` removal with code citation (`get-atom.ts:139` is the only verbatim path; `get-atoms.ts:113` is the projected/capped path; killing `get_atom` reopens item 033's escape-hatch gap). Verified by reading both files.
4. Cursor pushed back on Codex's "keep exact-source `tail_session`" carve-out: `tail_session(source=X, count=N)` is functionally `search_memories(source_prefix=X, limit=N)` reverse-chrono — no primitive lost. Verified by reading `tail-session.ts:183-300` against `search-memories.ts:115-205`. Plus Cursor: fold `get_recent_work_context` removal into 038 (031 gate is well-open).

**Combined spec shape (this item):** Option D **modified by**: save `get_atom` per Codex (verbatim escape hatch unchanged); fold `recent_work_context` removal in per Cursor (031 deprecation gate fires concurrently). Net surface 8 tools → 7 tools. Subtractive on net — matches `project_v15_cleanup_pause` framing (*"reduce/clarify, not add"*) and the founder's "atomic primitives compose" articulation.

**Why this item ships RC2 as one coherent merge instead of N small ones:** the four pieces are tightly coupled. Killing `tail_session` requires `echo_resolve_mru` to exist (otherwise the compound modes lose their replacement). Killing `recent_work_context` requires factoring the cluster engine into a shared helper (otherwise `find_clusters` breaks). Unbundling `wait_for_new_turns` requires the DRY'd `exclude_metadata_surface` helper to land (the new bodyless path is cleaner if it uses the helper from line 1). Splitting into N items would create a fake-dependency item chain that has to land in order anyway.

# Goal

After 038 ships, the MCP toolkit surface is **7 tools** (down from 8), each doing exactly one thing:

| Tool | Operation | Bodies? | Surface change |
|---|---|---|---|
| `echo_ping` | Health | n/a | unchanged |
| `find_clusters` | Discovery: group atoms by shared artifacts → cluster skeletons (IDs only) | NO | unchanged (already correct shape) |
| `search_memories` | Discovery: substring/source/time/repo filter → matched atoms with bodies | yes (cost-bounded projection) | unchanged (already correct; absorbs `tail_session`'s exact-source-tail semantic via `source_prefix + limit + DESC`) |
| `echo_resolve_mru` | Discovery: resolve newest source(s) under a predicate → source paths only | NO | **new** |
| `wait_for_new_turns` | Subscription: block until new atoms match a predicate → IDs only | **NO** (changed) | unbundle bodies; caller composes `get_atoms`/`get_atom` for fetch |
| `get_atoms` | Projection: ≤50 IDs → cost-bounded summary bodies | yes (projected) | unchanged |
| `get_atom` | Projection: 1 ID → verbatim content body | yes (verbatim) | unchanged |

Removed: `tail_session`, `recent_work_context`.

**Composable workflows the new shape supports** (each is one or two atomic calls, no e2e wrapper):

- "Where did I leave off in cursor for this repo" = `echo_resolve_mru({source_app: 'cursor', repo_path: X})` → `search_memories({source_prefix: <resolved>, limit: 5})`
- "Tail an exact session" = `search_memories({source_prefix: X, limit: N})`
- "Wait for next Cursor turn in this repo, then fetch summary" = `wait_for_new_turns({sources: ['cursor'], repo_path: X, since: now})` → `get_atoms(ids, format='minimal')`
- "Wait for next Claude turn, then fetch verbatim" = `wait_for_new_turns({sources: ['claude_code']})` → `get_atom(ids[0])`
- "Find related work threads" = `find_clusters({since: now-4h, repo_path: X})` → `get_atoms(cluster.atom_ids)` for the cluster of interest

Every workflow that today goes through `tail_session` has a 1- or 2-call composition replacement. Every workflow that today goes through `recent_work_context` is already replaced by `find_clusters + get_atoms` (the 030 split).

**Demo bar:** a randomly-picked daily workflow from the dogfooding journal (e.g., 13:27 PDT cross-session resume from today) is reproducible end-to-end with the new toolkit in ≤2 MCP calls per workflow step. The journal entry written after 038 ships must explicitly cite the new tool names — if the strategist instinctively types `tail_session(...)` and gets a "no such tool" error, the muscle-memory migration cost is visible.

# In Scope (Acceptance Criteria)

### AC0 — Expand `search_memories` with `source` (exact) + `metadata_match` parameters (R1 correction — Codex + Cursor convergent finding)

**R1 correction context:** R1 reviewers (Codex + Cursor) caught that the original 038 spec assumed `search_memories(source_prefix=X, limit=N)` was a drop-in replacement for `tail_session(source=X, count=N)`. It isn't. `tail_session.ts:321` uses **exact** `source` match; `search_memories.ts:141` uses **`source_prefix` (LIKE)**. Sibling-source over-inclusion is possible. Also, today's `tail_session` exposes `metadata_match: {composer_id}` for 037's Cursor Phase 2 fallback; `search_memories.ts:86` has no metadata-filter parameter at the tool layer. Without AC0, AC2's kill-tail_session decision silently regresses both exact-source tailing AND 037's Cursor legacy fallback.

**Surface:** `src/mcp/tools/search-memories.ts` — `SearchMemoriesParams` interface + Zod input schema + handler body.

**Contract:**

1. Add `source?: string` to `SearchMemoriesParams`. Zod: `z.string().optional()`. When set, forwards to `storage.query({source: source, ...})` for exact-source matching. Mutually compatible with `source_prefix`: if both are passed, `source` wins (the more-specific predicate); document this in the tool description with the same "explicit-over-implicit" precedent (today `source_prefix` wins over `source_app`).
2. Add `metadata_match?: Record<string, string>` to `SearchMemoriesParams`. Zod: `z.record(z.string(), z.string()).optional()`. Forwards to `storage.query({metadata_match: <input>, ...})`. **Storage seam enforces the whitelist** (`METADATA_MATCH_KEY_WHITELIST` already there per 035 + 037 extension).
3. **Tool-layer isError on non-whitelisted keys (R1 refinement — Cursor #1).** Before calling `storage.query`, the tool handler validates: every key in `metadata_match` must be in `METADATA_MATCH_KEY_WHITELIST`. Non-whitelisted key → MCP isError envelope with message `search_memories: metadata_match contains non-whitelisted key '${key}'; allowed: workspace_id, composer_id, session_id, repo_root`. This is **defense-in-depth on top of** the storage-seam whitelist; the tool-layer check produces a clean, source-attributed error rather than letting the storage error bubble up unattributed.
4. `query_echo` block surfaces both new fields: `source: string | null` + `metadata_match: Record<string, string> | null`. Caller can verify which filters fired.
5. Description string update: extend `SEARCH_MEMORIES_DESCRIPTION` to document the new parameters + the composition patterns they unlock (`echo_resolve_mru → search_memories(source=<resolved>)` for tail; `search_memories(metadata_match={composer_id: X})` for 037's Cursor Phase 2 fallback).
6. **Scope-bound (R1 refinement — Cursor #2):** `metadata_match` is exposed ONLY on `search_memories` in 038. NOT on `find_clusters` or `wait_for_new_turns`. Those tools today don't need it; widening their surface for a hypothetical future need is YAGNI.
7. Tests: 6 new unit tests — (a) `source` exact match filters correctly; (b) `source_prefix` + `source` together: `source` wins; (c) `metadata_match: {composer_id: X}` filters correctly; (d) `metadata_match` with non-whitelisted key returns isError; (e) `query_echo` carries both new fields; (f) backward compat — calls without the new parameters behave identically to today.

### AC1 — Add `echo_resolve_mru` primitive

**Surface:** new file `src/mcp/tools/echo-resolve-mru.ts`; registered in `src/mcp/server.ts`.

**Contract:**

1. Input shape (Zod schema) — **R1 correction (Cursor R1 #5)**: collapsed to single input axis `sources: string[]` (no `source_app` parameter). This matches `wait_for_new_turns.ts:108` `resolveSources` exactly — entries can be either source-app names (`'cursor' | 'claude_code' | 'codex' | 'git'`) → PREFIX MATCH, OR literal source paths → EXACT match. Single axis avoids the "every retrieval tool has a different what-sources parameter" anti-pattern.
   - `sources: string[]` — required, non-empty, ≤ 8. Mixed entry types accepted (same parsing as `wait_for_new_turns`'s `resolveSources`).
   - `repo_path?: string` — optional repo-scoping filter; absolute path; mirrors 037's contract (normalize via the shared `normaliseRepoPath` helper exported from `cursor-workspace-resolver.ts`). When set, only sources whose newest non-fs atom carries `metadata.repo_root === normalize(repo_path)` are eligible.
2. Output shape — single unified shape regardless of input cardinality:
   - `{ sources: Record<string, string | null>, repo_path?: string, warnings: string[], cursor_phase2?: Record<string, { composer_resolved: string }> }`
   - `sources` keys are the input strings verbatim (so caller can do `result.sources[<key>]`). Values are the resolved source path or null when no eligible atoms exist for that key.
   - `cursor_phase2` (NEW, R1 refinement — Cursor R1 #10 closure): per-key map populated ONLY for input entries that triggered Phase 2 legacy fallback. Caller can detect legacy-Cursor-atom recovery per-key.
   - `warnings: string[]` always present.
3. Mechanism: for each input entry, resolve to a prefix (via `resolveSources` shape) then query `storage.query({ source_prefix: <prefix>, exclude_metadata_surface: ['fs'], metadata_match: repo_path ? {repo_root: normalize(repo_path)} : undefined, limit: 1 })` and return the row's `source` field. The fs-exclusion uses the new shared helper from AC5.
4. **Cursor branch parity (037 cooperation):** when an input entry resolves to the Cursor prefix AND `repo_path` is passed, mirror 037's AC6 two-phase semantics — Phase 1 by `metadata.repo_root` directly; Phase 2 falls back to `resolveCursorComposerForRepoPath(repo_path)` only when Phase 1 returns 0 atoms. Populate `cursor_phase2[<input key>]` only when Phase 2 fires. No predicates ANDed across phases (per 037's R1+R2+R3 invariants).
5. **Tools/list description:** explicitly state this is an IDs-only primitive — bodies are NOT fetched here. Document the canonical composition patterns:
   - Tail: `echo_resolve_mru(sources=['cursor'], repo_path=X)` → `search_memories(source=<resolved>, limit=N)` (using AC0's new exact-source filter)
   - 037 Cursor Phase 2 fallback: when `cursor_phase2[<key>]` is populated, the caller follows with `search_memories(metadata_match={composer_id: <composer_resolved>}, limit=N)` to recover legacy atoms (using AC0's new `metadata_match` parameter)
   - Live watch: `echo_resolve_mru → wait_for_new_turns`
6. Tests: at least 10 unit tests — (each of 4 source_app names as `sources` entries) × {with, without} repo_path = 8 cases; one fresh-Cursor-composer Phase 1 test (asserts `cursor_phase2` is absent on the result); one legacy-Cursor-atom Phase 2 test (asserts `cursor_phase2[<key>]` is populated); one mixed-source-app `sources=['cursor', 'claude_code', 'git:/path']` test; one validation test (empty `sources` array → isError); one absolute-path validation for `repo_path` (R1 cooperation with 037).
7. **R1 refinement — Cursor R1 #8:** fixture atoms in the test set MUST include `metadata.repo_root` populated per 037's AC1 capture-side contract for at least 2 source_apps (claude_code + codex), to exercise the 037 cooperation path end-to-end. A Cursor fresh-composer fixture should also write `metadata.repo_root` (per 037's AC1 file-walk fallback).

### AC2 — Kill `tail_session`

**Surface:** delete `src/mcp/tools/tail-session.ts` + its test file; remove `registerTailSession` import + call from `src/mcp/server.ts:12`.

**Contract:**

1. The exact-source mode (`tail_session({source: X, count: N})`) replaces to `search_memories({source: X, limit: N})` using **AC0's new exact-source filter** (R1 correction). The semantics are now identical: descending by timestamp, projected bodies via `projectMatch`, cursor-pagination via `next_cursor`, exact source-string match (NOT prefix LIKE — that was the R1 bug).
2. The compound modes (`source_app`, no-args fallback, repo_path resolution) are replaced by `echo_resolve_mru → search_memories(source=<resolved>)` two-call composition.
3. The Cursor Phase 2 legacy fallback (037 AC6) is replaced by `echo_resolve_mru → search_memories(metadata_match={composer_id: <cursor_phase2 result>})` using AC0's new `metadata_match` parameter — closes the R1-identified gap where the kill-tail_session decision originally lost this filter.
4. `tools/list` no longer advertises `tail_session`. Callers receiving a missing-tool error from an MCP client SDK update.
5. Any internal callers of `tailSession()` function (verify none today): N/A — this tool is only consumed via the MCP protocol surface. The `searchMatchSchema` import from `tail-session.ts` (used by callers) is moved to `search-memories.ts` where it originated (cross-check `search-memories.ts:211` — schema actually lives there; tail just re-exported. So this is a no-op on the consumer side except for the import-path bookkeeping). **R1 refinement — Cursor R1 #9:** pre-merge grep-verify: `grep -rn "from.*['\"].*tail-session" src/` returns zero hits before the merge ships.
6. Description-text references to `tail_session` in OTHER tools' descriptions removed: `wait-for-new-turns.ts:44, 53`, `get-atoms.ts:36`. Replace with the new composition pattern (or omit references).
7. Tests: 0 new unit tests (removal is structural); 1 integration test asserts `tools/list` no longer contains `tail_session`; 1 integration test asserts the new composition (`echo_resolve_mru → search_memories(source=X)`) recovers the same atoms today's `tail_session(source_app=X)` does on a fixture set.

### AC3 — Remove `recent_work_context` from MCP surface; factor cluster engine into a shared internal helper (file deletion deferred per R1 correction)

**R1 correction context (Codex + Cursor convergent finding):** the original 038 spec claimed the 031 deprecation gate was "well-open." R1 reviewers caught that's wrong by calendar: the gate is *≥1 week post-030 dogfooding* (= 2026-05-17, 6 days from 2026-05-11). Codex pushed back hard: *"strategist cannot infer founder consent for the override."* AC3 is split: 038 does the cluster-engine factor-out + removes `recent_work_context` from `tools/list` (no longer user-facing). **Actual file deletion is deferred to a follow-up item that fires 2026-05-17 (post-calendar-gate) OR when founder explicitly overrides earlier.**

**Surface:** `src/mcp/tools/recent-work-context.ts` (file stays in-tree, MCP-tool registration removed); rewrite `src/mcp/tools/find-clusters.ts:190` to call a new internal helper directly; new internal file `src/mcp/internal/cluster-engine.ts`.

**Contract:**

1. The cluster discovery engine (today the body of `getRecentWorkContext` in `recent-work-context.ts:~143–479`: time-window resolution, fs-exclusion, no-args 4h→24h auto-expand, cluster building via `src/trace/cluster.ts`, single-source-recent demotion via `rankClusters`, warnings, **AND the `repo_path` → `metadata_match: {repo_root}` forwarding added by 037's AC4 at line ~379**) is factored into a new internal module — suggested location `src/mcp/internal/cluster-engine.ts`. The engine is NOT exposed as an MCP tool; it's a strategy-internal helper for `find_clusters`.
2. **R1 correction (Cursor R1 #4):** the cluster-engine factor-out MUST inherit 037's repo_path forwarding verbatim. The new internal engine accepts the same `repo_path?: string` parameter (already normalized by the calling tool) and threads it as `metadata_match: {repo_root: repo_path}` into its internal `storage.query` call. Without this, 038 silently regresses `find_clusters(repo_path=X)` to global behavior.
3. `find_clusters.ts:190` rewrites the call from `getRecentWorkContext(...)` to the new internal helper. The wire-level `find_clusters` tool surface (input shape, output shape, warnings, including the `repo_path` parameter added by 037) is unchanged — only the internal callee changes.
4. The MCP registration of `recent_work_context` is REMOVED (`server.ts` import + `registerTool` call dropped). `tools/list` no longer advertises `recent_work_context` / `get_recent_work_context`.
5. **The file `src/mcp/tools/recent-work-context.ts` stays in-tree as a no-op shell.** Its public exports remain available so that internal code (the new cluster engine) can be implemented either as a refactor-in-place OR as a parallel file. Builder's choice on shape; the constraint is: zero MCP-tool surface area, zero behavior regression on `find_clusters`.
6. **A new follow-up item `2026-05-17-XXX-recent-work-context-file-removal.md` is filed in `_followups.md` at AC3 implementation time** (not in 038's scope to file it, but the spec records the intent). The follow-up:
   - Triggers 2026-05-17 (calendar gate satisfied) OR earlier on founder explicit override.
   - Scope: delete the `recent-work-context.ts` file, move any remaining shared exports (e.g. `hasTzMarker` re-export at line 344) to their canonical locations, update any imports.
   - Includes a **founder-consent receipt section** (Cursor R1 refinement #3 format): cites original 031 gate criterion, empirical signal (zero `get_recent_work_context` calls in journal since 2026-05-09), and decision date.
7. All public exports from `recent-work-context.ts` that other modules depend on (verify by `grep -rn "from.*recent-work-context"`):
   - `getRecentWorkContext` function → moved into the internal engine (the old file may re-export it as a transition, or callers update — builder's choice)
   - `hasTzMarker` re-export at line 344 → callers should import directly from `src/mcp/util/iso8601.ts` (already the canonical location)
   - `TZ_NAIVE_WARNING` re-export → same as above
8. Tests: existing `recent-work-context.test.ts` tests are renamed and re-rooted on the new internal engine — they test the same behavior (auto-expand, demotion, fs-exclusion, **and 037's repo_path forwarding**), just at a different seam. `find_clusters.test.ts` gets one additional test asserting the internal engine integration works end-to-end with the same shape, including a regression test for `find_clusters({repo_path: X})` returning identical results to post-037 behavior.

### AC4 — Unbundle `wait_for_new_turns` bodies

**Surface:** `src/mcp/tools/wait-for-new-turns.ts`, specifically the `pollOnce` return projection at line 252 (`turns: rows.map(projectMatch)`).

**Contract:**

1. Output shape change: the `turns` field today carries projected matches (full body content + metadata via `projectMatch`). After 038, `turns` carries **atom IDs only**:
   ```
   { schema_version: 1, tool: 'wait_for_new_turns',
     turn_ids: string[],     // NEW — was `turns: ProjectedMatch[]`
     next_since: string, timed_out: boolean, warnings: string[] }
   ```
2. Callers compose `get_atoms(turn_ids)` for summary fetch or `get_atom(turn_ids[i])` for verbatim of one. The composition cost is one extra MCP call per wake, but the envelope shrinks dramatically (no body projection in the wait response).
3. **NO parallel-vocabulary deprecation window.** The bodies-bundled shape is removed in the same merge that ships the IDs-only shape. Migration is bounded — 3 in-loop MCP clients (CC, Codex, Cursor) demonstrated they update fluidly in-session.
4. The fs-exclusion, source-prefix resolution, and `since` strict-after-boundary semantics from today's `pollOnce` (line 130-160) remain unchanged. The repo_path filter from 037 also remains unchanged.
5. Server-side timeout default stays 30s, max 60s (the client-timeout failure mode flagged in the investigation is not fixed by 038 alone — it's a follow-up concern; the envelope-shrinking from this AC is the immediate mitigation).
6. Description string update: explicitly document the IDs-only contract + the canonical compose pattern.
7. Tests: 3 new unit tests — (a) returned `turn_ids` matches what would have been returned in the old `turns[].id` field; (b) no `content` / `metadata` fields appear on the response; (c) integration test asserting `wait → get_atoms` round-trip recovers the same atom bodies a single-call `wait_for_new_turns` would have returned pre-038.

### AC5 — DRY `exclude_metadata_surface: ['fs']` into a shared helper

**Surface:** new helper file `src/mcp/util/fs-exclusion.ts` (or fold into existing `src/mcp/util/source-app.ts` — builder's call); update 3 call sites that survive 038 (`search-memories.ts:142`, `wait-for-new-turns.ts:135`, plus the new `echo-resolve-mru.ts` from AC1 and the new internal cluster-engine module from AC3).

**Contract:**

1. New exported constant or function (suggested: `export const EXCLUDE_FS_SURFACE: readonly string[] = ['fs'] as const;` plus a helper builder `export function withFsExclusion<F extends QueryFilter>(f: Omit<F, 'exclude_metadata_surface'>): F { return { ...f, exclude_metadata_surface: ['fs'] } as F; }`). Builder's choice on shape; the constraint is: ONE definition site, all callers reach through it.
2. The Bug B regression (2026-05-08 — new tool ships without fs-exclusion → fs-watcher events dominate results) is structurally impossible after AC5: a new retrieval tool that wants the fs-watcher exclusion must import the helper; one that doesn't import it explicitly is making an explicit "include fs surfaces" choice (rare, but legitimate for fs-watcher diagnostics).
3. The 4 today-sites are reduced to 3 surviving (tail-session.ts and recent-work-context.ts go away in AC2 + AC3). All 3 surviving sites + 1 new site (AC1's `echo_resolve_mru`) + 1 internal engine site (AC3's cluster engine) = 5 call sites total, all reaching through the new helper.
4. Tests: 1 unit test asserting the helper's output shape matches today's hardcoded `{exclude_metadata_surface: ['fs']}`. PLUS **1 grep-scan integration test (R1 refinement — Cursor R1 #7)**: a test that scans `src/mcp/tools/*.ts` (excluding the helper file itself) for the string literal `exclude_metadata_surface: ['fs']` and FAILS if any hit is found. Closes the structural-impossibility loop: the Bug B regression (a new tool ships re-hardcoding the constant) is now caught by CI, not by post-merge dogfooding.

### AC6 — Dogfooding verification

**Procedure** (post-merge, one clean run + one second-day run closes the verification per the 036 pattern):

1. Pick a random daily workflow from the dogfooding journal (e.g., the 13:27 PDT 2026-05-11 cross-session resume entry, or the 14:46 PDT Cursor-connects-to-Claude entry). Reproduce the workflow end-to-end with ONLY the post-038 toolkit.
2. The workflow MUST land in ≤2 MCP calls per logical step (e.g., "find where Claude left off" = 1 `echo_resolve_mru` + 1 `search_memories`; not 1 `tail_session` because that's gone).
3. Log the run as a standard journal entry per CLAUDE.md template. The journal entry MUST cite tool names by their post-038 spellings. If the strategist instinctively writes `tail_session(...)` in the journal entry, that's an empirical signal the rename is needed in a future item — file the observation as a candidate.
4. Cross-tool: confirm Codex + Cursor + Claude Code MCP clients all parse the new `tools/list` cleanly (no client-side panics from missing `tail_session`/`recent_work_context`). If a client errors, file as P1 — the migration is supposed to be coordinated.
5. Demo bar: the cross-session resume workflow (today's 13:27 PDT entry, the load-bearing daily move) produces equivalent context recovery in the new toolkit. If post-038 needs ≥3 calls where pre-038 needed 1, that's a regression — file a follow-up to reconsider whether `tail_session`'s exact-source mode should have been preserved as a thin wrapper after all (low likelihood — Cursor's round-4 finding that the exact-source mode is `search_memories(source_prefix=X, limit=N)` reverse-chrono is code-grounded).

# Out of Scope (Don't Drift)

1. **M1-2 (semantic ranking / verdict-turn finding) is NOT in 038.** Founder direction 2026-05-10 20:08 PDT: *"the hardest — saved till the end."* Cursor's round-4 guardrail flagged this explicitly. Any work that touches `rank.ts` or adds ranking modes to `search_memories`/`echo_resolve_mru` is bleed — revert and queue to the M1-2 spec.
2. **No rename of `get_atom` / `get_atoms`.** 4-round strategist consensus: the cost-bounded-summary vs verbatim distinction matters, but the naming is not the load-bearing fix. Renames are an item 039+ candidate IF empirical evidence shows misuse (today: zero observed misuse, only theoretical concern).
3. **No new ranking knob on `find_clusters`.** Today's 5-key rank chain (`hint > openLoop > recent > size > negMedianAge` plus `singleSourceRecent` partition from 032) survives unchanged.
4. **Wait_for_new_turns client-timeout fix is NOT in 038.** AC4 shrinks the envelope (mitigation), but the underlying long-poll-vs-client-timeout tension stays. If a streaming-MCP protocol upgrade is needed, that's a separate item.
5. **No capture-side changes.** This item is pure MCP toolkit reform. The fs-watcher mid-stream invisibility (Issue #3 from the 3-way root-cause investigation) stays out per all three strategists' explicit endorsement.
6. **No new tools beyond `echo_resolve_mru`.** Specifically: no `echo_query` / `echo_wait` / `echo_fetch_*` rename family from the brainstorm. That family was the "Option B" rename path the 4-round investigation rejected.
7. **Backward compatibility for old `tail_session` / `recent_work_context` callers — none.** Clean break. The 030→031 deprecation pattern is NOT applied here because the 4-round investigation explicitly concluded parallel-vocabulary deprecation costs MORE in journal-discipline confusion than a one-time migration of 3 known MCP clients.
8. **Linux/Windows path-resolver shim** — same Out-of-Scope rule as 035/037. macOS-only paths.

# Implementation Notes

- **Suggested commit shape (R1 reordered):** 6 commits — (a) AC5 DRY helper (smallest, lands first as foundation); (b) **AC0 `search_memories` source + metadata_match expansion** (R1 addition; foundation for AC2's composition replacement); (c) AC1 `echo_resolve_mru` + tests (depends on AC0 + AC5); (d) AC3 cluster engine factor-out + `find_clusters` rewrite + REMOVE recent_work_context MCP registration (file stays in-tree per R1 split); (e) AC2 delete `tail_session` + description-text cleanup in sibling tools + grep-verify (R1 refinement) + tests; (f) AC4 unbundle `wait_for_new_turns` + tests. Each commit independently passes `npm test`, lint, typecheck.
- **AC3 is the largest engineering item.** The cluster engine in `recent-work-context.ts:~143–479` is ~340 lines tightly coupled to its public function signature. Factor-out requires: pulling out the time-window-resolution + cluster-build + rank pipeline as an internal helper; routing today's 2 callers (`find-clusters.ts:190` + the now-removed MCP tool wrapper) cleanly. The single-source-recent demotion (item 032) and no-args auto-expand semantics MUST be preserved verbatim — the new internal helper has the same behavior, just a different module boundary.
- **AC1 + AC2 are bounded by AC3's completion.** `echo_resolve_mru` is the replacement for `tail_session`'s compound modes; both can be specced independently but the builder should land AC3's factor-out first to ensure no shared cluster-engine state gets re-imported into the new resolver.
- **No new dependencies.** Everything is internal refactor + one new MCP tool registration. The `node:path` + Zod + storage-interface imports are all already present.
- **The journal-write race condition** flagged in the coordination-layer deferral note (raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md) is NOT load-bearing here — 038 doesn't touch shared journal files in any new way. Standard "chain verify → pandoc → git add → commit → push" discipline applies as today.
- **Migration ergonomics:** the AC2 description-text cleanup in sibling tools (wait-for-new-turns.ts:44, 53; get-atoms.ts:36) is small and easy to miss. Reviewer should grep `tail_session` across `src/mcp/tools/` after the diff to confirm zero references survive.

# After Completion (Strategist Notes)

1. **Wiki promotion (post-merge, after dogfooding lands):**
   - Update `wiki/surfaces/mcp-server.md` — toolkit shape is now 7 tools (was 8). Document `echo_resolve_mru` as the canonical MRU resolver; document the IDs-only contract on `wait_for_new_turns`; document the compose patterns explicitly.
   - DELETE `wiki/surfaces/mcp-tail-session.md` (if it exists post-035 promotion). The tool is gone.
   - Add a new principle page candidate: `wiki/principles/atomic-primitives-compose.md` — the principle that surfaces from this work, explicitly contrasted with e2e tools.
2. **The post-038 toolkit IS the V1 vocabulary going forward.** Any new MCP tool proposal must justify why it can't be expressed as a 1-2 call composition of the existing 7. The bar is high — every additional tool grows the journal-discipline cost across all MCP clients.
3. **M1-2 (semantic ranking) is the next strategic conversation.** With RC1 (037) and RC2 (038) shipped, the remaining V1.5/1.6 substrate gap is search-ranking. Per founder direction "saved till the end" — strategist drafts the M1-2 item after both 037 + 038 are live + dogfooded for ≥1 week.
4. **If the post-038 dogfooding surfaces a "I keep needing 3 MCP calls where 1 used to do it"** signal, file as evidence for re-adding a convenience wrapper in a future item. Today's analysis says composition is fine; empirical use is the falsifier.
5. **Capture-side mid-stream invisibility (Issue #3 in the journal)** remains the unsolved adjacent gap. All three strategists endorsed "acceptable for V1.5/1.6"; revisit when the founder's daily workflow is bitten enough to overflow the journal cadence.

# Cross-tool review checklist (pre-claim)

- [ ] Does the AC1 `echo_resolve_mru` Cursor branch correctly mirror 037's two-phase semantics? (No predicates ANDed; `composer_resolved` surfaced only when Phase 2 fires; matches 037's AC6 contract verbatim.)
- [ ] After AC3's factor-out, does `find_clusters` still produce identical output to today's wrapper-over-`recent_work_context`? (Same 5-key rank chain, same no-args auto-expand, same single-source-recent demotion. Pure module-boundary refactor; zero behavior change.)
- [ ] Does the diff respect Out-of-Scope rule #1 (no M1-2 ranking bleed-through)?
- [ ] Does the diff respect Out-of-Scope rule #7 (no parallel-vocabulary deprecation — `tail_session` and `recent_work_context` are GONE in this merge, not deprecated)?
- [ ] After AC2, is there any reference to `tail_session` left in `src/`? (Cosmetic-but-important: description-text strings in sibling tools update too.)

# Review history

## R1 — 2026-05-11 ~16:55 PDT (Codex) + ~17:05 PDT (Cursor) + ~20:05 PDT (direction-call round both reviewers) — patched 2026-05-11 ~20:15 PDT by strategist

Cross-tool R1 review against the as-shipped 038 spec (commit `568a2b9`, local-only). Codex and Cursor each ran independent reads + a follow-up direction-call round after I asked for input on (A/B) (search_memories expansion vs keep tail_session thin wrapper) + (a/b/c) (031 gate deferral / override / hold). Combined: **10 findings dispositioned (2 convergent HIGH-impact + 7 unique + 1 direction-call call)**.

**Sources:**
- Codex R1: rollout `019e1955` asst #18 (3 findings, pushback verdict)
- Codex direction-call: rollout `019e1955` asst #24 (verdict on A/B + 031 gate)
- Cursor R1: composer `459e6f6d` bubble `3d272155` (3 MED + 4 LOW = 7 findings, PROCEED-with-patches verdict)
- Cursor direction-call: composer `459e6f6d` bubble `16ee13b2` (agrees with A + b-with-receipt)

**Findings dispositioned:**

| # | Severity | Source | Finding | Spec patch |
|---|---|---|---|---|
| 1 | MED (Codex) / MED (Cursor) | Codex + Cursor (convergent, code-grounded) | AC2 claimed `tail_session(source=X)` ≡ `search_memories(source_prefix=X)` reverse-chrono. False: `tail-session.ts:321` uses exact source match; `search-memories.ts:141` uses LIKE prefix. Sibling-source over-inclusion risk. Also: `search_memories` lacks `metadata_match` exposure required for 037 Cursor Phase 2 fallback. | **NEW AC0** added (foundation): expand `search_memories` with `source?: string` (exact) + `metadata_match?: Record<string, string>` (whitelisted at storage seam, tool-layer isError on non-whitelisted keys per Cursor R1 refinement). AC2 rewritten to use AC0's new filters in the composition. |
| 2 | MED (Codex) / MED (Cursor) | Codex + Cursor (convergent) | 031 deprecation gate (≥1 week post-030 dogfooding) fires **2026-05-17**, NOT today. Spec's "well-open" claim was wrong by calendar (6 days early). Codex pushback: strategist cannot infer founder consent for override. | **AC3 split (option a)**: 038 removes `recent_work_context` from MCP `tools/list` registration AND factors out the cluster engine to internal helper, BUT leaves the file in-tree as a no-op shell. New follow-up item filed for 2026-05-17 (calendar gate) OR earlier founder explicit override; includes founder-consent receipt section per Cursor R1 refinement #3 format. |
| 3 | MED (Codex) | Codex (subsumed under #1) | `echo_resolve_mru → search_memories` composition silently lost 037's Cursor Phase 2 metadata-filter capability. | Closed by AC0's `metadata_match` parameter. AC1 + AC2 contracts now show the explicit composition pattern using `metadata_match: {composer_id: <phase 2 result>}`. |
| 4 | MED (Cursor) | Cursor R1 #1 | `echo_resolve_mru` had two mutually-exclusive input axes (`source_app` XOR `sources`) — same "every retrieval tool has different parameter shape" anti-pattern. | AC1 collapsed to single axis `sources: string[]` (matches `wait_for_new_turns.ts:108`). Single unified output shape `{sources: Record<string, string|null>, cursor_phase2?: Record<string, {composer_resolved: string}>, repo_path?, warnings}`. |
| 5 | MED (Cursor) | Cursor R1 #4 | AC3 cluster engine factor-out spec OMITTED `repo_path` forwarding — would have silently regressed 037's `find_clusters(repo_path=X)` path. | AC3 contract #2 added: new internal engine MUST inherit 037's repo_path → metadata_match: {repo_root} forwarding verbatim. New regression test asserts post-038 `find_clusters({repo_path})` matches post-037 behavior. |
| 6 | LOW (Codex) | Codex R1 #4 | AC1 said "8 unit tests" but listed 12+ cases. | Corrected to "at least 10 unit tests" with explicit enumeration. |
| 7 | LOW (Cursor) | Cursor R1 #2 | AC5 "Bug B structurally impossible" claim had no failing test. | AC5 contract #4 extended with grep-scan integration test: scans `src/mcp/tools/*.ts` (excluding helper file) for `exclude_metadata_surface: ['fs']` string; fails if hit. CI-enforced, not dogfood-only. |
| 8 | LOW (Cursor) | Cursor R1 #6 | AC1 test fixtures didn't require post-037 `metadata.repo_root` shape — 037 cooperation not actually exercised. | AC1 contract #7 added: test fixtures MUST include `metadata.repo_root` populated per 037's AC1 contract for ≥2 source_apps; Cursor fresh-composer fixture also writes repo_root via 037's file-walk fallback. |
| 9 | LOW (Cursor) | Cursor R1 #7 | AC2 description claimed `searchMatchSchema` "lives" in `search-memories.ts:211` — builder should verify by grep before merge. | AC2 contract #5 extended with pre-merge grep-verify: `grep -rn "from.*['\"].*tail-session" src/` returns zero hits before the merge ships. |
| 10 | DIRECTION | Codex + Cursor | The A/B (search_memories expansion vs keep thin tail wrapper) and (a/b/c) (031 gate handling) decisions I asked for input on. | Codex + Cursor unanimous on (A); split on 031 — Cursor agrees with (b) if documented, Codex pushes back to require explicit founder consent. Strategist defaults to **(a) — file deletion deferred** per Codex's no-inferring-consent rule; founder can upgrade to (b) by approving the override explicitly. |

**Convergence quality:** 2 of the 5 substantive findings (1 + 2) were independently raised by both reviewers with the same diagnosis. Both convergent findings were load-bearing — Finding 1 caught a code-wrong claim Cursor itself made at round-4 of the pre-spec strategy phase (then re-verified at code-level by Codex during R1); Finding 2 caught a calendar error I'd carried over from my own 16:33 PDT journal entry. The cross-tool review pattern delivered the same kind of structural validation it did on 037.

**Decay pattern starts here:** 038 R1 = 10 findings (2 convergent). Expect R2 to add 3-5 implementation-disambiguation findings per the 037 pattern. Worth running R2 because AC0 (new parameter on `search_memories`) deserves independent re-verification at the implementation-detail level.

**Status:** spec is post-R1-patched. Route to R2 review (Codex + Cursor independent reads) before claim.
