---
id: 2026-05-11-038-mcp-toolkit-atomicity-refactor
title: MCP toolkit atomicity refactor — subtractive surface reform (RC2)
status: ready
priority: HIGH
estimate: 1.5-2d
created: 2026-05-11
spec_refs:
  - src/mcp/tools/tail-session.ts                # ENTIRE FILE deleted; callers compose echo_resolve_mru + search_memories
  - src/mcp/tools/recent-work-context.ts         # File becomes a ≤10-line re-export shim (R2 correction Cursor #3); cluster engine canonical home moves to src/mcp/internal/cluster-engine.ts. **MCP-tool registration STAYS** until 2026-05-17 follow-up (R2 correction Codex HIGH #1 — 031 gate covers removal of the TOOL, not just the file; calendar gate fires 2026-05-17, no founder override).
  - src/mcp/tools/find-clusters.ts               # Today delegates to getRecentWorkContext at line 190; must be rewritten to call the new internal cluster helper directly
  - src/mcp/tools/wait-for-new-turns.ts          # line 252 — `.map(projectMatch)` bundling removed; new bodyless contract returns IDs only
  - src/mcp/tools/search-memories.ts             # line 142 hardcoded `exclude_metadata_surface: ['fs']` — replaced by shared helper. Caller-side absorbs tail_session's exact-source-tail semantic via existing `source_prefix` + `limit` + DESC order
  - src/mcp/tools/get-atom.ts                    # KEPT — line 139 `content: ev.content` is the only verbatim path; removing reopens item 033's escape-hatch gap. No renames in 038.
  - src/mcp/tools/get-atoms.ts                   # KEPT — cost-bounded summary fetch via projectMatch. No renames in 038.
  - src/mcp/tools/echo-ping.ts                   # KEPT
  - src/mcp/server.ts                            # line 12 — registerTailSession import + registration removed; recent_work_context registration STAYS unchanged per R2 + R3 corrections (Codex R2 HIGH #1; founder declined 031 override 2026-05-11 20:11 PDT — registration removal defers to 2026-05-17 follow-up).
  - src/storage/interface.ts                     # No changes required — QueryFilter shape already supports everything echo_resolve_mru needs (source_prefix + limit + order + exclude_metadata_surface)
  - backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md  # 030 split get_recent_work_context → find_clusters + get_atoms; 031 was the gated removal item that 038 absorbs
  - backlog/complete/2026-05-10-033-full-atom-recovery.md  # WHY get_atom must stay — escape hatch for verbatim content when `truncations: ["content"]` fires
  - backlog/complete/2026-05-11-037-work-artifact-repo-scoping.md  # 037 added repo_path uniformly across retrieval tools (shipped 2026-05-11, merge commit `01e2a8b`). 038 inherits the new parameter on all tools that survive the refactor. blocked_by: 037 SATISFIED.
  - raw/internal/dogfooding/mcp-interactions-journal.md  # 2026-05-11 16:18 + 16:25 + 16:38 + ~16:40 PDT — 4-round cross-tool strategist convergence on Option D scope (Codex + Cursor, with Codex saving get_atom on get-atom.ts:139 evidence)
blocked_by:
  - 2026-05-11-037-work-artifact-repo-scoping
suggested_builder: any  # Pure MCP-server refactor; no app-specific knowledge needed. Largest risk is the find_clusters / recent_work_context untangle (cluster engine factor-out).

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-12T04:11:42Z"
branch: "agent/mcp-toolkit-atomicity-refactor"
worktree: "~/Desktop/Project_echo--mcp-toolkit-atomicity-refactor"
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
4. Cursor pushed back on Codex's "keep exact-source `tail_session`" carve-out: claimed `tail_session(source=X, count=N)` was equivalent to `search_memories(source_prefix=X, limit=N)` reverse-chrono. (R1 reviewers later corrected this — `tail_session` uses exact `source` match; `search_memories` uses prefix LIKE. The equivalence claim was code-wrong; AC0 adds exact `source` filter to `search_memories` to make the kill-tail_session decision sound.) Plus Cursor: fold `get_recent_work_context` removal into 038. (R1 + R2 reviewers later corrected this too — the 031 gate fires 2026-05-17, not "well-open." Founder explicitly declined override; AC3 was narrowed to internal cluster-engine factor-out only, leaving the MCP tool registration in place until the 2026-05-17 follow-up.)

**Combined spec shape (post-R1+R2 corrections):** Option D **modified by**: save `get_atom` per Codex (verbatim escape hatch unchanged); add AC0 `search_memories` expansion per R1 (kill-tail_session requires `source` exact + `metadata_match` to compose cleanly); AC1 returns search-ready descriptor (not bare source) per R2 Codex HIGH #2; **`recent_work_context` MCP tool registration stays** per R2 Codex HIGH #1 (031 gate fires 2026-05-17, founder confirmed no override; 038's AC3 is internal cluster-engine factor-out only). Net surface after 038: **8 tools stays as 8 tools** during 038's window. The structural reform (kill `tail_session`, add `echo_resolve_mru`) is net-zero on tool count (8 → 8); the additional kill of `recent_work_context` is the 2026-05-17 follow-up that takes the surface to 7. Matches `project_v15_cleanup_pause` framing (reduce-or-clarify; AC3's re-export shim shape is the "clarify" half today, "reduce" lands in the follow-up).

**Why this item ships RC2 as one coherent merge instead of N small ones:** the four pieces are tightly coupled. Killing `tail_session` requires `echo_resolve_mru` to exist (otherwise the compound modes lose their replacement). Killing `recent_work_context` requires factoring the cluster engine into a shared helper (otherwise `find_clusters` breaks). Unbundling `wait_for_new_turns` requires the DRY'd `exclude_metadata_surface` helper to land (the new bodyless path is cleaner if it uses the helper from line 1). Splitting into N items would create a fake-dependency item chain that has to land in order anyway.

# Goal

After 038 ships, the MCP toolkit surface is **8 tools** — same count as today, but with `tail_session` removed and `echo_resolve_mru` added (net-zero structural reform); `recent_work_context` stays registered until the 2026-05-17 follow-up (R2 correction Codex HIGH #1, founder declined override). The follow-up takes the surface to **7 tools**.

| Tool | Operation | Bodies? | Surface change |
|---|---|---|---|
| `echo_ping` | Health | n/a | unchanged |
| `find_clusters` | Discovery: group atoms by shared artifacts → cluster skeletons (IDs only) | NO | unchanged (already correct shape; internally rewires to use the new internal cluster engine per AC3) |
| `search_memories` | Discovery: substring/source/time/repo filter → matched atoms with bodies | yes (cost-bounded projection) | **expanded** — new `source` (exact), `metadata_match` (whitelisted), 3-way precedence per AC0 |
| `recent_work_context` | Discovery: clusters + atoms in one call (deprecated wrapper) | yes | **unchanged in 038** — STAYS registered until 2026-05-17 follow-up per R2 Codex HIGH #1 + founder no-override choice (R3 correction Cursor #1 — table previously missing this row) |
| `echo_resolve_mru` | Discovery: resolve newest source(s) under a predicate → search-ready descriptors per source (NOT bare paths) | NO | **new** |
| `wait_for_new_turns` | Subscription: block until new atoms match a predicate → IDs only | **NO** (changed) | unbundle bodies; caller composes `get_atoms`/`get_atom` for fetch |
| `get_atoms` | Projection: ≤50 IDs → cost-bounded summary bodies | yes (projected) | unchanged |
| `get_atom` | Projection: 1 ID → verbatim content body | yes (verbatim) | unchanged |

Total rows: **8** — matches the spec's "8 tools during 038's window" claim (R3 correction Cursor R3 #1; previously the table had 7 rows, missing `recent_work_context`). After the 2026-05-17 follow-up: 7 rows (recent_work_context row deleted).

**Composable workflows the new shape supports** (each is one or two atomic calls, no e2e wrapper) — R3-corrected to use the post-R2 descriptor + post-R3 exact-source shapes (Codex R3 LOW #5):

- "Where did I leave off in cursor for this repo" = `r = echo_resolve_mru({sources: ['cursor'], repo_path: X})` → `d = r.sources['cursor']` → `search_memories({source: d.source, ...d.filter, limit: 5})`
- "Tail an exact session" = `search_memories({source: X, limit: N})` (using AC0's new exact `source` filter — NOT `source_prefix`)
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

1. Add `source?: string` to `SearchMemoriesParams`. Zod: `z.string().optional()`. When set, forwards to `storage.query({source: source, ...})` for exact-source matching. **R2 correction — 3-way precedence (Cursor R2 #1):** all three of `source`, `source_prefix`, `source_app` are independently optional and may co-occur. Precedence (more-specific wins): `source` (exact) > `source_prefix` (LIKE) > `source_app` (LIKE on canonical app prefix). Document the precedence in the tool description. The `next_cursor` composite-cursor pagination (timestamp+id) is source-agnostic and works identically with the new `source` filter — tests verify pagination on a single exact-source query (R2 correction — Cursor R2 #6).
2. Add `metadata_match?: Record<string, string>` to `SearchMemoriesParams`. Zod: `z.record(z.string(), z.string()).optional()`. Forwards to `storage.query({metadata_match: <merged>, ...})`. **Storage seam enforces the whitelist** (`METADATA_MATCH_KEY_WHITELIST` already there per 035 + 037 extension).
3. **R2 correction — merge precedence with 037's `repo_path` (Codex R2 #3).** 037's AC4 maps `repo_path` to `metadata_match: {repo_root: normalize(repo_path)}` inside the tool body. AC0's `metadata_match` parameter is a separate caller input. Merge rule: forwarded `metadata_match` = input `metadata_match` ∪ `{repo_root: normalize(repo_path)}` when both are passed. **Conflict on the `repo_root` key (caller passed BOTH `repo_path` AND `metadata_match: {repo_root: ...}` with different values) → isError** with message `search_memories: metadata_match.repo_root conflicts with repo_path; pass one or the other`. Document that the **Cursor Phase 2 fallback path (via AC1's `cursor_phase2`) MUST NOT pass `repo_path`** — it uses only `metadata_match: {composer_id: ...}` because the legacy atom is being recovered precisely because it lacks `metadata.repo_root` (it predates 037's AC1).
4. **Tool-layer isError on non-whitelisted keys (R1 refinement — Cursor #1).** Before calling `storage.query`, the tool handler validates: every key in `metadata_match` must be in `METADATA_MATCH_KEY_WHITELIST`. Non-whitelisted key → MCP isError envelope. **R2 correction — dynamic whitelist (Cursor R2 #7):** error message uses `` `search_memories: metadata_match contains non-whitelisted key '${key}'; allowed: ${Array.from(METADATA_MATCH_KEY_WHITELIST).join(', ')}` `` — interpolated from the constant so the message can never drift if the whitelist is extended. This is **defense-in-depth on top of** the storage-seam whitelist; the tool-layer check produces a clean, source-attributed error rather than letting the storage error bubble up unattributed.
5. `query_echo` block surfaces both new fields: `source: string | null` + `metadata_match: Record<string, string> | null`. Caller can verify which filters fired.
6. Description string update: extend `SEARCH_MEMORIES_DESCRIPTION` to document the new parameters + the 3-way precedence rule + the composition patterns they unlock (`echo_resolve_mru → search_memories(source=<resolved>, metadata_match=<descriptor.filter>)` for tail; the explicit Cursor Phase 2 fallback shape).
7. **Scope-bound (R1 refinement — Cursor #2):** `metadata_match` is exposed ONLY on `search_memories` in 038. NOT on `find_clusters` or `wait_for_new_turns`. Those tools today don't need it; widening their surface for a hypothetical future need is YAGNI.
8. Tests: at least 10 unit tests — (a) `source` exact match filters correctly; (b) `source_prefix` + `source` together: `source` wins; (c) `source_app` + `source_prefix` + `source` together: `source` wins; (d) `metadata_match: {composer_id: X}` filters correctly; (e) `metadata_match` with non-whitelisted key returns isError with dynamically-interpolated whitelist message; (f) `query_echo` carries both new fields; (g) backward compat — calls without the new parameters behave identically to today; (h) **`repo_path` + `metadata_match: {repo_root: <conflicting>}` → isError** (R2 #3 test); (i) `repo_path` + `metadata_match: {composer_id: X}` → merged correctly (no conflict, both flow to storage); (j) **pagination test: `next_cursor` works across `source` exact-filter query** (R2 #6 test).

### AC1 — Add `echo_resolve_mru` primitive

**Surface:** new file `src/mcp/tools/echo-resolve-mru.ts`; registered in `src/mcp/server.ts`.

**Contract:**

1. Input shape (Zod schema) — **R1 correction (Cursor R1 #5)**: collapsed to single input axis `sources: string[]` (no `source_app` parameter). This matches `wait_for_new_turns.ts:108` `resolveSources` exactly — entries can be either source-app names (`'cursor' | 'claude_code' | 'codex' | 'git'`) → PREFIX MATCH, OR literal source paths → EXACT match. Single axis avoids the "every retrieval tool has a different what-sources parameter" anti-pattern.
   - `sources: string[]` — required, non-empty, ≤ 8 (R3 justification, Cursor R3 #4: cap mirrors `wait_for_new_turns.ts:~108` `resolveSources` exactly so the two retrieval primitives compose with the same shape limits; a single `echo_resolve_mru` call piped into a single `wait_for_new_turns` call has identical max-source semantics in both halves). Mixed entry types accepted (same parsing as `wait_for_new_turns`'s `resolveSources`).
   - `repo_path?: string` — optional repo-scoping filter; absolute path; mirrors 037's contract (normalize via the shared `normaliseRepoPath` helper exported from `cursor-workspace-resolver.ts`). When set, only sources whose newest non-fs atom carries `metadata.repo_root === normalize(repo_path)` are eligible.
2. **Output shape — search-ready descriptor per resolved source (R2 + R3 corrections, Codex R2 HIGH #2 + Codex R3 MED #3/#4).** The original R1 spec returned bare source paths; that loses repo/composer filter context, leading to cross-repo leak when `search_memories(source=<resolved>)` is called for Cursor (whose resolved source is the global `state.vscdb`). The R2 fix returned a search-ready descriptor; R3 corrections clarify: **descriptor is `search_memories`-ready ONLY** (NOT `wait_for_new_turns`-ready because AC0 deliberately scopes `metadata_match` to `search_memories`); **null when no eligible atoms**, NOT a partial descriptor.
   ```
   {
     sources: Record<string, ResolvedSourceDescriptor | null>,
     repo_path?: string,
     warnings: string[]
   }
   
   type ResolvedSourceDescriptor = {
     source: string,                              // resolved source path
     filter: {                                    // exactly the additional filters
       metadata_match?: Record<string, string>,   //   the caller MUST pass through
       repo_path?: string,                        //   to search_memories/wait_for_new_turns
     },                                           //   to preserve scoping
     phase?: 'cursor_legacy'                      // present ONLY when Phase 2 fired and
                                                  // returned a non-null composer_resolved
   };
   ```
   - `sources` keys are the input strings verbatim. Values are the descriptor or null when no eligible atoms exist.
   - For most source_apps (claude_code, codex, git): the descriptor's `filter` is `{repo_path: <input>}` when input had `repo_path`, otherwise `filter: {}`. The `source` value alone is unique to the session JSONL or git repo path, so no metadata_match is needed.
   - For Cursor Phase 1 (post-AC1 metadata.repo_root resolution): `filter: {repo_path: <input>}` — same as other apps. The resolved source IS the global state.vscdb but `repo_path` carries through and `search_memories`'s metadata_match filter at the next call site closes the leak.
   - For Cursor Phase 2 (legacy composer_id fallback): `filter: {metadata_match: {composer_id: <composer_resolved>}}` (no `repo_path` — per AC0 contract #3, legacy atoms lack `metadata.repo_root`); `phase: 'cursor_legacy'`.
3. **R2 + R3 corrections — `phase` field semantic (Cursor R2 #5 + Codex R3 #4).** When BOTH Phase 1 returns 0 atoms AND Phase 2 returns null (no `composer_resolved`), there is no eligible source — the entry's slot in `sources` map is `null` (no descriptor object at all). When Phase 1 returns 0 AND Phase 2 returns a non-null `composer_resolved`, a descriptor IS built with `phase: 'cursor_legacy'`. When Phase 1 returns atoms (descriptor built from Phase 1), `phase` is absent. **The `phase` field never coexists with a null slot — if there's no descriptor, there's no field; if there's a descriptor, `phase` is either present-as-`'cursor_legacy'` or absent.** Mirrors 037 AC6 R1's `composer_resolved` invariant verbatim.
4. **Mechanism — split per input entry type (R2 correction Codex R2 #4):** 
   - Input entry is a **source-app name** (`'cursor' | 'claude_code' | 'codex' | 'git'`) → resolve via `source_prefix` LIKE on `buildSourceAppMap()[entry]`, return the newest non-fs atom's `source` field as the descriptor.
   - Input entry is a **literal source path** (anything else) → resolve via `source` exact match (using AC0's new exact filter), return that source if any non-fs atom exists for it. This mirrors `wait_for_new_turns.ts:108` `resolveSources` exactly.
   In both cases the query uses `exclude_metadata_surface: ['fs']` via the AC5 shared helper, plus `metadata_match: {repo_root: normalize(repo_path)}` when `repo_path` is set.

4a. **Git source — port 037's two-path OR fallback (R3 correction Codex R3 #2).** 037 AC6 Note 2 added a two-path OR for git sources to `tail_session` so legacy git atoms captured before AC1 (with `source='git:<repo>'` but no `metadata.repo_root`) remain discoverable. Killing `tail_session` without porting this OR would silently regress that recovery path. **For input entries that resolve to the git source_app prefix AND `repo_path` is set**, `echo_resolve_mru` runs TWO queries and unions the results by atom `id`:
   - Query A: `storage.query({source_prefix: '<git prefix>', metadata_match: {repo_root: normalize(repo_path)}, exclude_metadata_surface: ['fs'], limit: 1})` — recovers post-AC1 git atoms.
   - Query B: `storage.query({source: 'git:' + normalize(repo_path), exclude_metadata_surface: ['fs'], limit: 1})` — recovers legacy git atoms by exact-source encoding.
   If EITHER query returns a row, the descriptor is built:
   - If Query A wins (newest by timestamp tie-break): `{source: <row.source>, filter: {repo_path: normalize(repo_path)}}`.
   - If Query B wins or only Query B returned: `{source: 'git:' + normalize(repo_path), filter: {}}` — no metadata_match needed because the source path itself is the scoping predicate. The caller's downstream `search_memories(source=desc.source, ...desc.filter)` then matches exactly that source's atoms (no cross-repo leak — the source path encodes the repo). 
   This mirrors 037 AC6 Note 2's "OR is implemented by issuing two storage queries and UNIONing at the tool layer; dedup by atom id" verbatim. New test added to AC1 #7: fixture with one legacy git atom (source-only) and one post-AC1 git atom (metadata.repo_root) — both must be recoverable via `echo_resolve_mru(sources=['git'], repo_path=X)`.
5. **Cursor branch parity (037 cooperation):** when an input entry resolves to the Cursor source_app AND `repo_path` is passed, mirror 037's AC6 two-phase semantics — Phase 1 by `metadata.repo_root` directly; Phase 2 falls back to `resolveCursorComposerForRepoPath(repo_path)` only when Phase 1 returns 0 atoms. The descriptor `filter` field encodes which phase was used (Phase 1 → `repo_path`; Phase 2 → `metadata_match.composer_id`). Predicates are NEVER ANDed across phases.
6. **Tools/list description:** explicitly state this is an IDs-only primitive — bodies are NOT fetched here. The descriptor is **`search_memories`-ready only** (R3 correction Codex #3 — `wait_for_new_turns` doesn't accept `metadata_match`). Document the canonical composition patterns:
   - **Tail (`search_memories`):** `r = echo_resolve_mru({sources: ['cursor'], repo_path: X})` → if `r.sources['cursor'] !== null`, then `search_memories({source: desc.source, ...desc.filter, limit: N})`. The spread `...desc.filter` carries through `repo_path` or `metadata_match` cleanly without the caller needing to know which phase fired.
   - **Live watch (`wait_for_new_turns`):** the descriptor's `source` is usable directly: `wait_for_new_turns({sources: [desc.source], repo_path: desc.filter.repo_path, since: now})`. The descriptor's `filter.metadata_match` (Phase 2 composer_id) is NOT applicable to `wait_for_new_turns` — for legacy Cursor atoms via wait, the caller would instead poll `wait_for_new_turns` against the global Cursor source and post-filter client-side, or accept that the live-watch path doesn't recover legacy atoms (which by definition are not new turns anyway — legacy = pre-AC1 captured, already in storage). This is the deliberate scoping decision: `metadata_match` lives only on `search_memories` per AC0 contract #7.
7. Tests: at least 15 unit tests (R3 correction Cursor R3 #5 — count reflects enumerated cases) — 8 matrix cases: (each of 4 source_app names as `sources` entries) × {with, without} repo_path; one fresh-Cursor-composer Phase 1 test (asserts `desc.filter.repo_path` is set, `desc.phase` is absent); one legacy-Cursor-atom Phase 2 test (asserts `desc.filter.metadata_match.composer_id` is set, `desc.phase === 'cursor_legacy'`, and `desc.filter.repo_path` is absent — per Cursor R2 #5); one **Phase-2-attempted-but-empty** test (Phase 1 returns 0 atoms AND Phase 2 returns null → `r.sources['cursor'] === null` (whole slot null, no descriptor object) — per R3 Codex #4); one mixed-input-type `sources=['cursor', 'claude_code', 'fs:/Users/.../session.jsonl']` test confirming app-name vs literal-path mechanism split (R2 Codex #4); one validation test (empty `sources` array → isError); one absolute-path validation for `repo_path`; **one end-to-end composition test asserting `echo_resolve_mru → search_memories(source=desc.source, ...desc.filter)` recovers only atoms from the specified repo** (Codex R2 HIGH #2 closure); one **git two-path OR test** (R3 Codex #2 closure): fixture with one legacy git atom (`source='git:/X'`, no `metadata.repo_root`) + one post-AC1 git atom (`metadata.repo_root=/X`) — assert `echo_resolve_mru(sources=['git'], repo_path='/X')` returns a descriptor that points at one of them (the newest by timestamp; the OTHER path's row is reachable via subsequent search_memories from the descriptor); one **git two-path OR null test** (no eligible git atoms for repo `/Y` → `r.sources['git'] === null`); one **registered-handler integration test** (per AC3 contract #8 (b)) verifying `recent_work_context` MCP tool still works post-038 — placed in this AC1 list because the test exercises the cross-AC contract (AC1's new tool registered alongside the AC3-preserved tool).
8. **R1 refinement — Cursor R1 #8:** fixture atoms in the test set MUST include `metadata.repo_root` populated per 037's AC1 capture-side contract for at least 2 source_apps (claude_code + codex), to exercise the 037 cooperation path end-to-end. A Cursor fresh-composer fixture should also write `metadata.repo_root` (per 037's AC1 file-walk fallback).

### AC2 — Kill `tail_session`

**Surface:** delete `src/mcp/tools/tail-session.ts` + its test file; remove `registerTailSession` import + call from `src/mcp/server.ts:12`.

**Contract:**

1. The exact-source mode (`tail_session({source: X, count: N})`) replaces to `search_memories({source: X, limit: N})` using **AC0's new exact-source filter** (R1 correction). The semantics are now identical: descending by timestamp, projected bodies via `projectMatch`, cursor-pagination via `next_cursor`, exact source-string match (NOT prefix LIKE — that was the R1 bug).
2. **The compound modes** (`source_app`, no-args fallback, repo_path resolution) are replaced by the **descriptor-spread composition pattern (R2 correction Codex HIGH #2):**
   ```
   const r = await echo_resolve_mru({sources: [X], repo_path: Y});
   const desc = r.sources[X];
   if (desc !== null) {
     await search_memories({source: desc.source, ...desc.filter, limit: N});
   }
   ```
   The `...desc.filter` spread carries through `repo_path` or `metadata_match` cleanly without the caller needing to know which Cursor phase fired. **Cross-repo leak (when resolved Cursor source is the global `state.vscdb`) is closed** because the descriptor includes the repo/composer scoping filter the caller must spread through.
3. **The Cursor Phase 2 legacy fallback** (037 AC6) is integrated into the same composition shape: AC1 returns a descriptor with `filter: {metadata_match: {composer_id: <resolved>}}` and `phase: 'cursor_legacy'`; the caller's `...desc.filter` spread automatically applies the composer_id filter. The R2 patch closes the R1-identified gap where the kill-tail_session decision originally lost this filter, AND the R2 Codex HIGH #2 gap where the bare `source` composition leaked cross-repo for fresh Cursor atoms.
4. `tools/list` no longer advertises `tail_session`. Callers receiving a missing-tool error from an MCP client SDK update.
5. Any internal callers of `tailSession()` function (verify none today): N/A — this tool is only consumed via the MCP protocol surface. The `searchMatchSchema` import from `tail-session.ts` (used by callers) is moved to `search-memories.ts` where it originated (cross-check `search-memories.ts:211` — schema actually lives there; tail just re-exported. So this is a no-op on the consumer side except for the import-path bookkeeping). **R1 refinement — Cursor R1 #9:** pre-merge grep-verify: `grep -rn "from.*['\"].*tail-session" src/` returns zero hits before the merge ships.
6. **R2 correction — generalized grep scope (Cursor R2 #2):** instead of enumerating specific files (`wait-for-new-turns.ts:44, 53`, `get-atoms.ts:36`), the contract is: `rg "tail[_-]session" src/mcp/` MUST return zero hits before the merge ships. This catches description-text references in any sibling tool file the spec author might miss, including post-AC1 description-text in the new `echo-resolve-mru.ts`. Add this as a pre-merge checklist line.
7. Tests: 0 new unit tests (removal is structural); 1 integration test asserts `tools/list` no longer contains `tail_session`; 1 integration test asserts the new descriptor-spread composition (`echo_resolve_mru → search_memories(source=desc.source, ...desc.filter)`) recovers the same atoms today's `tail_session(source_app=X, repo_path=Y)` does on a fixture set spanning multiple repos (Codex R2 HIGH #2 closure: assert no cross-repo leak).

### AC3 — Factor cluster engine into shared internal helper; `recent_work_context` MCP tool registration STAYS (Codex R2 HIGH #1)

**R2 correction context (Codex R2 HIGH #1, founder confirmed no override).** R1 deferred file deletion to 2026-05-17 follow-up but still removed the MCP-tool registration in 038. Codex R2 pushed back: **the 031 gate covers removal of the TOOL (the MCP-surface registration), not just the file.** Removing the registration 6 days early is the same gate violation as deleting the file early. Founder explicitly said "no override for now" at ~20:11 PDT 2026-05-11. So both the registration AND the file deletion defer to the 2026-05-17 follow-up. 038's scope is now pure internal refactor: factor out the cluster engine, leave EVERYTHING user-visible about `recent_work_context` in place.

**Surface:** new internal file `src/mcp/internal/cluster-engine.ts` (canonical home for the cluster discovery engine); rewrite `src/mcp/tools/find-clusters.ts:190` to call the new internal helper directly; turn `src/mcp/tools/recent-work-context.ts` into a re-export shim (~15-25 lines per R3 Codex #1 correction — must re-export `registerRecentWorkContext` + schemas + description, not just `getRecentWorkContext`) that wraps the new internal engine and preserves the MCP-tool registration handler unchanged.

**Contract:**

1. The cluster discovery engine (today the body of `getRecentWorkContext` in `recent-work-context.ts:~143–479`: time-window resolution, fs-exclusion, no-args 4h→24h auto-expand, cluster building via `src/trace/cluster.ts`, single-source-recent demotion via `rankClusters`, warnings, **AND the `repo_path` → `metadata_match: {repo_root}` forwarding added by 037's AC4 at line ~379**) is **moved** to a new internal module at `src/mcp/internal/cluster-engine.ts`. This is the canonical home going forward. The engine is NOT exposed as an MCP tool; it's a strategy-internal helper.
2. **R1 correction (Cursor R1 #4):** the cluster-engine factor-out MUST inherit 037's repo_path forwarding verbatim. The new internal engine accepts the same `repo_path?: string` parameter (already normalized by the calling tool) and threads it as `metadata_match: {repo_root: repo_path}` into its internal `storage.query` call. Without this, 038 silently regresses `find_clusters(repo_path=X)` to global behavior.
3. `find_clusters.ts:190` rewrites the call from `getRecentWorkContext(...)` to the new internal helper. The wire-level `find_clusters` tool surface (input shape, output shape, warnings, including the `repo_path` parameter added by 037) is unchanged — only the internal callee changes.
4. **`recent_work_context` MCP tool registration STAYS unchanged in `server.ts`.** `tools/list` continues to advertise `recent_work_context` / `get_recent_work_context` exactly as it does today. The deprecation message in the description string also stays. This is the load-bearing R2 correction.
5. **R2 + R3 corrections — shim shape preserves ALL public exports (Cursor R2 #3 + Codex R3 #1).** The file `src/mcp/tools/recent-work-context.ts` is rewritten as a thin re-export shim (~15-25 lines, not strictly ≤10 — R3 correction Codex #1 caught that the shim must preserve more than just one export). **The shim MUST continue to export every symbol that lives in the file today, including the MCP-tool registration handler:**
   - `getRecentWorkContext` function (called by `find-clusters.ts`) → re-exported from `src/mcp/internal/cluster-engine.ts`.
   - `registerRecentWorkContext` (called by `server.ts:10` to register the MCP tool) → STAYS in the shim file as a thin wrapper that imports `getRecentWorkContext` from the engine and binds it to the existing MCP-tool registration handler. Schemas (input + output Zod) and description string also live in the shim — they're part of the MCP-tool surface, not the cluster engine.
   - `hasTzMarker`, `TZ_NAIVE_WARNING` re-exports (lines 343-345 in the current file) → continue to re-export from `src/mcp/util/iso8601.ts`.
   The split: cluster engine internals (~340 lines of time-window logic, auto-expand, ranking, fs-exclusion, repo_path forwarding) move to `src/mcp/internal/cluster-engine.ts`. The MCP-tool wrapper (~15-25 lines: handler signature, Zod schemas, description, isError envelope handling, registration call) stays in `src/mcp/tools/recent-work-context.ts`. The 2026-05-17 follow-up deletes the wrapper file + the `server.ts` registration call + any wiki entries. The internal engine survives the follow-up (still used by `find_clusters`).
6. **R2 correction — follow-up filing moved to strategist scope (Cursor R2 #4):** the 2026-05-17 follow-up item creation is moved out of AC3's builder scope and into the **After Completion (Strategist Notes)** section of this spec (task #6 below). Per CLAUDE.md / AGENTS.md role split, builder agents are bounded to AC scope; strategist files follow-up backlog items post-merge. The strategist drafts the follow-up's founder-consent receipt section from journal evidence (zero `get_recent_work_context` calls since 2026-05-09).
7. All public exports from `recent-work-context.ts` that other modules depend on (verify by `grep -rn "from.*recent-work-context"`) are preserved by the re-export shim:
   - `getRecentWorkContext` function → defined in internal engine, re-exported from the shim
   - `hasTzMarker` re-export at line 344 → already comes from `src/mcp/util/iso8601.ts`; shim continues to re-export
   - `TZ_NAIVE_WARNING` re-export → same as above
8. Tests: existing `recent-work-context.test.ts` tests are renamed and re-rooted on the new internal engine — they test the same behavior (auto-expand, demotion, fs-exclusion, **and 037's repo_path forwarding**), just at a different seam. **The shim itself gets ≥2 integration tests (R3 correction Cursor R3 #2):**
   - **(a)** `getRecentWorkContext` called through the shim produces identical output to calling the internal engine directly (regression guard for the 2026-05-17 follow-up).
   - **(b) NEW — MCP-tool-registration handler integration test:** invoke the registered handler (via `server.test` infrastructure or equivalent — same shape as today's tool-registration tests for other tools) and assert: `tools/list` advertises `recent_work_context`/`get_recent_work_context` with the unchanged description string; calling the tool through the registered handler returns the same `RecentWorkContextResponse` shape as before 038 (including all warnings + envelope fields). This closes the R3 finding that R2's "function-call parity" tests didn't exercise the registered-handler path that `server.ts:10` consumes — which is the load-bearing surface for the 031 gate.
   `find_clusters.test.ts` gets one additional test asserting the internal engine integration works end-to-end with the same shape, including a regression test for `find_clusters({repo_path: X})` returning identical results to post-037 behavior.

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
4. Tests: 1 unit test asserting the helper's output shape matches today's hardcoded `{exclude_metadata_surface: ['fs']}`. PLUS **1 grep-scan integration test (R1 refinement — Cursor R1 #7; R2 scope + regex corrections)**: a test that scans **`src/mcp/**/*.ts`** (R2 correction Codex #5 — extends scope from `tools/*.ts` to include `src/mcp/internal/cluster-engine.ts` and any future internal module) excluding the helper file itself by filename, applying the **regex `/\bexclude_metadata_surface\s*:\s*\[/`** (R2 correction Cursor R2 #8 — catches single-quote, double-quote, no-space, and multi-element variants that a literal-string match would miss) and FAILS if any hit is found. Closes the structural-impossibility loop: the Bug B regression (a new tool or internal module ships re-hardcoding the constant in any syntactic variant) is now caught by CI, not by post-merge dogfooding.

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

- **Suggested commit shape (R3 reordered, post-stale-claim sweep):** 6 commits — (a) AC5 DRY helper + grep-scan regex test (smallest, lands first as foundation); (b) **AC0 `search_memories` source + metadata_match expansion** (R1 addition; foundation for AC2's composition replacement); (c) AC1 `echo_resolve_mru` + descriptor + git two-path OR + tests (depends on AC0 + AC5); (d) AC3 cluster engine factor-out + `find_clusters` rewrite + `recent_work_context` re-export shim (REGISTRATION STAYS per R2 + R3 Codex HIGH); (e) AC2 delete `tail_session` + `rg "tail[_-]session" src/mcp/` zero-hits cleanup + tests; (f) AC4 unbundle `wait_for_new_turns` + tests. Each commit independently passes `npm test`, lint, typecheck.
- **AC3 is the largest engineering item.** The cluster engine in `recent-work-context.ts:~143–479` is ~340 lines tightly coupled to its public function signature. Factor-out requires: pulling out the time-window-resolution + cluster-build + rank pipeline as an internal helper; routing today's 2 callers (`find-clusters.ts:190` + the now-removed MCP tool wrapper) cleanly. The single-source-recent demotion (item 032) and no-args auto-expand semantics MUST be preserved verbatim — the new internal helper has the same behavior, just a different module boundary.
- **AC1 + AC2 are bounded by AC3's completion.** `echo_resolve_mru` is the replacement for `tail_session`'s compound modes; both can be specced independently but the builder should land AC3's factor-out first to ensure no shared cluster-engine state gets re-imported into the new resolver.
- **No new dependencies.** Everything is internal refactor + one new MCP tool registration. The `node:path` + Zod + storage-interface imports are all already present.
- **The journal-write race condition** flagged in the coordination-layer deferral note (raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md) is NOT load-bearing here — 038 doesn't touch shared journal files in any new way. Standard "chain verify → pandoc → git add → commit → push" discipline applies as today.
- **Migration ergonomics:** the AC2 description-text cleanup in sibling tools (wait-for-new-turns.ts:44, 53; get-atoms.ts:36) is small and easy to miss. Reviewer should grep `tail_session` across `src/mcp/tools/` after the diff to confirm zero references survive.

# After Completion (Strategist Notes)

1. **Wiki promotion (post-merge, after dogfooding lands):**
   - Update `wiki/surfaces/mcp-server.md` — toolkit shape after 038 is 8 tools; after the 2026-05-17 follow-up it becomes 7. Document `echo_resolve_mru` as the canonical MRU resolver (returns search-ready descriptors, not bare source paths); document the IDs-only contract on `wait_for_new_turns`; document the descriptor-spread compose pattern (`echo_resolve_mru → search_memories(source=desc.source, ...desc.filter)`) explicitly.
   - DELETE `wiki/surfaces/mcp-tail-session.md` (if it exists post-035 promotion). The tool is gone.
   - Add a new principle page candidate: `wiki/principles/atomic-primitives-compose.md` — the principle that surfaces from this work, explicitly contrasted with e2e tools.
2. **The post-038 toolkit IS the V1 vocabulary going forward.** Any new MCP tool proposal must justify why it can't be expressed as a 1-2 call composition of the existing 7-8 tools. The bar is high — every additional tool grows the journal-discipline cost across all MCP clients.
3. **M1-2 (semantic ranking) is the next strategic conversation.** With RC1 (037) and RC2 (038) shipped, the remaining V1.5/1.6 substrate gap is search-ranking. Per founder direction "saved till the end" — strategist drafts the M1-2 item after both 037 + 038 are live + dogfooded for ≥1 week.
4. **If the post-038 dogfooding surfaces a "I keep needing 3 MCP calls where 1 used to do it"** signal, file as evidence for re-adding a convenience wrapper in a future item. Today's analysis says composition is fine; empirical use is the falsifier.
5. **Capture-side mid-stream invisibility (Issue #3 in the journal)** remains the unsolved adjacent gap. All three strategists endorsed "acceptable for V1.5/1.6"; revisit when the founder's daily workflow is bitten enough to overflow the journal cadence.
6. **File the 2026-05-17 follow-up item (R2 correction Cursor R2 #4 — moved from AC3 builder scope to strategist scope).** Per CLAUDE.md / AGENTS.md role split, the builder agent's AC scope is bounded; follow-up item creation is strategist work post-merge. Concretely, the strategist writes `backlog/ready/2026-05-17-XXX-recent-work-context-final-removal.md` on or after the calendar gate (or earlier on founder explicit override) covering:
   - Delete the ≤10-line re-export shim at `src/mcp/tools/recent-work-context.ts`.
   - Remove `recent_work_context` MCP-tool registration from `src/mcp/server.ts`.
   - Remove `recent_work_context` from `tools/list` advertisements + any wiki entries.
   - **Founder-consent receipt section** (Cursor R1 refinement #3 format): cite original 031 gate criterion (≥1 week post-030 dogfooding), empirical signal (zero `get_recent_work_context` calls in journal since 2026-05-09, confirmed by grep across `raw/internal/dogfooding/mcp-interactions-journal.md` at draft time), and decision date.
   - Cross-tool R1 review pattern for the follow-up (same as 037/038) — even though it's a tiny removal item.

# Cross-tool review checklist (pre-claim)

- [ ] Does the AC1 `echo_resolve_mru` Cursor branch correctly mirror 037's two-phase semantics? (No predicates ANDed; `composer_resolved` surfaced only when Phase 2 fires; matches 037's AC6 contract verbatim.)
- [ ] After AC3's factor-out, does `find_clusters` still produce identical output to today's wrapper-over-`recent_work_context`? (Same 5-key rank chain, same no-args auto-expand, same single-source-recent demotion. Pure module-boundary refactor; zero behavior change.)
- [ ] Does the diff respect Out-of-Scope rule #1 (no M1-2 ranking bleed-through)?
- [ ] Does the diff respect Out-of-Scope rule #7 (no parallel-vocabulary deprecation for `tail_session` — it's GONE in this merge, not deprecated)?
- [ ] **R2 check:** does the diff leave `recent_work_context` MCP tool registration UNCHANGED in `server.ts`? (R2 Codex HIGH #1 — registration removal defers to the 2026-05-17 follow-up; only the cluster engine internals factor out, file becomes ≤10-line shim.)
- [ ] **R2 check:** does the diff change `echo_resolve_mru`'s output from bare source paths to search-ready descriptors `{source, filter, phase?}`? (R2 Codex HIGH #2 — bare source loses cross-repo scoping for Cursor.)
- [ ] **R2 check:** does `rg "tail[_-]session" src/mcp/` return zero hits after AC2 lands?
- [ ] **R2 check:** does `rg '\bexclude_metadata_surface\s*:\s*\[' src/mcp/ --glob '!src/mcp/util/fs-exclusion.ts'` return zero hits (AC5 grep-scan working correctly)?

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

## R2 — 2026-05-11 ~20:40 PDT (Codex) + ~20:45 PDT (Cursor) — patched 2026-05-11 ~20:55 PDT by strategist

Cross-tool R2 review against the R1-patched 038 spec (commit `73b7e4a`, on origin/main as of 037's merge push). Codex + Cursor each ran independent reads. Combined: **14 findings dispositioned (2 HIGH architectural from Codex + 12 MED/LOW from both)**.

**Sources:**
- Codex R2: rollout `019e1955` asst #28 (6 findings — 2 HIGH + 2 MED + 2 LOW; verdict: pushback)
- Cursor R2: composer `459e6f6d` bubble `54cb48a8` (8 findings — 5 MED + 3 LOW; verdict: narrow pushback / PROCEED-after-patches)

**Findings dispositioned:**

| # | Severity | Source | Finding | Spec patch |
|---|---|---|---|---|
| 1 | **HIGH** | Codex R2 #1 | AC3 still removes `recent_work_context` from `tools/list` — but the 031 gate covers removing the TOOL (the MCP-surface registration), not just the file. Founder declined override at 20:11 PDT. R1's split was wrong; registration removal is the same gate violation as file deletion. | AC3 rewritten: 038's scope is now pure internal cluster-engine factor-out. `recent_work_context` MCP-tool registration STAYS in `server.ts`. The file becomes a ≤10-line re-export shim (Cursor R2 #3 shape). 2026-05-17 follow-up does the actual TOOL removal + shim deletion. Goal section + spec_refs + Context updated to reflect 8 → 8 tool count during 038's window (kill tail_session is offset by add echo_resolve_mru); follow-up takes it to 7. |
| 2 | **HIGH** | Codex R2 #2 | AC1 + AC2 composition (`echo_resolve_mru → search_memories(source=<resolved>)`) drops repo/composer scoping after MRU resolution. For Cursor, resolved source is the global `state.vscdb` — bare source filter leaks atoms from other repos. Today's `tail_session` applies `metadata_match` after MRU resolution; the new composition lost that. | AC1 output rewritten as **search-ready descriptor** `{source, filter: {metadata_match?, repo_path?}, phase?: 'cursor_legacy'}` per resolved source. AC2 composition becomes `search_memories({source: desc.source, ...desc.filter, limit: N})` — the `...desc.filter` spread carries repo/composer scoping through cleanly. Cross-repo leak structurally impossible. New end-to-end composition test added to AC1 #7. |
| 3 | MED | Codex R2 #3 | AC0 `metadata_match` parameter + 037's `repo_path` (also maps to `metadata_match: {repo_root}`) both write to same `QueryFilter` field. Merge precedence undefined. | AC0 contract #3: merge inputs (`metadata_match` ∪ `{repo_root: normalize(repo_path)}`); conflict on `repo_root` key → isError; document that Cursor Phase 2 path NEVER passes `repo_path`. Two new tests added to AC0 #8 (conflict isError + non-conflicting merge). |
| 4 | MED | Codex R2 #4 | AC1 said literal `sources[]` entries are exact, but mechanism described prefix querying for all. | AC1 contract #4: explicit split per `wait_for_new_turns`: source-app names → `source_prefix` LIKE; literal paths → `source` exact (via AC0's new exact filter). One new mixed-input-type test added to AC1 #7. |
| 5 | MED | Cursor R2 #1 | AC0 `source` vs `source_prefix` vs `source_app` three-way precedence unspecified. | AC0 contract #1: explicit 3-way precedence (`source` > `source_prefix` > `source_app`, more-specific wins); all three permitted on one call. New 3-way precedence test added to AC0 #8. |
| 6 | MED | Cursor R2 #2 | AC2 grep scope enumerated 3 files; sibling description-text references in `find-clusters.ts`, `search-memories.ts`, etc. could miss the cleanup. | AC2 contract #6: generalize to `rg "tail[_-]session" src/mcp/` zero-hits predicate. Single regex catches any sibling-file reference. |
| 7 | MED | Cursor R2 #3 | AC3 "no-op shell" ambiguous: file keeps cluster code (340 lines) vs file becomes shim (≤10 lines). Choice (a) makes the 2026-05-17 follow-up much harder. | AC3 contract #5: explicit choice (b) — canonical home is `src/mcp/internal/cluster-engine.ts`; `recent-work-context.ts` becomes a ≤10-line re-export shim. 2026-05-17 follow-up deletes the shim + the MCP registration in one stroke. |
| 8 | MED | Cursor R2 #4 | AC3 #6 asked the builder to file the 2026-05-17 follow-up backlog item — violates CLAUDE.md role split (strategist files follow-ups post-merge; builder is bounded to AC scope). | AC3 contract #6 rewritten: follow-up filing moved out of AC3 builder scope. New After Completion (Strategist Notes) task #6 added: strategist files the follow-up post-merge with full founder-consent receipt section drafted from journal evidence. |
| 9 | MED | Cursor R2 #5 | AC1 `cursor_phase2` "fires" semantic ambiguous — attempted vs returned non-null `composer_resolved`. 037's AC6 R1 patch chose "non-null only"; AC1 should mirror. | AC1 contract #3 rewritten as `phase: 'cursor_legacy'` field on the descriptor; set ONLY when Phase 2 returned non-null `composer_resolved`. Phase 2 attempted-but-empty → `phase` absent. Mirrors 037 AC6's R1 invariant. New attempted-but-empty test added to AC1 #7. |
| 10 | LOW | Codex R2 #5 | AC5 grep scope `src/mcp/tools/*.ts` misses the new `src/mcp/internal/cluster-engine.ts`. | AC5 contract #4: scope extended to `src/mcp/**/*.ts` (excluding helper file by name). |
| 11 | LOW | Codex R2 #6 | Stale pre-R1 claims still in spec at lines 10 ("ENTIRE FILE deleted"), 53 ("gate is well-open"), 61 (false `source_prefix` equivalence). | Sweep pass: spec_refs line 10 corrected; Context section's Cursor round-4 history annotated with R1+R2 corrections; "Combined spec shape" rewritten. |
| 12 | LOW | Cursor R2 #6 | AC0 doesn't address `next_cursor` (timestamp+id) interaction with new `source` exact filter. | AC0 contract #1: one sentence + one test (AC0 #8 (j)) — cursor is source-agnostic, pagination unchanged. |
| 13 | LOW | Cursor R2 #7 | AC0 isError message hardcoded the whitelist enumeration; would drift if whitelist grows. | AC0 contract #4: dynamic interpolation via `Array.from(METADATA_MATCH_KEY_WHITELIST).join(', ')`. |
| 14 | LOW | Cursor R2 #8 | AC5 grep uses literal string match — variants (`"fs"`, no space, multi-element) slip past, defeating the structural-impossibility claim. | AC5 contract #4: regex pattern `/\bexclude_metadata_surface\s*:\s*\[/`. |

**Convergence quality on R2:** the two **HIGH** findings (Codex #1 + #2) were Codex-only; Cursor's R2 reviewer caught 5 different MED findings on AC0/AC1/AC2/AC3 + 3 LOW polish issues. **Zero convergent findings on the load-bearing R2 corrections** — Codex caught both HIGHs (the 031 gate reinterpretation + the cross-repo leak in composition), and Cursor caught the orthogonal slice (spec-clarity disambiguation, role-split correction, semantic precision). The cross-tool review pattern delivered the same division-of-labor as on 037: Codex tends to catch implementability + calendar/founder-consent issues; Cursor tends to catch coherence + role/scope issues.

**Decay curve:**

| Round | Findings | Convergent | HIGH | MED | LOW | Verdict |
|---|---|---|---|---|---|---|
| 038 R1 | 10 | 2 | 0 | 5 | 5 | both pushback |
| 038 R2 (this) | 14 | 0 | 2 (Codex) | 8 | 4 | both pushback (narrow) |

R1 caught the foundational additions (AC0 expansion of `search_memories`; AC1 input-axis collapse). R2 caught the load-bearing architectural-tightening (`recent_work_context` registration MUST stay; `echo_resolve_mru` must return descriptors not bare sources). Together: ≥24 findings dispositioned. The architecture is now post-correction-stable; R3 should be implementation-disambiguation only.

**Status:** spec is post-R1+R2-patched. Route to R3 review (Codex + Cursor) before claim per the 037 decay pattern.

## R3 — 2026-05-11 ~21:00 PDT (Codex + Cursor) — patched 2026-05-11 ~21:10 PDT by strategist

Cross-tool R3 review against R2-patched 038 (commit `39711dc`). Both reviewers ran independent reads. **Cursor verdict: "PROCEED after 5 inline patches; spec is claimable after R3."** Codex verdict: narrow pushback — 2 HIGH-severity items that need patching first (registration/shim shape + git two-path OR), then PROCEED.

**Sources:**
- Codex R3: rollout `019e1955` asst #31 (6 findings — 2 HIGH + 2 MED + 2 LOW)
- Cursor R3: composer `459e6f6d` bubble `54b089ae` (5 findings — 2 MED + 3 LOW + 0 HIGH; explicit claimable verdict)

**Findings dispositioned:**

| # | Severity | Source | Finding | Spec patch |
|---|---|---|---|---|
| 1 | **HIGH** | Codex R3 #1 | R2's "≤10-line shim" claim conflicted with keeping MCP registration unchanged. `server.ts:10` imports `registerRecentWorkContext` (the registration handler + Zod schemas + description, not just the function). A 10-line shim that only re-exports `getRecentWorkContext` would break the registration. | AC3 contract #5 rewritten: shim is ~15-25 lines (not strictly ≤10); re-exports `registerRecentWorkContext` + Zod schemas + description + isError envelope handler ALONGSIDE `getRecentWorkContext`. Cluster engine internals (~340 lines) move to internal/; MCP-tool wrapper stays in the shim file. 2026-05-17 follow-up deletes the wrapper + server.ts registration call. |
| 2 | **HIGH** | Codex R3 #2 | Killing `tail_session` silently lost 037 AC6 Note 2's git two-path OR (legacy git atoms with `source='git:<repo>'` but no `metadata.repo_root`). `echo_resolve_mru`'s contract #4 only applied `metadata_match: {repo_root}` when `repo_path` is set. | AC1 contract #4a NEW: port 037's git two-path OR into `echo_resolve_mru`. For git source_app input + `repo_path`, two queries (one by metadata.repo_root, one by exact source) union by atom id. Descriptor encodes which path won; if exact-source-only, descriptor's `filter: {}` (no metadata needed because source path encodes the repo). New 2 tests added to AC1 #7 (git two-path OR test + null test). |
| 3 | MED | Codex R3 #3 | Descriptor's `filter.metadata_match` is invalid for `wait_for_new_turns` (AC0 deliberately scopes metadata_match to search_memories only). The "Live watch" composition example in AC1 #6 was wrong. | AC1 contract #2: descriptor is **search_memories-ready only**. AC1 contract #6 rewrites the Live watch example to use only `desc.source` + `desc.filter.repo_path` (NOT `desc.filter.metadata_match`). Legacy Cursor atoms via wait are explicitly out of scope (wait is for NEW turns, legacy = already-captured). |
| 4 | MED | Codex R3 #4 | Phase-2-attempted-but-empty output was contradictory: AC1 said no eligible atoms → `null`, but then said `phase` absent "on the descriptor." There's no descriptor in the null case. | AC1 contract #3 + #7: `phase` field never coexists with a null slot. Null slot ⟺ no descriptor at all. Test rewritten to assert `r.sources['cursor'] === null` (not `descriptor.phase absent`). |
| 5 | MED | Cursor R3 #1 | Goal table had 7 rows but text said "8 tools after 038" — `recent_work_context` was missing from the post-038 view (R2 patch added the prose claim but didn't update the table). | Goal table updated: 8 rows total (added `recent_work_context` row marked "unchanged in 038"); total-row note added under the table. |
| 6 | MED | Cursor R3 #2 | AC3 had a function-call-parity test for the shim but no MCP-tool-registration handler integration test — would not catch a `server.ts` import-path break. The registered-handler path is the load-bearing surface for the 031 gate. | AC3 contract #8 (b) NEW: integration test that invokes the registered handler through `server.test` infrastructure; asserts `tools/list` advertises `recent_work_context` and the handler still returns valid `RecentWorkContextResponse`. |
| 7 | LOW | Codex R3 #5 | Workflow examples at Goal section lines 85-86 still used `source_app: ...` + `source_prefix: <resolved>` shapes (pre-R1+R2 syntax). | Goal section "Composable workflows" rewritten to use the post-R2 descriptor shape + post-R3 exact-source shapes (`source: X` not `source_prefix: X`). |
| 8 | LOW | Both (Codex R3 #6 + Cursor R3 #3) | Stale pre-R2 claims survived in non-AC sections: spec_refs `server.ts` line (said "recent_work_context registration removed"), spec_refs `037` line (said "ready/" not "complete/"), Implementation Notes commit shape (said "REMOVE recent_work_context registration"). | All three stale claims swept: spec_refs corrected (registration STAYS; 037 in complete/); Implementation Notes commit shape says "registration STAYS per R2+R3 Codex HIGH". |
| 9 | LOW | Cursor R3 #4 | AC1's `sources ≤ 8` cap was unjustified (survived from R1). | AC1 contract #1: justification added — cap mirrors `wait_for_new_turns.ts:~108` `resolveSources` exactly so the two retrieval primitives compose with identical max-source semantics in both halves. |
| 10 | LOW | Cursor R3 #5 | AC1 enumerated 15 cases but header said "10 unit tests" (drift survived from R1). | AC1 contract #7: corrected to "at least 15 unit tests" with explicit enumeration covering each new R3-added test (git two-path OR, registered-handler integration, etc.). |

**Convergence quality on R3:** 1 convergent finding (#8, stale-claims sweep) — both reviewers independently noted the R2 sweep was incomplete. 9 unique findings split evenly between the two reviewers (5 Codex + 4 Cursor + 1 convergent). Codex caught the 2 load-bearing HIGH-severity architectural-detail items (shim re-exports, git two-path OR); Cursor caught the spec-coherence + test-coverage gaps. Same division-of-labor as R1 + R2.

**Decay curve (full 3 rounds):**

| Round | Findings | Convergent | HIGH | MED | LOW | Verdict |
|---|---|---|---|---|---|---|
| 038 R1 | 10 | 2 | 0 | 5 | 5 | both pushback |
| 038 R2 | 14 | 0 | 2 (Codex) | 8 | 4 | both pushback (narrow) |
| 038 R3 | 10 | 1 | 2 (Codex) | 4 | 4 | Codex narrow pushback; **Cursor: claimable** |

**Total findings dispositioned across all three review cycles: 34.** Both reviewers' final verdicts converge on "claimable after R3 patches" — Cursor explicit, Codex implicit (no HIGH issues survive R3's patch round).

**Process observation worth recording** (Cursor R3 commentary, worth folding into `docs/AGENT_INSTRUCTIONS.md` after one more confirming case): cross-tool review cycles for substantive structural reform (037, 038) consistently need 3 rounds — R1 catches load-bearing drift, R2 catches second-order implications, R3 cleans sweep incompleteness. Narrow features (032, 033, 035) settle in 1-2 rounds. Two data points so far; pattern not yet load-bearing for the operating model.

**Status:** spec is post-R1+R2+R3-patched. **Both reviewers' R3 verdicts: claimable.** Builder may claim.
