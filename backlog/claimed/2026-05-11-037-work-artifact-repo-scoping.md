---
id: 2026-05-11-037-work-artifact-repo-scoping
title: Work-artifact (repo) scoping end-to-end — make `repo_path` a first-class filter across capture + storage + 4 retrieval tools (RC1)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-11
spec_refs:
  - src/capture/extractors/cursor.ts              # extractCursorTurns ~line 1130-1175 metadata-write block; Cursor today writes composer_id/session_id/workspace_id (conditional) but NOT repo_root — capture-side parity gap
  - src/capture/extractors/claude-code.ts         # line 555 — already writes metadata['repo_root'] = turn.repo_root (reference shape)
  - src/capture/extractors/codex.ts               # line 786 — already writes metadata['repo_root'] = turn.cwd (reference shape)
  - src/mcp/cursor-workspace-resolver.ts          # 035's composer↔workspace registry resolver — runs `repoPath → composer` direction. AC1 needs the INVERSE direction (`workspace_id → repo_root`); add new exported `resolveRepoRootForWorkspaceId` helper here reusing the existing workspace.json + fileURLToPath internals. Also export `normaliseRepoPath` for the retrieval tools' AC6 path-normalization (R2 + R3 corrections).
  - src/storage/interface.ts                      # line 56 — METADATA_MATCH_KEY_WHITELIST today = {workspace_id, composer_id, session_id}; add repo_root
  - src/mcp/tools/search-memories.ts              # SearchMemoriesParams line 86 — add repo_path?; today no work-artifact filter exists
  - src/mcp/tools/find-clusters.ts                # delegates to recent-work-context; add repo_path? to both surfaces
  - src/mcp/tools/recent-work-context.ts          # storage.query call site line ~379 — wire metadata_match through
  - src/mcp/tools/wait-for-new-turns.ts           # pollOnce line ~128 filterCommon — add repo_path? on input + thread to filter
  - src/mcp/tools/tail-session.ts                 # line 251 — drop the `repo_path is currently honored only for source_app=cursor` warn-ignore; generalize repo_path across source_apps
  - backlog/complete/2026-05-10-035-tail-session-repo-scoping.md  # Today's Cursor-only repo_path; this item generalizes it to claude_code/codex/git AND moves Cursor onto first-class repo_root filtering (with composer↔workspace registry as fallback for atoms without repo_root)
  - raw/internal/dogfooding/mcp-interactions-journal.md  # 2026-05-11 14:46 PDT + 14:56 PDT — Cursor→Claude repo-gating miss; 15:04 PDT — Codex validation; 15:26 PDT — Cursor validation (3-way concurrence). Full root-cause investigation
blocked_by: []
suggested_builder: any  # Single coherent change across capture + storage + 4 retrieval tools — any builder agent; Cursor extractor work is the most domain-specific piece but the 035 pattern is already proven on the Cursor side

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-11T23:15:00Z"
branch: "agent/work-artifact-repo-scoping"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Context

Today's strategist conversation (2026-05-11, Claude Code session `95d30e5e-7154-476d-9e28-faaecbfce1cd`) ran a 3-way cross-tool root-cause investigation on 7 distinct retrieval-side issues encountered live across CC + Codex + Cursor. The full synthesis collapses 6 of 7 issues to **2 root causes** plus 1 isolated bug. This item closes the dominant root cause:

**RC1 — Work-artifact (repo) scoping is missing from the retrieval substrate, despite capture writing it for 2 of 3 client apps.**

| Layer | Claude Code | Codex | Cursor |
|---|---|---|---|
| Writes `metadata.repo_root` | ✅ `claude-code.ts:555` | ✅ `codex.ts:786` (`= turn.cwd`) | ❌ `cursor.ts:~1136` writes composer/session/bubble + conditional `workspace_id`, NO `repo_root` |
| Atom→repo lookup path | direct via metadata | direct via metadata | only via `workspace_id` → registry → repo (today's 035 path, falls through on fresh composers) |

| Retrieval tool | Has `repo_path` parameter today? |
|---|---|
| `tail_session` | 🟡 cursor-only (`tail-session.ts:251` explicitly warn-ignores for other apps) |
| `search_memories` | ❌ no work-artifact parameter exists (`search-memories.ts:86`) |
| `find_clusters` / `recent_work_context` | ❌ |
| `wait_for_new_turns` | ❌ |

| Storage seam | `METADATA_MATCH_KEY_WHITELIST` today |
|---|---|
| `storage/interface.ts:56` | `{workspace_id, composer_id, session_id}` — `repo_root` is **not** allowed |

**Empirical failure mode bitten this session (multiple times across CC, Codex, Cursor):**

- Cursor in Project_echo: `tail_session(source_app='claude_code', count=10)` → resolved to ISR demo Claude Code session (`bdb0905b-...` in `/Users/zhenye/Desktop/Projects/isr-demo-mohsen`), not Project_echo. Cursor logged this as a "❌ wrong" entry in the dogfooding journal at 14:46 PDT.
- CC in Project_echo: `tail_session(source_app='codex')` (no `repo_path`) → resolved to `019e18f5-...` ISR demo session. Same class.
- All 3 tools (CC, Codex, Cursor) independently re-derived this root cause in different starting points; consensus on the diagnosis is documented at journal entries 14:56 PDT (Codex), 15:04 PDT (CC), 15:26 PDT (Cursor).

**Why this item ships RC1 end-to-end (capture + storage + 4 retrieval tools) as one coherent merge:** the capture-side Cursor gap and the retrieval-side `repo_path` parameter additions are **not independently shippable**.

- Shipping retrieval-side `repo_path` without the Cursor capture-side write means Cursor atoms have no `repo_root` to filter on — repo-scoping still silently misses Cursor traffic, just as it does today.
- Shipping Cursor capture-side `repo_root` without retrieval-side parameter exposure is dead code — no tool reads the new field.

Splitting would create a fake item dependency that the founder + 3-way cross-tool brainstorm explicitly rejected (see journal 15:30 PDT). Both layers ship together.

# Goal

After this item ships, **any retrieval call from a known repo can scope its result set to that repo by passing `repo_path`** across the four retrieval tools, and the resolver / storage paths are uniform across all four source_apps (cursor, claude_code, codex, git). The 035 Cursor freshness gap is closed because the Cursor extractor writes `repo_root` at extraction time, eliminating the workspace_id → registry round-trip at query time.

**Demo bar:** founder opens Cursor in Project_echo, fires `mcp__echo__tail_session(source_app='claude_code', repo_path='/Users/zhenye/Desktop/Project_echo')` from a fresh Cursor agent-mode turn; result is a Claude Code session for **Project_echo** (not ISR), without depending on which project's Claude session is the global MRU. Repeat with `source_app='codex'` and `source_app='cursor'` — all three return Project_echo content. Same demo with `repo_path` pointing at `/Users/zhenye/Desktop/Projects/isr-demo-mohsen` returns ISR content. No bleed-through between projects.

# In Scope (Acceptance Criteria)

### AC1 — Cursor extractor writes `metadata.repo_root`

**Surface:** `src/capture/extractors/cursor.ts` `processCandidate` call site (the metadata-build block currently spanning roughly lines 1130-1175; anchor on the comment containing `composer_id: turn.composer_id`). Also: a NEW helper export in `src/mcp/cursor-workspace-resolver.ts`.

**R1 correction (Codex + Cursor concurrence):** `src/mcp/cursor-workspace-resolver.ts:299` exports `resolveCursorComposerForRepoPath` only — i.e., the resolver runs `repo_path → workspace → composer`. AC1 needs the **inverse direction**: `composer_id` or `workspace_id` → `repo_root`. That helper does NOT exist today and must be added.

**Contract:**

1. **Add a new exported helper** in `src/mcp/cursor-workspace-resolver.ts` — suggested name `resolveRepoRootForWorkspaceId(workspace_id: string, workspaceStorageDir?: string): string | null`. It reuses the existing `workspace.json` discovery + `fileURLToPath` + `normaliseRepoPath` chain (lines 26-32, internal helpers in the same file), but takes a `workspace_id` and returns the matched `folder` URI as an absolute path. Returns `null` when no workspace.json folder URI exists for the given workspace_id.
2. For every captured Cursor turn, the extractor attempts repo attribution in **two stages**:
   - **Stage 1 (registry path):** if `composerToWorkspace.get(composer_id)` returns a `workspace_id`, call the new `resolveRepoRootForWorkspaceId(workspace_id)` helper. On success, the resolved absolute path is the `repo_root`.
   - **Stage 2 (file-walk fallback):** if Stage 1 returns null AND `turn.context.referencedFiles` (or the input to `flattenContextFiles`) has at least one absolute path, walk upward from each file looking for the nearest `.git` ancestor directory. If all files share a single common `.git` ancestor → use it as `repo_root`. Multiple distinct candidates → leave unset (ambiguous). Zero files → leave unset.
3. When EITHER stage resolves, write `metadata['repo_root'] = <resolved absolute path>`. Mirror Claude Code's contract: absolute filesystem path, no trailing slash, no `file://` prefix.
4. **Cache discipline (R3 correction — Codex + Cursor R3 finding #1, supersedes R2 wording).** Cache POSITIVE results only in a module-level `Map<composer_id, string>`. **Never cache null under any circumstance.** Stage 1 (registry) is checked first when binding exists; success short-circuits and overwrites cache; failure falls through to Stage 2. Lookup order is:
   - **a.** Check `composerToWorkspace.get(composer_id)`. If a `workspace_id` is present → run Stage 1 (`resolveRepoRootForWorkspaceId`).
     - **a.i.** Stage 1 returns a non-null path → that path is the authoritative `repo_root` for this turn. Overwrite the cache entry with this value. Return. (Stage 2 NOT run on this tick.)
     - **a.ii.** Stage 1 returns null (binding present but folder URI malformed/missing) → do NOT cache anything; do NOT return; fall through to Stage 2.
   - **b.** No workspace binding (`composerToWorkspace.get(composer_id) === undefined`) → check the cache. Cache hit → return cached path. Cache miss → fall through to Stage 2.
   - **c.** Stage 2 (file-walk). On success → populate cache with the resolved path; return. On failure → do NOT cache; `repo_root` is omitted from the atom's metadata for this turn (re-attempted next tick).
   - This preserves all three invariants accumulated across R1+R2+R3: (i) negative outcomes are always re-attemptable (R1 finding 3); (ii) registry path takes priority over a positive file-walk cache hit when binding exists (R2 finding 1); (iii) a Stage 1 failure does NOT poison the cache or block Stage 2 fallback (R3 finding 1). The unambiguous rule: **cache reads/writes only ever touch non-null path values; null is a "try again next tick" sentinel, never persisted.**
5. When BOTH stages fail, `repo_root` is omitted (not written as empty string or `null`). The atom is still captured; only the repo annotation is missing. Downstream filters that pass `repo_path` simply won't match this atom — same semantics as a Claude Code atom that genuinely lacks `repo_root`. The user-visible failure (cross-repo bleed-through) is closed for the common case (registry-bound + file-attached agent-mode turns); truly-zero-file fresh turns degrade gracefully and re-attempt on every tick.
6. The `workspace_id` write (today's conditional `if (ws !== undefined) metadata['workspace_id'] = ws`) stays as-is. Both fields can coexist; retrieval prefers `repo_root` (see AC6) and falls back to `workspace_id`/`composer_id` for atoms captured before this item shipped.
7. No new file system permissions beyond what the .git walk requires (read-only `stat` on a small ancestor chain) and the new `resolveRepoRootForWorkspaceId` requires (read on `workspaceStorage/<hash>/workspace.json`). Both are already permitted at extraction time for the existing 035 resolver.

**Tests:**

- Fixture: a composer bound to a workspace whose folder URI decodes to `/tmp/echo-test-repo` → emit Cursor turn → assert atom metadata contains `repo_root: '/tmp/echo-test-repo'`.
- Fixture: a **fresh composer with no workspace binding** but with `files_referenced` pointing at `/tmp/echo-test-repo/src/foo.ts` (and a real `.git` dir at `/tmp/echo-test-repo/.git` set up by the test) → assert atom metadata contains `repo_root: '/tmp/echo-test-repo'` via the file-walk fallback. The cache is asserted: a second turn from the same fresh composer does NOT re-walk (mock the resolver count).
- Fixture: a fresh composer with `files_referenced` pointing at **two distinct repos** (`/tmp/repoA/x.ts` + `/tmp/repoB/y.ts`, both with `.git`) → assert atom metadata **omits `repo_root` key** (ambiguous → refuse to guess).
- Fixture: a fresh composer with `files_referenced=[]` → assert atom metadata omits `repo_root`.
- Fixture: a composer where workspace binding lands AFTER initial file-walk attribution → assert the cache is invalidated and the subsequent turn uses the registry path (registry takes priority once it returns non-undefined).
- Fixture: a composer with workspace binding present but `folder` URI absent or malformed AND no `files_referenced` → emit Cursor turn → assert atom metadata omits `repo_root` AND logs `warn('cursor_repo_root_resolution_failed', { composer_id, reason })` at most once per `composer_id` (module-level Set dedup, same shape as `not_in_composer_headers` from `9d00369`).
- Regression: the existing `workspace_id` write contract is unchanged on all six fixtures.

### AC2 — `repo_root` added to `METADATA_MATCH_KEY_WHITELIST`

**Surface:** `src/storage/interface.ts:56`.

**Contract:**

1. Add the literal string `'repo_root'` to `METADATA_MATCH_KEY_WHITELIST`. Final shape: `Set(['workspace_id', 'composer_id', 'session_id', 'repo_root'])`.
2. Both storage adapters (`src/storage/sqlite.ts` + `src/storage/memory.ts`) already honor `metadata_match` for any whitelisted key (per 035's AC3). No adapter code change should be necessary — verify by inspection.
3. Test: `storage.query({metadata_match: {repo_root: '/tmp/x'}})` against a memory storage with one atom whose metadata is `{repo_root: '/tmp/x'}` and another with `{repo_root: '/tmp/y'}` returns only the first. SQLite adapter mirror test must also pass.
4. Test: passing a non-whitelisted key (e.g. `metadata_match: {arbitrary_field: 'X'}`) still throws at the storage seam per 035's defense-in-depth contract.

### AC3 — `search_memories` accepts `repo_path` parameter

**Surface:** `src/mcp/tools/search-memories.ts` — `SearchMemoriesParams` interface + Zod input schema + handler body.

**Contract:**

1. Add `repo_path?: string` to `SearchMemoriesParams`. Zod schema: `z.string().optional()`.
2. Validation: when present, must be an absolute path (`node:path.isAbsolute`). Reject with `tool error` (isError on the MCP envelope) if not. Mirror tail_session's existing pattern at `tail-session.ts:~207`.
3. **Normalize `repo_path` via `normaliseRepoPath` (exported helper)** before forwarding to storage (R2 correction — Codex finding #3).
4. Forward `normalize(repo_path)` to `storage.query` as `metadata_match: {repo_root: normalize(repo_path)}`. When combined with existing filters (source_prefix, since, until), it joins via AND.
5. `query_echo` block surfaces `repo_path` so callers can verify which filter was applied: add `repo_path: string | null` to the echo. The echoed value is the normalized form (not the raw input) so callers see what actually filtered.
6. Description string: extend `SEARCH_MEMORIES_DESCRIPTION` to mention `repo_path` as a new filter axis. **Document the git scope-restriction** (R2 correction — Cursor R2 finding #3): for `source_app='git'`, `repo_path` matches `metadata.repo_root` only; legacy git atoms without that metadata are reachable via the existing `source_prefix='git:<path>'` parameter. (The tail_session two-path OR is not replicated here.)
7. Test: 6 unit tests (no `repo_path` echoes baseline; with `repo_path` filters correctly; combined with `source_app`; combined with `since/until`; rejects non-absolute path with isError; **trailing-slash normalization test**).

### AC4 — `find_clusters` / `recent_work_context` accepts `repo_path` parameter

**Surface:** both `src/mcp/tools/find-clusters.ts` (the V1.6 entry point) and `src/mcp/tools/recent-work-context.ts` (the V1.5 deprecated tool that find_clusters delegates to today, line 379 region).

**Contract:**

1. Add `repo_path?: string` to both tools' params and Zod input schemas.
2. Same validation gate as AC3 (absolute path or isError) + `normaliseRepoPath` normalization (R2 correction — Codex finding #3).
3. Forward `normalize(repo_path)` to `storage.query({metadata_match: {repo_root: normalize(repo_path)}, ...})` at the line-379 query site in `recent-work-context.ts`. The `find_clusters.ts` wrapper passes the parameter through unchanged.
4. **Echo `repo_path` in BOTH response envelopes** (R2 correction — Cursor R2 finding #4). `recent_work_context`'s `query_echo` already exists; surface `repo_path` there. `find_clusters` has its own `query` envelope (`FindClustersResult.query`) — add `repo_path: string | null` there too. Both echoed values are the normalized form.
5. The no-args auto-expand path (`recent-work-context.ts` 4h→24h fallback) carries `repo_path` through both passes. The single-source-recent demotion logic (item 032) is unaffected — `repo_path` filters the candidate set; the rank order is the same as today within that filtered set.
6. **Git scope-restriction (R3 correction — Codex R3 finding #2 supersedes R2):** `find_clusters` and `recent_work_context` do NOT have a `source_app` parameter — they're cross-source discovery surfaces. So "git scope-restriction" is expressed differently: `repo_path` matches `metadata.repo_root` for ALL atoms in the candidate set (including git-source atoms). Legacy git atoms captured before AC1 that lack `metadata.repo_root` are simply not in the candidate set when `repo_path` is passed. Callers needing those legacy git atoms can omit `repo_path` and post-filter client-side, OR fetch via `tail_session(source_app='git', repo_path=...)` which has the two-path OR fallback (per AC6 Note 2). Document this scope in tool description.
7. Test: 5 unit tests (find_clusters: passes through + echoes repo_path; recent_work_context: filters correctly; auto-expand carries through; single-source-recent demotion still fires within repo-filtered set; trailing-slash normalization).

### AC5 — `wait_for_new_turns` accepts `repo_path` parameter

**Surface:** `src/mcp/tools/wait-for-new-turns.ts` — `WaitForNewTurnsParams`, Zod input, `pollOnce` function (line ~128 `filterCommon`).

**Contract:**

1. Add `repo_path?: string` to params and input schema.
2. Validation gate same as AC3 (absolute path) + `normaliseRepoPath` normalization.
3. Forward `normalize(repo_path)` to `pollOnce`'s `filterCommon`: `metadata_match: {repo_root: normalize(repo_path)}` joins the existing `{since, limit, exclude_metadata_surface}` AND chain. Each per-source storage.query inherits the filter.
4. **Git scope-restriction (R3 correction — Codex R3 finding #2 supersedes R2):** `wait_for_new_turns` uses `sources: string[]` (not `source_app`). When `sources` contains `'git'` (or a `git:` prefix entry) AND `repo_path` is set: `repo_path` matches `metadata.repo_root` only for git rows; legacy git atoms without that metadata won't wake the call from `repo_path` alone (those atoms surface via the existing `source` filter without `repo_path`). Document in tool description.
5. Test: 4 unit tests (no repo_path = today's behavior; with repo_path filters per-source results; rejects non-absolute; trailing-slash normalization).

### AC6 — `tail_session` `repo_path` generalized off Cursor-only branch

**Surface:** `src/mcp/tools/tail-session.ts` — the `if (source_app === 'cursor' && repo_path !== undefined)` branch around line 222 + the warn-ignore at line 251.

**Contract:**

1. Drop the warn-ignore at line 251 (`tail_session: repo_path is currently honored only for source_app=cursor; ignored for ${source_app}`).
2. **`repo_path` normalization (R2 correction — Codex finding #3).** Before any `metadata_match` issuance, all four retrieval tools MUST normalize the incoming `repo_path` via the same helper `normaliseRepoPath` already defined at `cursor-workspace-resolver.ts:26`. Export that helper if not already exported. Captured `metadata.repo_root` is stored with no trailing slash (per AC1 contract item #3); without normalization, `/Users/zhenye/Desktop/Project_echo/` silently mismatches the stored `/Users/zhenye/Desktop/Project_echo`. The normalization is structural (string-level only — no symlink resolution, no canonicalization); this preserves the path-equality semantic and stays within Out-of-Scope rule #3.
3. For `source_app === 'claude_code' | 'codex'` + `repo_path`: thread `metadata_match: {repo_root: normalize(repo_path)}` through to the storage.query inside `resolveNewestSourceForApp` AND inside `tailExactSource`. The MRU resolver now picks the newest source for that app **within the specified repo**, not globally. (Git removed from this list — see Note 2.)
4. **For `source_app === 'cursor'` + `repo_path`: deterministic two-phase fallback (R2 correction — Codex finding #2 supersedes R1).** The repo_root metadata path is the PRIMARY recovery; the composer↔workspace resolver becomes a LEGACY fallback. The phase trigger is deterministic and observable from storage alone (no "could this atom exist" guessing).
   - **Phase 1 (primary):** issue the tail query with `metadata_match: {repo_root: normalize(repo_path)}` against the Cursor source prefix. This recovers all post-AC1 atoms (including fresh-composer atoms) directly. The composer↔workspace resolver is NOT consulted on this path.
   - **Phase 2 (legacy fallback):** if and only if Phase 1 returns 0 atoms — call `resolveCursorComposerForRepoPath(normalize(repo_path))` per 035, then issue the tail query with `metadata_match: {composer_id: <resolved>}`. The `composer_resolved` field surfaces only when Phase 2 fires (so the caller can see when legacy fallback was used). The "no fresh post-AC1 atoms could exist" condition from R1 is REMOVED — it was unimplementable at the tool layer.
   - **Critical: predicates are NEVER ANDed.** Phase 1 uses ONLY `repo_root`; Phase 2 uses ONLY `composer_id`.
5. **Note 2 (git source) — R2 correction (Codex finding #4 + Cursor R2 finding #2).** Git is removed from item #3's simple metadata_match path and lives entirely in this Note. For `source_app === 'git'` + `repo_path`: recovery is **two-path OR**, not AND. A row matches if EITHER `metadata.repo_root === normalize(repo_path)` OR the source-path encoding matches `source: 'git:${normalize(repo_path)}'`. The OR is implemented by issuing two storage queries and UNIONing the result set at the tool layer (cheaper than adding OR to `QueryFilter`); dedup by atom `id`. Tests assert both paths recover correctly and no double-counting on atoms satisfying both predicates.
6. **Note 3 (git scope across other tools) — R3 correction (Codex R3 finding #2 supersedes R2; tool parameter shapes corrected).** The git two-path OR fallback in Note 2 is **`tail_session`-specific** because its MRU resolver depends on it to surface legacy git atoms (which may pre-date AC1 and lack `metadata.repo_root`). The three other tools differ in how they reference git, so the scope-restriction is expressed per their actual parameter shapes:
   - **`search_memories`** (has `source_app`): for `source_app='git'` + `repo_path`, match `metadata.repo_root` only (no two-path OR). See AC3.
   - **`wait_for_new_turns`** (has `sources: string[]`): for `sources` containing `'git'` or a `git:` source path + `repo_path`, match `metadata.repo_root` only on git rows. See AC5.
   - **`find_clusters` / `recent_work_context`** (NO `source_app`, cross-source): `repo_path` matches `metadata.repo_root` for the entire candidate set; git atoms without that metadata are simply not in scope. See AC4.
   Callers needing legacy git atoms by path use `tail_session(source_app='git', repo_path=...)` (which has the two-path OR) or the existing `source_prefix='git:<path>'` parameter on other tools.
7. Input validation: today's `repo_path requires source_app=cursor` reject at line 205 is loosened to allow any source_app. The `repo_path requires source_app` check (must have ONE of `source_app` or `source` set) stays in place. The path normalization step (item #2) runs AFTER `isAbsolute` validation.
8. Test: at least 12 unit tests (R3 correction — Codex R3 finding #3, count corrected): 8 matrix cases — (each of 4 source_app) × {with, without} repo_path on a mixed-repo fixture; PLUS one fresh-Cursor-composer test asserting Phase 1 recovers the atom via `metadata.repo_root` without ever calling `resolveCursorComposerForRepoPath`; PLUS one legacy-Cursor-atom test asserting Phase 2 fires when Phase 1 returns 0 and `composer_resolved` is set; PLUS one trailing-slash test asserting `repo_path` with trailing `/` matches the stored no-trailing-slash `repo_root` (R2 normalization check); PLUS one git two-path OR test asserting both routes return the same atom without duplication.

### AC7 — Dogfooding verification

**Procedure** (post-merge, runs once on the founder's daily-workflow stack; per the 036 pattern, two consecutive runs on different days close the verification):

1. Founder opens Cursor in Project_echo. **Critical: this must be a fresh agent-mode turn on a composer that does NOT yet have a workspace binding** — this is the load-bearing case AC1's Stage 1 fails on and Stage 2 (or post-AC1 Phase 1 query) must cover. (R1 correction, Cursor finding #7.)
2. From the Claude Code session in Project_echo, run all six retrieval calls with `repo_path='/Users/zhenye/Desktop/Project_echo'` (R2 correction — Cursor R2 finding #5, count corrected from "ALL FIVE" to six explicit calls):
   - `tail_session(source_app='claude_code', repo_path=...)` → resolves to a Claude Code session in Project_echo (NOT ISR demo)
   - `tail_session(source_app='codex', repo_path=...)` → resolves to a Codex session in Project_echo
   - `tail_session(source_app='cursor', repo_path=...)` → resolves to the active Cursor composer in Project_echo via Phase 1 (`metadata.repo_root` match). **The `composer_resolved` field MUST be absent** on this call — its presence would indicate legacy Phase 2 fallback fired, which means AC1's repo_root write didn't land for this fresh composer (regression).
   - `search_memories(query='<distinctive token>', repo_path=...)` → returns only Project_echo atoms (assert every returned match's `source` starts with a Project_echo-encoding path OR its `metadata.repo_root === normalize('/Users/zhenye/Desktop/Project_echo')`).
   - **`find_clusters(repo_path=...)` — observability via hydration (R2 correction, Codex finding #5).** Returned clusters' `source_breakdown` carries per-app counts only; it has no `repo_root` field. To verify the repo filter actually scoped the candidate set, hydrate: take each returned cluster's `atom_ids`, call `get_atoms(atom_ids[0..min(N, 50)], format='minimal')`, and assert EVERY hydrated atom's `metadata.repo_root === normalize('/Users/zhenye/Desktop/Project_echo')` (or the atom's `source` matches a Project_echo encoding for git-source atoms). If hydration shows any atom from another repo, the filter failed.
   - **`wait_for_new_turns(sources=['cursor', 'claude_code'], since=<now>, repo_path=...)`** (R1 correction, Codex finding #6) → next captured turn from either app in Project_echo wakes the call; turns from a sibling project do NOT wake it. Assert with two parallel agent-mode turns (one in Project_echo, one in another repo) — only the Project_echo one returns.
3. Repeat with `repo_path='/Users/zhenye/Desktop/Projects/isr-demo-mohsen'` from the same Project_echo terminal — every result set returns ISR demo content. Cross-project bleed-through is zero.
4. Negative case: `tail_session(source_app='claude_code', repo_path='/tmp/nonexistent-repo')` returns `turns: []` cleanly with a `warnings: ['no captured sessions found for source_app=claude_code in repo=...']` advisory (NOT a silent empty response — caller should see the empty-set was intentional).
5. Demo bar AC: ≥ 5 of 6 calls in step 2 return correct repo content (find_clusters hydration check counted as a single call). All 6 must return zero atoms from sibling projects.
6. Log the dogfooding run as a standard journal entry per CLAUDE.md template; both Markdown + HTML twin updated in the same commit.

# Out of Scope (Don't Drift)

1. **Tool boundary atomicity refactor (RC2) is the next item (038).** Do NOT unbundle bodies from `wait_for_new_turns` here; do NOT rename `get_atom` / `get_atoms`; do NOT DRY the `exclude_metadata_surface: ['fs']` hardcoding across 4 sites. Those are 038's scope. This item adds one parameter to four tools — same atomicity / same body-bundling as today.
2. **TZ-naive rejection (RC3) is a separate follow-up.** Do NOT change `iso8601.ts` here. If a TZ-rejection refinement lands in `isoString` during the same touch surface, that's bleed; revert and queue to `_followups.md`.
3. **Cross-repo cluster handling.** When a project has a git remote that two repos share (e.g., main + worktree), `metadata.repo_root` may differ even though atoms describe the same logical work. Treat this as out-of-scope today — `repo_path` is path-equality, not symlink-resolved or worktree-aware. If this surfaces in dogfooding, file a follow-up.
4. **Cursor extractor — do NOT touch the workspace_id write path.** It's load-bearing for atoms captured before AC1 lands (the back-compat path in tail_session's Cursor branch reaches through it). AC1 adds a sibling write; it does not change the existing one.
5. **Do NOT add `repo_path` to `echo_ping`, `get_atom`, or `get_atoms`.** These are not discovery primitives; the parameter has no meaning on them.
6. **Mid-stream invisibility (Issue #3 in the journal).** Out of scope per 3-way cross-tool consensus 2026-05-11 15:30 PDT (CC, Codex, Cursor all endorsed "currently acceptable: extractors emit on completed turns/ticks, not live token streams"). File a separate item if it changes.
7. **Linux / Windows path-resolver shim.** Inherited from 035 Out-of-Scope rule 6. macOS-only paths until a non-macOS contributor needs it.
8. **Backfilling `repo_root` onto already-captured atoms.** Atoms captured before AC1 lands keep their existing metadata. `tail_session` Cursor-branch's fallback to `composer_id`-resolution handles the back-compat. A retroactive `metadata.repo_root` backfill pass is its own item if it ever ships.

# Implementation Notes

- **Suggested commit shape:** 4 commits — (a) AC1 Cursor extractor + tests; (b) AC2 storage whitelist + tests; (c) AC3-AC6 retrieval tools + tests; (d) AC7 dogfooding journal entry + HTML twin. Each commit independently passes `npm test`, lint, typecheck. The reviewer can stage their read incrementally.
- **The 035 resolver is the structural reference; the function direction is INVERTED for this item.** `src/mcp/cursor-workspace-resolver.ts:299` only exports `resolveCursorComposerForRepoPath` — the direction `repoPath → workspace → composer`. AC1 needs the **inverse direction** (`workspace_id → repo_root`), which is NOT exported today. The new helper `resolveRepoRootForWorkspaceId(workspace_id, workspaceStorageDir?)` lives in the same file, reuses the same workspace.json + `fileURLToPath` + `normaliseRepoPath` internals (file lines 26-32 + the `workspaceStorage` discovery used by `findWorkspaceForRepoPath` at line 54). Do not reimplement those helpers; export them or call them directly from the new function. (R1 correction — Codex finding #2 + Cursor finding #2.)
- **Cursor extractor concurrency:** the metadata-build block runs inside the cadence-tick handler; the workspace registry is read into `composerToWorkspace` once per tick. Resolving `repo_root` inside the same map lookup adds no new I/O.
- **AC3-AC5 share a near-identical 6-line change** per tool (params + Zod + validation + storage.query field). If a builder agent prefers a tiny shared helper (`assertAbsolutePath(value, fieldName)`), one file at `src/mcp/util/repo-path.ts` is OK; otherwise inline is also acceptable. Reviewer's call — no preference.
- **Dogfooding cadence:** AC7 deliberately doesn't gate on the second run; the merge ships after one clean run. The second-run-on-a-different-day closes M1-2-A in the broader plan (see "After Completion" #2).

# After Completion (Strategist Notes)

1. **Wiki promotion (post-merge, after dogfooding lands):**
   - Update `wiki/surfaces/mcp-tail-session.md` — `repo_path` is no longer Cursor-only; document the uniform parameter across all source_apps.
   - Update or create `wiki/surfaces/mcp-search-memories.md` (currently absent — `tools/list` is the only authoritative source for `search_memories`'s shape today). Document `repo_path` from the start.
   - Update `wiki/architecture/storage.md` (or `mcp-server.md`) — `METADATA_MATCH_KEY_WHITELIST` now includes `repo_root`; document the rationale (work-artifact scoping as first-class retrieval predicate).
   - Add a new principle page candidate: `wiki/principles/work-artifact-first-class.md` — the principle that surfaces from this work ("retrieval primitives accept work-artifact filters; the substrate exposes what it captured"). Strategist drafts post-merge.
2. **Second dogfooding run on a different day closes M1-2-A** (the broader "search ranking / verdict-turn finding" plan first surfaced 2026-05-10). After 037 ships + the second run, the remaining M1-2 piece (verdict-turn ranking — semantic-aware retrieval) is genuinely small because repo-scoping eliminates the dominant wrong-cluster failure mode.
3. **Item 038 (RC2: MCP toolkit atomicity refactor) becomes the next strategic conversation.** The 3-way root-cause investigation today proposed a 5-6-primitive reform shape (`echo_cluster + echo_query + echo_wait + echo_fetch_summary + echo_fetch_full + echo_ping`). Strategist drafts 038 after 037 lands.
4. **TZ-naive rejection (RC3)** stays in `backlog/_followups.md` as a 30-LOC follow-up. Rolls into 038 if convenient (same retrieval-tool surface); otherwise standalone.
5. **Capture-side parity audit:** AC1 closes the Cursor-side gap. Periodically (~quarterly) confirm any new client app added to ECHO writes `metadata.repo_root` from day one. Add a single-line check to the extractor test fixtures' shared parity suite.

# Cross-tool review checklist (pre-claim)

- [ ] Has the AC1 Cursor extractor change been tested against a fresh composer (no workspace binding)? On such a composer, `repo_root` should be **resolved via Stage 2 file-walk** when `files_referenced` is unambiguous; omitted (not present) only when `files_referenced` is missing or points at multiple distinct .git ancestors. (R3 editorial — Cursor finding nit #2.)
- [ ] Does AC3-AC6's tool description text mention `repo_path` so `tools/list` callers (Codex, Cursor, other MCP clients) discover it without reading source?
- [ ] Does AC7's dogfooding step #4 confirm the empty-result-set advisory message exists (not silent zero)?
- [ ] Does the diff respect Out-of-Scope rule #1 (no atomicity refactor bleed-through)?

# Review history

## R1 — 2026-05-11 15:48 PDT (Codex) + 15:50 PDT (Cursor) — patched 2026-05-11 ~16:00 PDT by strategist

Cross-tool R1 review against the as-shipped spec (commit `9f58263`). Codex and Cursor each ran independent reads and produced findings with no coordination between them; convergence was strong (5 findings overlapped on the same load-bearing flaw).

**Sources:**
- Codex review: `~/.codex/sessions/2026/05/11/rollout-2026-05-11T14-46-28-019e1901-...jsonl` assistant message #23 (the 2393-char Findings block).
- Cursor review: composer `558e2738`, assistant bubble `447d756f-8863-4e53-bcda-a904e4833e97` (~3500 chars).

**Findings dispositioned:**

| # | Severity | Source | Finding | Spec patch |
|---|---|---|---|---|
| 1 | HIGH | Codex + Cursor | AC6 kept composer↔workspace resolver as Cursor's PRIMARY path, contradicting AC1's goal of closing the 035 freshness gap. Fresh composers still fall through. | AC6 rewritten: two-phase fallback with `metadata.repo_root` as Phase 1 (primary, no resolver call), composer resolver as Phase 2 legacy fallback only. `composer_resolved` is surfaced only when Phase 2 fires. |
| 2 | HIGH | Codex + Cursor | AC1 said "reuse the 035 resolver" but the existing `resolveCursorComposerForRepoPath` runs the WRONG direction (`repoPath → composer`). The inverse direction (`workspace_id → repo_root`) does not exist as an exported function. | AC1 + Implementation Notes patched: spec now explicitly calls for a new exported `resolveRepoRootForWorkspaceId(workspace_id, workspaceStorageDir?)` helper, reusing the existing workspace.json discovery + `fileURLToPath` + `normaliseRepoPath` internals. |
| 3 | MEDIUM | Codex + Cursor | AC1's fresh-composer fallback cache used `Map<composer_id, string \| null>`, which freezes a negative outcome — later turns with file context would never re-walk. | AC1 contract item #4 rewritten: cache POSITIVE results only. Negative outcomes remain re-attemptable on every tick. |
| 4 | MEDIUM | Codex | AC6 said `metadata_match: {repo_root, composer_id}` predicates AND together "with no contradiction" — actually ANDing excludes both (a) legacy atoms without `repo_root` AND (b) fresh atoms without resolved `composer_id`. | Subsumed by Finding 1's two-phase rewrite. The spec now explicitly states predicates are NEVER ANDed across phases. |
| 5 | MEDIUM | Cursor | AC6 Note 2 (git source) said source-path encoding + metadata_match are "both must hold" (AND), which would drop old git atoms without `repo_root`. | AC6 Note 2 rewritten: two-path OR (a row matches if EITHER predicate holds), implemented as a two-query UNION at the tool layer. |
| 6 | MEDIUM | Codex | AC7 dogfooding step #2 listed only 4 tools, omitting `wait_for_new_turns` even though AC5 adds `repo_path` there. | AC7 step #2 expanded from 5 calls to 6, including a `wait_for_new_turns(sources=['cursor','claude_code'], repo_path=...)` assertion with a parallel-agent-mode setup. Demo bar updated from "≥4 of 5" to "≥5 of 6". |
| 7 | LOW | Cursor | AC7 should explicitly require the fresh-Cursor-composer case in the demo (the load-bearing closure of the 035 freshness gap). | AC7 step #1 strengthened: explicitly states the test must use a fresh composer without workspace binding. Step #2's Cursor tail check adds: `composer_resolved` MUST be absent (its presence would mean Phase 2 fired, indicating AC1's repo_root write didn't land — regression). |

**No further reviewer findings.** Both reviewers' verdicts: pushback until findings patched. With this R1 patch applied, the spec is claimable.

**Cross-tool concurrence on R1**: Findings 1+2 (the two HIGH severity items, which together would have made the spec ship without actually closing its load-bearing goal) were independently raised by BOTH Codex and Cursor with the same diagnosis and the same fix shape (`repo_root` first, composer resolver second). Strong validation that the R1 patch's structural rewrite of AC6 is the right shape.

## R2 — 2026-05-11 ~15:55 PDT (Codex) + ~15:58 PDT (Cursor) — patched 2026-05-11 ~16:05 PDT by strategist

Cross-tool R2 review against the R1-patched spec (commit `4284c23`, local-only — origin push gated at the time). Codex + Cursor each ran independent reads against the on-disk file tree (their VSCode plugins read locally, so origin-staleness didn't matter). Both verdicts: **narrow pushback — "close, but patch before claim"**.

**Sources:**
- Codex R2: `~/.codex/sessions/2026/05/11/rollout-2026-05-11T14-46-28-019e1901-...jsonl` assistant message #26 (2579 chars, 5 findings).
- Cursor R2: composer `558e2738`, assistant bubble `72fea779-a320-419f-82d8-ad7c382930c1` (5 findings).

**Findings dispositioned:**

| # | Severity | Source | Finding | Spec patch |
|---|---|---|---|---|
| 1 | HIGH (Codex), MED (Cursor) | Codex + Cursor | AC1 cache lookup order ("cache hit → return cached path") contradicts the registry-priority test ("workspace binding lands AFTER initial file-walk → registry takes priority") — with the stated order, Stage 1 never runs after a positive file-walk cache hit. | AC1 item #4 rewritten: lookup order is now `(a) registry binding present → ALWAYS run Stage 1 (cache populated/overwritten with result); (b) no binding → fall through to cache; cache hit short-circuits; cache miss → Stage 2`. Registry priority preserved on every tick. |
| 2 | HIGH | Codex | AC6 Phase 2 fallback condition "Phase 1 returns 0 AND no fresh post-AC1 atoms could exist" is unimplementable — the tool cannot know that from storage. | AC6 Phase 2 trigger simplified: "Phase 1 returns 0 atoms" → always run Phase 2. Deterministic; observable; no guessing about pre/post-AC1 atom population. |
| 3 | MEDIUM | Codex | `repo_path` is matched against `metadata.repo_root` by string equality, but stored `repo_root` is no-trailing-slash. `/path/` would silently miss `/path`. | New AC6 item #2: ALL four retrieval tools normalize `repo_path` via `normaliseRepoPath` (exported from `cursor-workspace-resolver.ts:26`) before any `metadata_match` issuance. AC3-AC5 contracts updated. New trailing-slash test added to AC6's test list. |
| 4 | MEDIUM | Codex + Cursor | AC6 internal conflict: line 161 included `git` in the simple metadata_match path while line 166 said git uses two-path OR. | AC6 item #3 removes git from the simple list (now only `claude_code | codex`); AC6 Note 2 owns the git two-path OR logic entirely. No more conflict. |
| 5 | MEDIUM | Codex | AC7 `find_clusters` verification "`source_breakdown` only references atoms with matching repo_root" is not directly observable — `source_breakdown` is per-app counts, not repo info. | AC7 step 2 `find_clusters` bullet rewritten with a hydration step: after find_clusters returns, call `get_atoms(cluster.atom_ids[0..50], format='minimal')` and assert every returned atom's `metadata.repo_root === normalize(repo_path)` (or the atom's `source` matches for git-source atoms). |
| 6 | MEDIUM | Cursor | Git two-path OR fallback was specified only for `tail_session`; the other 3 tools' git semantics were ambiguous. | New AC6 Note 3: git two-path OR is `tail_session`-specific (the MRU resolver depends on it for back-compat). `search_memories` / `find_clusters` / `wait_for_new_turns` with `source_app='git'` filter by `metadata.repo_root` only; callers needing legacy git atoms by path use the existing `source_prefix='git:<path>'` param. AC3-AC5 descriptions updated. |
| 7 | LOW | Cursor | `find_clusters` has its own `query` envelope (separate from `recent_work_context`'s `query_echo`); AC4 didn't surface `repo_path` there. | AC4 item #4 rewritten: echo `repo_path` in BOTH envelopes (`find_clusters.query` + `recent_work_context.query_echo`). |
| 8 | LOW | Cursor | AC7 step 2 said "ALL FIVE retrieval tools" but listed 6 calls. | Wording corrected to "all six retrieval calls". |

**No further reviewer findings.** Both verdicts after the R1 cycle: "pushback, but narrowly" (Codex) and "close, but still patch before claim" (Cursor). With this R2 patch applied, the spec is claimable.

**Cross-tool concurrence on R2:** 2 of 8 findings (cache contradiction + git AC6 internal conflict) were raised independently by both reviewers. The other 6 were unique to one reviewer; together they cover orthogonal slices (Codex caught implementability + normalization + observability gaps; Cursor caught scope-restriction + envelope echo + count errors). This is the textbook division-of-labor the cross-tool review pattern aims for.

**Total review cycles:** R1 closed the load-bearing architectural flaws (AC6 priority + AC1 resolver direction); R2 closed the implementation-disambiguation + spec-clarity issues that survive a structural fix.

## R3 — 2026-05-11 ~16:05 PDT (Codex) + ~16:07 PDT (Cursor) — patched 2026-05-11 ~16:10 PDT by strategist

Cross-tool R3 review against the R2-patched spec (commit `b42e838`, local-only). Decay pattern continues: R3 surfaced 5 findings (4 small + 1 editorial). Codex still says "narrow pushback"; Cursor says **"proceed after one tiny wording patch — no blocking architecture issues remain."** Convergence on the single substantive residual contradiction in AC1; remaining findings are minor wording or per-tool parameter-shape corrections.

**Sources:**
- Codex R3: `~/.codex/sessions/2026/05/11/rollout-2026-05-11T14-46-28-019e1901-...jsonl` assistant message #28 (3 findings).
- Cursor R3: composer `558e2738`, assistant bubble `5e49bc2c-014d-4a35-9a49-7cbc29e5a659` (1 finding + 2 editorial nits).

**Findings dispositioned:**

| # | Severity | Source | Finding | Spec patch |
|---|---|---|---|---|
| 1 | MED | Codex + Cursor | AC1 cache wording self-contradicts: line 89 says "Stage 2 runs if Stage 1 returns null"; line 92 says "Stage 1 outcome (whether success or fail) is authoritative; cache populated with the result" — would imply caching null on failure, contradicting "Never cache null." | AC1 item #4 rewritten with explicit three-step decision tree (a.i / a.ii / b / c). Unambiguous rule: cache reads/writes ONLY touch non-null path values; null is a "try again next tick" sentinel, never persisted. Stage 1 null falls through to Stage 2 (it does NOT poison the cache or short-circuit fallback). |
| 2 | MED | Codex | AC4 + AC6 Note 3 used `source_app='git'` for `find_clusters` (no `source_app` param) + `wait_for_new_turns` (uses `sources: string[]`). | Each tool's git scope-restriction rewritten per its actual parameter shape: `search_memories` (has `source_app`), `wait_for_new_turns` (`sources` list), `find_clusters` (no source_app — cross-source). AC6 Note 3 now enumerates all three per actual tool signature. |
| 3 | LOW | Codex | AC6 said "8 unit tests" but listed 12 (8 matrix + 4 additions). | AC6 item #8 corrected to "at least 12 unit tests." |
| 4 | LOW/editorial | Cursor | spec_refs frontmatter still said "reuse [035 resolver] to derive repo_root" — body now correctly calls for a NEW helper. | spec_refs line for `cursor-workspace-resolver.ts` rewritten: notes that 035 runs `repoPath → composer`; AC1 needs the inverse; add `resolveRepoRootForWorkspaceId` + export `normaliseRepoPath`. |
| 5 | LOW/editorial | Cursor | Cross-tool checklist said "fresh no-workspace composer should confirm `repo_root` is omitted" — now should be: omitted only when no file refs / ambiguous refs (otherwise Stage 2 resolves). | Checklist line rewritten: `repo_root` resolves via Stage 2 file-walk when `files_referenced` is unambiguous; omitted only when missing or ambiguous. |

**No further reviewer findings.** Cursor's verdict explicitly: "**proceed after one tiny wording patch. No blocking architecture issues remain.**" Codex's verdict: "**narrow pushback before claim**" — but every Codex finding is a wording/parameter-shape correction, not an architectural or load-bearing change.

**Decay curve across R1 → R2 → R3:** 7 → 8 → 5 findings; HIGH-severity findings 2 → 2 → 0; convergent findings 2 → 2 → 1. The architecture has been stable since R1's structural rewrite of AC6 + AC1's resolver-direction fix; R2 + R3 are spec-clarity polish.

**Total findings dispositioned across all three cross-tool review passes:** R1: 7, R2: 8, R3: 5 = **20 findings**. Cross-tool concurrence count: **5 convergent findings** (independent same-finding from both reviewers in the same round) + 15 unique findings (one reviewer caught what the other missed). The cross-tool review pattern delivered roughly equal contribution from Codex and Cursor; neither tool dominated.

**Status:** spec is claimable. Both reviewers agree the architecture is settled; remaining items are pure wording disambiguation (already patched). No fourth review pass warranted.
